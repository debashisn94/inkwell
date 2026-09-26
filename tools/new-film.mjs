// Scaffold a narrated launch film and research the product in one step.
//   node tools/new-film.mjs https://your-product.com [--out=film]
//
// Copies film-template/, pulls the brand's palette from its own site, and writes a starter
// film.json. The starter is a STRUCTURE, not a script: every line marked REWRITE is yours
// to write, and the film is only as good as that writing.
import { cpSync, existsSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = join(HERE, '..', 'film-template');

const url = process.argv[2];
const outArg = process.argv.find((a) => a.startsWith('--out='));
const OUT = outArg ? outArg.split('=')[1] : 'film';
if (!url || !/^https?:\/\//.test(url)) {
  console.error('usage: new-film.mjs <https://product-url> [--out=dir]');
  process.exit(1);
}
if (existsSync(join(OUT, 'film.json'))) {
  console.error(`${OUT}/film.json already exists — refusing to overwrite your script.`);
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });
cpSync(TEMPLATE, OUT, { recursive: true, filter: (src) => !src.includes('node_modules') });
console.log(`-> scaffolded ${OUT}/`);

execFileSync(process.execPath, [join(HERE, 'research.mjs'), url, `--out=${OUT}`], { stdio: 'inherit' });
const brand = JSON.parse(readFileSync(join(OUT, 'brand.json'), 'utf8'));
const name = brand.name || 'Product';
const host = new URL(url).hostname.replace(/^www\./, '');

// Problem -> failed alternative -> reveal -> how -> proof of substance -> offer -> action.
// Six to eleven scenes; each carries ONE narration line of 15-25 words.
const R = (s) => `REWRITE: ${s}`;
const starter = {
  brandName: name,
  wordmark: name.toLowerCase().split(/\s+/)[0],
  narrator: 'A confident, warm male narrator in his late thirties, the voice of a premium tech product launch film. Rich mid-low tone, crisp articulation, energetic but controlled, with genuine excitement and natural rises and falls',
  scenes: [
    { type: 'chips', kicker: R('who has the problem'), headline: R('the pain, in their words, with one *accent* phrase'),
      chips: [R('a task they repeat'), R('another'), R('another')], chipTag: 'again',
      lines: [R('what it costs them'), R('the sharpest version of it')],
      voice: { text: R('the problem, spoken to one person'), emotion: 'Wry and knowing, relatable, a small sigh at the start' } },
    { type: 'blocked', kicker: 'The obvious fix', headline: R('the alternative people try\n*why it fails*'),
      items: [R('what they would hand over'), R('another'), R('another')], destination: R('where it would go'), label: 'BLOCKED',
      voice: { text: R('why the obvious fix does not work'), emotion: 'Serious and matter-of-fact, firm emphasis' } },
    { type: 'reveal', lines: [R('what it is, in one line'), R('*the promise*')],
      voice: { text: `This is ${name}! ${R('the one-line promise')}`, emotion: 'The big reveal: excited, bright and proud, a confident smile in the voice' } },
    { type: 'features', kicker: 'What it does', headline: R('the benefit, with an *accent*'),
      cards: [{ icon: 'bolt', title: R('pillar'), body: R('one concrete sentence') }, { icon: 'shield', title: R('pillar'), body: R('one concrete sentence') }, { icon: 'users', title: R('pillar'), body: R('one concrete sentence') }],
      voice: { text: R('how it works, concretely'), emotion: 'Clear, energetic explainer, brisk rhythm' } },
    { type: 'numbers', kicker: 'The offer', headline: R('the offer in *few words*'),
      numbers: [{ value: '0', label: R('what this number counts') }, { value: '0', label: R('what this one counts') }],
      voice: { text: R('the offer, with real numbers from the site'), emotion: 'Crisp, confident offer, punchy beats, rising excitement' } },
    { type: 'end', headline: R('the *one* action'), links: [host],
      voice: { text: R('the close and the call to action'), emotion: 'Inspiring close, sincere and energetic, then warm on the final words' } },
  ],
};
if (brand.palette) starter.palette = brand.palette;
writeFileSync(join(OUT, 'film.json'), JSON.stringify(starter, null, 2) + '\n');

console.log(`\n   wrote ${OUT}/film.json  (a STRUCTURE — rewrite every line marked REWRITE)`);
console.log(`\n   next:  cd ${OUT} && npm install`);
console.log(`          python ../tools/film-voice.py        # narration (needs VoxCPM)`);
console.log(`          node ../tools/render-film.mjs --stems`);
