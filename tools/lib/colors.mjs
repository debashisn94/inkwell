// Pull a usable brand palette out of an image using ffmpeg, which the pipeline already
// requires. Avoids adding sharp/jimp (native builds, ~40MB) just to read some pixels.
//
// The naive approach -- bucket pixels by RGB, average each bucket, take the most common --
// does not work, and fails in a way that looks plausible. Averaging inside a bucket blends
// an accent with the background it sits on, so a gold logo on dark navy comes back as mud,
// and a bucket spanning two hues can return a colour that appears nowhere in the image.
// Frequency-first selection compounds it: the winner is whatever large muddy transition
// region cleared the saturation floor, never the small vivid mark that IS the brand.
//
// What works: judge pixels individually in HSL, keep only ones vivid enough to be a brand
// colour, cluster those by HUE, and take the median of the winning hue. Hue survives
// anti-aliasing and compression; saturation and lightness do not.
import { execFileSync } from 'node:child_process';

const GRID = 260;  // ~68k samples. Resolution is not a detail here: at 32x32 each
// sample averages a ~37x20 block of a 1200x630 og:image, so thin logo lettering is
// blended into its background BEFORE any of the logic below runs, and the accent is
// already gone. Measured across three real brands, the extracted accent converged on the
// true brand colour only above ~160.

export function samplePixels(file) {
  const buf = execFileSync('ffmpeg', [
    '-v', 'error', '-i', file,
    '-vf', `scale=${GRID}:${GRID}:force_original_aspect_ratio=disable`,
    '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-',
  ], { maxBuffer: 1 << 22 });
  const out = [];
  for (let i = 0; i + 2 < buf.length; i += 3) out.push([buf[i], buf[i + 1], buf[i + 2]]);
  return out;
}

const hex = ([r, g, b]) =>
  '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

export const luma = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

const toHsl = ([r, g, b]) => {
  const R = r / 255, G = g / 255, B = b / 255;
  const mx = Math.max(R, G, B), mn = Math.min(R, G, B), d = mx - mn;
  const l = (mx + mn) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) {
    if (mx === R) h = ((G - B) / d) % 6;
    else if (mx === G) h = (B - R) / d + 2;
    else h = (R - G) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, l };
};

const median = (xs) => { const a = [...xs].sort((x, y) => x - y); return a[a.length >> 1]; };

const fromHsl = (h, s, l) => {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] :
    h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
};

export function paletteFrom(files) {
  const px = [];
  for (const f of files) { try { px.push(...samplePixels(f)); } catch { /* unreadable, skip */ } }
  if (!px.length) return null;

  const hsl = px.map((p) => ({ p, ...toHsl(p) }));

  // ---- accent: cluster the vivid pixels by hue ----
  // Two passes: a strict definition of "vivid", relaxed once if the brand is muted.
  const pickAccent = (minS, minL, maxL) => {
    const cand = hsl.filter((c) => c.s >= minS && c.l >= minL && c.l <= maxL);
    if (cand.length < 4) return null;
    const BIN = 24;                       // 15-degree bins
    const bins = new Map();
    for (const c of cand) {
      const k = Math.floor(c.h / (360 / BIN)) % BIN;
      (bins.get(k) || bins.set(k, []).get(k)).push(c);
    }
    // weight by count AND by how vivid the bin is, so a large dull bin cannot beat the mark
    let best = null, bestScore = -1;
    for (const [, group] of bins) {
      const sMed = median(group.map((c) => c.s));
      const score = Math.sqrt(group.length) * sMed;
      if (score > bestScore) { bestScore = score; best = group; }
    }
    if (!best) return null;
    // Within the winning hue, take the PUREST instances, not the median. Most pixels of a
    // logo are anti-aliased edges blending toward the background, so on a dark site the
    // median lightness of a gold mark is a dark brown that appears nowhere as a brand
    // colour. Chroma peaks where the accent is fully expressed, so rank by chroma and
    // take the median of the top quartile -- vivid like the real mark, still not one
    // noisy pixel.
    const chroma = (c) => (1 - Math.abs(2 * c.l - 1)) * c.s;
    const pure = [...best].sort((a, b) => chroma(b) - chroma(a)).slice(0, Math.max(2, Math.ceil(best.length / 4)));
    return fromHsl(median(pure.map((c) => c.h)), median(pure.map((c) => c.s)), median(pure.map((c) => c.l)));
  };

  const accent = pickAccent(0.45, 0.25, 0.88) || pickAccent(0.25, 0.15, 0.92) ||
                 px.reduce((a, b) => (toHsl(b).s > toHsl(a).s ? b : a));

  // ---- surface: the dominant FLAT colour, which is what a background is ----
  const flat = hsl.filter((c) => c.s < 0.28);
  const darkShare = px.filter((p) => luma(p) < 0.4).length / px.length;
  const dark = darkShare > 0.5;
  const pool = (flat.length > px.length * 0.1 ? flat : hsl).map((c) => c.p);
  const surface = dark
    ? pool.reduce((a, b) => (luma(a) < luma(b) ? a : b))
    : pool.reduce((a, b) => (luma(a) > luma(b) ? a : b));

  // ---- ink: readable against the surface, not merely "the other extreme" ----
  const ink = dark ? [245, 246, 248] : [18, 20, 26];

  return {
    accent: hex(accent),
    ink: hex(ink),
    surface: hex(surface),
    dark,
    swatches: [...new Set(hsl.filter((c) => c.s > 0.3).map((c) => hex(c.p)))].slice(0, 8),
  };
}
