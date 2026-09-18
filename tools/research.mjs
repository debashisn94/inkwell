// Research a product from its URL and write everything an ad needs to brand.json.
//   node tools/research.mjs https://example.com [--out=ad]
//
// Downloads the real imagery the site already publishes, samples a palette from it, and
// captures the positioning the site leads with. No API keys, no headless browser.
import { mkdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, extname } from 'node:path';
import { extractBrand } from './lib/extract.mjs';
import { paletteFrom } from './lib/colors.mjs';

const url = process.argv[2];
const outArg = process.argv.find((a) => a.startsWith('--out='));
if (!url || !/^https?:\/\//.test(url)) {
  console.error('usage: research.mjs <https://product-url> [--out=dir]');
  process.exit(1);
}
const OUT = outArg ? outArg.split('=')[1] : 'ad';
const ASSETS = join(OUT, 'public', 'assets');
mkdirSync(ASSETS, { recursive: true });

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
           '(KHTML, like Gecko) Chrome/125.0 Safari/537.36';

const get = async (u) => {
  const res = await fetch(u, { headers: { 'user-agent': UA, accept: '*/*' }, redirect: 'follow' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res;
};

console.log(`-> fetching ${url}`);
const html = await (await get(url)).text();
const brand = extractBrand(html, url);
console.log(`   ${brand.name} — "${(brand.title || '').slice(0, 64)}"`);

// ---- download imagery, best-first ----
const downloaded = [];
const grab = async (src, label) => {
  if (!src) return null;
  try {
    const res = await get(src);
    const type = res.headers.get('content-type') || '';
    if (!/^image\//.test(type)) return null;
    let ext = extname(new URL(src).pathname).split('?')[0] || '';
    if (!ext) ext = '.' + (type.split('/')[1] || 'png').split(';')[0];
    const file = join(ASSETS, `${label}${ext}`);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    // SVG cannot be sampled by ffmpeg and cannot be measured here; keep it, flag it
    const vector = /svg/i.test(ext);
    // Measure it. An og:image is a 1.91:1 banner; dropping that into a portrait box with
    // object-fit:cover crops the headline off both sides and looks broken rather than
    // cropped. The renderer needs the real aspect ratio to give each asset a box it fits.
    let w = null, h = null;
    if (!vector) {
      try {
        const out = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0',
          '-show_entries', 'stream=width,height', '-of', 'csv=p=0:s=x', file],
          { encoding: 'utf8' }).trim().split('x');
        w = +out[0] || null; h = +out[1] || null;
      } catch { /* unmeasurable */ }
    }
    const rec = { label, src, file, bytes: statSync(file).size, vector, width: w, height: h,
                  ar: w && h ? +(w / h).toFixed(4) : null };
    downloaded.push(rec);
    console.log(`   got ${label}  ${(rec.bytes / 1024).toFixed(0)}KB  ${src.slice(0, 68)}`);
    return rec;
  } catch (e) {
    console.log(`   skip ${label}: ${e.message}`);
    return null;
  }
};

await grab(brand.hero, 'hero');
await grab(brand.logo, 'logo');
// a few in-page images, largest-looking first; many sites render these in JS and have none
let n = 0;
for (const img of brand.images) {
  if (n >= 6) break;
  if (img === brand.hero || img === brand.logo) continue;
  if (/sprite|icon-|pixel|tracking|1x1/i.test(img)) continue;
  if (await grab(img, `img-${n + 1}`)) n++;
}

// ---- palette ----
// Sample ONLY the brand's own declared assets (og:image and icon). In-page images are
// content, and on a portfolio or customer-logo strip they are OTHER COMPANIES' marks --
// sampling them let a client's teal logo define this brand's accent. og:image and the
// icon are the two assets the site owner explicitly nominated to represent the brand.
const own = downloaded.filter((d) => !d.vector && (d.label === 'hero' || d.label === 'logo'));
const fallback = downloaded.filter((d) => !d.vector);
const sampleable = (own.length ? own : fallback).map((d) => d.file);
let palette = sampleable.length ? paletteFrom(sampleable) : null;
if (palette && own.length) palette.sampledFrom = own.map((d) => d.label);
if (!palette) {
  // Nothing sampleable (SVG-only or JS-rendered site). theme-color is the site's own
  // declared brand colour and is a far better guess than a hardcoded default.
  const accent = brand.themeColor || '#2A6BF2';
  palette = { accent, ink: '#12141A', surface: '#FFFFFF', dark: false, swatches: [accent], derived: 'theme-color' };
  console.log('   no raster asset to sample — palette from theme-color');
}
if (brand.themeColor && palette.derived !== 'theme-color') palette.themeColor = brand.themeColor;

const out = {
  researchedAt: new Date().toISOString().slice(0, 10),
  ...brand,
  palette,
  assets: downloaded.map(({ label, file, src, vector, width, height, ar }) =>
    ({ label, file: 'assets/' + file.split('/').pop(), src, vector, width, height, ar })),
};
const file = join(OUT, 'brand.json');
writeFileSync(file, JSON.stringify(out, null, 2) + '\n');

console.log(`\n   palette  accent ${palette.accent}  ink ${palette.ink}  surface ${palette.surface}  ${palette.dark ? '(dark brand)' : '(light brand)'}`);
console.log(`   assets   ${downloaded.length}`);
console.log(`   wrote    ${file}`);
