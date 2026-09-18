// Automated frame QA for a rendered video.
//   node tools/qa.mjs Reel09 --stem=r09 [--sheet]
//
// Samples every beat (from the real timing file) and flags near-blank frames -- the
// recurring "the scene swapped and nothing was drawn yet" bug that is invisible in the
// studio preview and obvious in the finished file. --sheet also writes a contact sheet
// next to the video for eyeballing.
import { readFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { loadConfig } from './lib/config.mjs';

const cfg = loadConfig();
const id = process.argv[2];
const wantSheet = process.argv.includes('--sheet');
const stemArg = process.argv.find((a) => a.startsWith('--stem='));
const timingArg = process.argv.find((a) => a.startsWith('--timing='));
if (!id) { console.error('usage: qa.mjs <CompId> [--stem=<id>] [--timing=<path>] [--sheet]'); process.exit(1); }
// Composition ids and audio stems are often not the same string; --stem bridges them.
// --timing points straight at a timing file for projects that do not follow the naming.
const stem = stemArg ? stemArg.split('=')[1] : id;

const video = cfg.at(cfg.paths.out, `${id}.mp4`);
const timingPath = timingArg
  ? cfg.at(timingArg.split('=')[1])
  : cfg.at(cfg.paths.generated, `timing-${stem}.generated.json`);
if (!existsSync(video)) { console.error(`no render: ${video}`); process.exit(1); }
if (!existsSync(timingPath)) { console.log(`${id}: no timing file at ${timingPath}, skipped`); process.exit(0); }

const timing = JSON.parse(readFileSync(timingPath, 'utf8'));
const tmp = cfg.at(cfg.paths.out, `_qa-${id}`);
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });

// signalstats gives us the mean and minimum luma per frame cheaply.
// metadata=print logs at INFO level, so it must be written to stdout explicitly --
// with a plain "-v error" it prints nothing and every check passes VACUOUSLY.
const probe = (t) => {
  const out = execFileSync('ffmpeg', ['-v', 'error', '-ss', String(t), '-i', video,
    '-frames:v', '1', '-vf', 'signalstats,metadata=print:file=-', '-f', 'null', '-'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  const g = (k) => {
    const m = out.match(new RegExp(`lavfi\\.signalstats\\.${k}=([\\d.]+)`));
    return m ? Number(m[1]) : NaN;
  };
  return { avg: g('YAVG'), min: g('YMIN') };
};

const flags = [];
const rows = [];
timing.forEach((b, i) => {
  // sample past the draw-on, before the next scene starts
  const t = b.start + b.seconds * cfg.qa.probeAt;
  const { min } = probe(t);
  rows.push({ i, t: +t.toFixed(2), min: +min.toFixed(0) });
  // On a light background, bare paper reads YMIN ~228; any real ink pulls it to single
  // digits. YAVG is NOT a usable signal (a rendered page averages brighter than a flat
  // one). Invert the comparison for a dark-background design.
  if (Number.isNaN(min)) flags.push(`beat ${i} @${t.toFixed(1)}s could not be measured`);
  else if (min > cfg.qa.blankYmin) flags.push(`beat ${i} @${t.toFixed(1)}s looks BLANK (ymin ${min})`);
});

if (wantSheet) {
  rows.forEach((r, k) => {
    execFileSync('ffmpeg', ['-v', 'error', '-ss', String(r.t), '-i', video, '-frames:v', '1',
      '-vf', 'scale=240:-1', join(tmp, `f${String(k + 1).padStart(3, '0')}.png`), '-y']);
  });
  const cols = 6;
  const sheet = cfg.at(cfg.paths.out, `qa-${id}.png`);
  execFileSync('ffmpeg', ['-v', 'error', '-i', join(tmp, 'f%03d.png'),
    '-filter_complex', `tile=${cols}x${Math.ceil(rows.length / cols)}:padding=6:color=white`,
    '-frames:v', '1', sheet, '-y']);
  console.log(`sheet: ${sheet}`);
}
rmSync(tmp, { recursive: true, force: true });

console.log(`${id}: ${timing.length} beats checked`);
if (flags.length) { flags.forEach((f) => console.log(`  ! ${f}`)); process.exitCode = 1; }
else console.log('  ok: no blank or empty beats');
