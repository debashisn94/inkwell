// Even out a TTS model's random per-chunk speaking rate.
//   node tools/pace-fix.mjs r09 [--dry] [--target=2.65] [--median]
//
// Neural TTS picks a pace per chunk with no memory of the last one, so an episode can
// jump from 2.25 to 3.12 words/sec between consecutive sentences -- the listener hears
// one statement rush and the next crawl. Measured against a human read of the same
// script: a person varies pace by ~67% across an episode, the model by ~150%. The model
// hits extremes a person never does. This pulls the outliers back toward a target so the
// variation that remains is the natural kind.
//
// Target the SERIES pace, not the episode's own median. Normalising to the episode's own
// median only evens it out internally -- it cannot catch an episode that is uniformly
// rushed, which is the failure that actually ships. Pass --median to opt into the old
// behaviour, or --target=<w/s> to override.
//
// Run AFTER your TTS pass and BEFORE finish-audio. Originals are kept in _prepace/ so it
// is safe to re-run; every pass re-stretches from the untouched source, never from a
// previous stretch.
import { readFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { loadConfig, stemOf } from './lib/config.mjs';

const cfg = loadConfig();
const stem = stemOf(process.argv[2]);
const dry = process.argv.includes('--dry');
const { tolerance: TOL, minFactor: MIN_F, maxFactor: MAX_F } = cfg.pace;

const chunks = JSON.parse(readFileSync(cfg.at(cfg.paths.audio, `${stem}-chunks.json`), 'utf8'));
const rawDir = cfg.at(cfg.paths.audio, `${stem}-raw`);
const keep = join(rawDir, '_prepace');
mkdirSync(keep, { recursive: true });

const dur = (f) => parseFloat(execFileSync('ffprobe',
  ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim());

// words-per-second per chunk, measured on the pristine source
const rows = chunks.map((c, i) => {
  const name = `output_${String(i + 1).padStart(3, '0')}.wav`;
  const src = join(keep, name);
  if (!existsSync(src)) copyFileSync(join(rawDir, name), src);
  const words = c.text.split(/\s+/).filter(Boolean).length;
  const d = dur(src);
  return { i, name, src, dst: join(rawDir, name), words, d, wps: words / d };
});

// A fixed sign-off is swapped for its canonical recording by finish-audio, so it never counts.
const isSignoff = (c) => cfg.signoff.text && c.text.trim() === cfg.signoff.text;
const pool = rows.filter((r) => !isSignoff(chunks[r.i])).map((r) => r.wps).sort((a, b) => a - b);
const median = pool.length % 2
  ? pool[(pool.length - 1) / 2]
  : (pool[pool.length / 2 - 1] + pool[pool.length / 2]) / 2;

const targArg = process.argv.find((a) => a.startsWith('--target='));
const target = targArg ? Number(targArg.split('=')[1])
  : process.argv.includes('--median') ? median
  : cfg.pace.targetWps;
console.log(`${stem}: this episode's median ${median.toFixed(2)} w/s | target ${target.toFixed(2)} w/s`);

let fixed = 0;
for (const r of rows) {
  if (isSignoff(chunks[r.i])) { console.log(`  ${r.i}: sign-off, skipped`); continue; }
  const dev = (r.wps - target) / target;
  if (Math.abs(dev) <= TOL) continue;
  // too FAST (high w/s) means the words are short -> slow it down -> atempo < 1
  const raw = target / r.wps;
  const f = Math.max(MIN_F, Math.min(MAX_F, raw));
  // ffmpeg's atempo only accepts 0.5-2.0 per instance and gets grainy past ~0.8,
  // so anything steeper is split across two gentler stages.
  const chain = f < 0.8 || f > 1.25
    ? `atempo=${Math.sqrt(f).toFixed(4)},atempo=${Math.sqrt(f).toFixed(4)}`
    : `atempo=${f.toFixed(4)}`;
  console.log(`  ${r.i}: ${r.wps.toFixed(2)} w/s (${dev > 0 ? '+' : ''}${(dev * 100).toFixed(0)}%) -> atempo ${f.toFixed(3)}` +
    (f !== raw ? ` (clamped from ${raw.toFixed(3)})` : '') + (chain.includes(',') ? ' [2-stage]' : ''));
  if (dry) continue;
  // MUST stay pcm_s16le: finish-audio concatenates raw streams, and a format mismatch
  // silently turns the chunk into noise. This costs a full render pass to find.
  execFileSync('ffmpeg', ['-v', 'error', '-i', r.src, '-af', chain,
    '-ar', String(cfg.audio.sampleRate), '-ac', '1', '-c:a', 'pcm_s16le', r.dst, '-y']);
  fixed++;
}
const after = rows.filter((r) => !isSignoff(chunks[r.i])).map((r) => r.words / dur(r.dst));
const spread = (Math.max(...after) - Math.min(...after)) / Math.min(...after) * 100;
console.log(dry ? '  (dry run, nothing written)'
  : `${stem}: ${fixed} chunk(s) re-paced, spread now ${spread.toFixed(0)}%`);
