// Render a narrated film: picture, narration and sound design in one pass, then a
// loudness pass so it plays at a consistent level everywhere.
//
//   node ../tools/render-film.mjs                 # out/Film.mp4
//   node ../tools/render-film.mjs --stems         # + out/voice.wav, out/sfx.wav for your mix
//   node ../tools/render-film.mjs --stills 5,30   # QA frames at these seconds -> out/stills/
//
// Run from the film project directory (the one with film.json). The film is mastered to
// -16 LUFS integrated / -1.5 dBTP, the common target for YouTube, LinkedIn and X.
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const projectRequire = createRequire(join(process.cwd(), 'package.json'));
const load = async (pkg) => {
  try { return await import(pathToFileURL(projectRequire.resolve(pkg)).href); }
  catch {
    console.error(`Cannot resolve ${pkg} from ${process.cwd()}.`);
    console.error('Run this from the film project directory, after npm install.');
    process.exit(1);
  }
};
const { bundle } = await load('@remotion/bundler');
const { selectComposition, renderMedia, renderStill } = await load('@remotion/renderer');

const BROWSER = process.env.CHROME_PATH || undefined;
const CONCURRENCY = Number(process.env.CONCURRENCY || 4);
const PORT = Number(process.env.PORT || 3333);
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const val = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };

const out = join(process.cwd(), 'out');
mkdirSync(out, { recursive: true });

console.log('-> bundling');
const serveUrl = await bundle({ entryPoint: join(process.cwd(), 'src', 'index.ts') });
const pick = (mix) => selectComposition({ serveUrl, id: 'Film', inputProps: { mix }, browserExecutable: BROWSER, port: PORT });

if (val('--stills')) {
  const composition = await pick('none');
  mkdirSync(join(out, 'stills'), { recursive: true });
  for (const s of val('--stills').split(',').map(Number)) {
    const frame = Math.min(composition.durationInFrames - 1, Math.round(s * composition.fps));
    const output = join(out, 'stills', `t${s}.png`);
    await renderStill({ composition, serveUrl, frame, output, inputProps: { mix: 'none' }, browserExecutable: BROWSER, port: PORT });
    console.log(`   ${output}`);
  }
  process.exit(0);
}

const master = 'loudnorm=I=-16:TP=-1.5:LRA=11';
const t0 = Date.now();
const composition = await pick('full');
console.log(`-> rendering Film  ${composition.width}x${composition.height}  ${(composition.durationInFrames / composition.fps).toFixed(1)}s`);
const raw = join(out, 'Film.raw.mp4');
await renderMedia({
  composition, serveUrl, codec: 'h264', crf: 18, outputLocation: raw, inputProps: { mix: 'full' },
  audioBitrate: '320k', browserExecutable: BROWSER, concurrency: CONCURRENCY, port: PORT, timeoutInMilliseconds: 120000,
  onProgress: ({ progress }) => process.stdout.write(`\r   ${(progress * 100).toFixed(0)}%   `),
});
// The raw mix sums voice and effects without a ceiling; master it once here rather than
// trying to pre-balance every line against every cue.
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-c:v', 'copy', '-af', master, '-ar', '48000',
  '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', join(out, 'Film.mp4')]);
rmSync(raw);
console.log(`\n   out/Film.mp4  (${((Date.now() - t0) / 1000).toFixed(0)}s)`);

if (flag('--stems')) {
  // Stems are left at raw mix level (unmastered), so voice + sfx sum back to exactly the
  // balance you heard in the film. Master your own mix once, after adding music.
  for (const mix of ['voice', 'sfx']) {
    const c = await pick(mix);
    const tmp = join(out, `${mix}.raw.wav`);
    await renderMedia({ composition: c, serveUrl, codec: 'wav', outputLocation: tmp, inputProps: { mix },
      browserExecutable: BROWSER, port: PORT, concurrency: CONCURRENCY });
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', tmp, '-ar', '48000', '-c:a', 'pcm_s24le', join(out, `${mix}.wav`)]);
    rmSync(tmp);
    console.log(`   out/${mix}.wav`);
  }
}
