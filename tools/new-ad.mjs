// Scaffold an ad project and research the product in one step.
//   node tools/new-ad.mjs https://your-product.com [--out=ad]
//
// Copies the template, pulls the brand's real imagery and palette, and writes a starter
// ad.json for you to rewrite. The copy is the part worth your attention -- everything
// else here is mechanical.
import { cpSync, existsSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = join(HERE, '..', 'template');

const url = process.argv[2];
const outArg = process.argv.find((a) => a.startsWith('--out='));
const OUT = outArg ? outArg.split('=')[1] : 'ad';
if (!url || !/^https?:\/\//.test(url)) {
  console.error('usage: new-ad.mjs <https://product-url> [--out=dir]');
  process.exit(1);
}
if (existsSync(join(OUT, 'ad.json'))) {
  console.error(`${OUT}/ad.json already exists — refusing to overwrite your copy.`);
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });
cpSync(TEMPLATE, OUT, { recursive: true });
console.log(`-> scaffolded ${OUT}/`);

execFileSync(process.execPath, [join(HERE, 'research.mjs'), url, `--out=${OUT}`], { stdio: 'inherit' });

const brand = JSON.parse(readFileSync(join(OUT, 'brand.json'), 'utf8'));
const hero = brand.assets?.find((a) => a.label === 'hero');
const logo = brand.assets?.find((a) => a.label === 'logo' && !a.vector);

// A starter, not a finished ad. The headline below is the site's own og:title, which is
// a reasonable hook only by accident -- rewrite it.
const starter = {
  brandName: brand.name,
  ...(logo ? { logo: logo.file } : {}),
  scenes: [
    { type: 'hook', seconds: 4, kicker: 'REWRITE ME',
      headline: brand.title || brand.name,
      sub: brand.description || '',
      ...(hero ? { shot: hero.file } : {}) },
    { type: 'feature', seconds: 5.5, kicker: 'What it does',
      headline: 'REWRITE: the one thing it does better than the alternative',
      bullets: (brand.headings || []).slice(0, 3) },
    { type: 'proof', seconds: 5,
      quote: 'REWRITE: a real quote, number, or result',
      attrib: 'REWRITE: who said it' },
    { type: 'cta', seconds: 4,
      headline: 'REWRITE: the offer',
      action: 'REWRITE: the action →',
      url: new URL(url).hostname.replace(/^www\./, '') },
  ],
};
writeFileSync(join(OUT, 'ad.json'), JSON.stringify(starter, null, 2) + '\n');

console.log(`\n   wrote ${OUT}/ad.json  (a STARTER — rewrite every line marked REWRITE)`);
console.log(`\n   next:  cd ${OUT} && npm install`);
console.log(`          node ../tools/render-ad.mjs --list`);
console.log(`          node ../tools/render-ad.mjs`);
