import type React from 'react';

// Frame-based tweening. Every value is a pure function of the scene-local time `t`
// (seconds), which is what keeps a film render deterministic frame to frame.
//
// The film choreography was designed on a GSAP timeline; these helpers reproduce the
// eases it used so the timings in scenes/ read the same way: "at 1.2s, over 0.7s".

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const mix = (a: number, b: number, k: number) => a + (b - a) * k;

export const E = {
  linear: (x: number) => x,
  out2: (x: number) => 1 - (1 - x) ** 2,
  out3: (x: number) => 1 - (1 - x) ** 3,
  out4: (x: number) => 1 - (1 - x) ** 4,
  in2: (x: number) => x * x,
  inOut2: (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2),
  inOut3: (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2),
  sine: (x: number) => -(Math.cos(Math.PI * x) - 1) / 2,
  back: (k = 1.7) => (x: number) => 1 + (k + 1) * (x - 1) ** 3 + k * (x - 1) ** 2,
};

/** Progress 0..1 of a tween that starts `at` and lasts `dur`. */
export const p = (t: number, at: number, dur: number, ease: (x: number) => number = E.out3) =>
  dur <= 0 ? (t >= at ? 1 : 0) : ease(clamp01((t - at) / dur));

/** Rises 0->1->0 `times` half-cycles starting at `at`, each `half` seconds long. */
export const pulse = (t: number, at: number, half: number, times: number) => {
  const x = (t - at) / half;
  if (x < 0 || x > times) return 0;
  return Math.sin(Math.PI * (x % 1)) ** 2 * 1;
};

/** Text typed on at `cps` characters per second. */
export const typed = (text: string, t: number, at: number, cps: number) =>
  text.slice(0, Math.max(0, Math.round((t - at) * cps)));
export const typeEnd = (text: string, at: number, cps: number) => at + text.length / cps;

/** Standard entrance: fade + offset. Returns a style object. */
export const enter = (
  t: number, at: number, dur = 0.7,
  from: { x?: number; y?: number; scale?: number; rotate?: number; blur?: number } = { y: 20 },
  ease: (x: number) => number = E.out3,
) => {
  const k = p(t, at, dur, ease);
  const x = (from.x ?? 0) * (1 - k), y = (from.y ?? 0) * (1 - k);
  const s = mix(from.scale ?? 1, 1, k), r = (from.rotate ?? 0) * (1 - k);
  const b = (from.blur ?? 0) * (1 - k);
  return {
    opacity: clamp01((t - at) / Math.max(dur * 0.6, 0.01)),
    transform: `translate(${x}px, ${y}px) scale(${s}) rotate(${r}deg)`,
    filter: b ? `blur(${b}px)` : undefined,
  } as React.CSSProperties;
};

/** Deterministic shuffle, so "random" staggers render identically every time. */
export const order = (n: number, seed = 7) => {
  const a = Array.from({ length: n }, (_, i) => i);
  let s = seed;
  for (let i = n - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** Point on a cubic bezier. */
export const bez = (P: number[][], k: number) => {
  const u = 1 - k;
  return [0, 1].map((d) =>
    u ** 3 * P[0][d] + 3 * u * u * k * P[1][d] + 3 * u * k * k * P[2][d] + k ** 3 * P[3][d]);
};
