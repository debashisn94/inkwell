// Render an ad to every platform format, bundling once.
//   node tools/render-ad.mjs                 # all formats
//   node tools/render-ad.mjs Reel Wide       # just these
//   node tools/render-ad.mjs --list
//
// Run from the ad project directory (the one with ad.json).
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

// Resolve Remotion from the PROJECT being rendered, not from wherever this script lives.
const projectRequire = createRequire(join(process.cwd(), 'package.json'));
const load = async (pkg) => {
  try { return await import(pathToFileURL(projectRequire.resolve(pkg)).href); }
  catch {
    console.error(`Cannot resolve ${pkg} from ${process.cwd()}.`);
    console.error('Run this from the ad project directory, after npm install.');
    process.exit(1);
  }
};
const { bundle } = await load('@remotion/bundler');
const { selectComposition, renderMedia, getCompositions } = await load('@remotion/renderer');

const BROWSER = process.env.CHROME_PATH || undefined;
const CONCURRENCY = Number(process.env.CONCURRENCY || 4);
const PORT = Number(process.env.PORT || 3333);

const args = process.argv.slice(2);
const outDir = join(process.cwd(), 'out');
mkdirSync(outDir, { recursive: true });

console.log('-> bundling');
const serveUrl = await bundle({ entryPoint: join(process.cwd(), 'src', 'index.ts') });

const all = await getCompositions(serveUrl, { browserExecutable: BROWSER, port: PORT });
if (args.includes('--list')) {
  all.forEach((c) => console.log(`   ${c.id.padEnd(8)} ${c.width}x${c.height}  ${c.durationInFrames}f`));
  process.exit(0);
}
const wanted = args.filter((a) => !a.startsWith('--'));
const targets = wanted.length ? all.filter((c) => wanted.includes(c.id)) : all;
if (!targets.length) {
  console.error(`no matching composition. available: ${all.map((c) => c.id).join(', ')}`);
  process.exit(1);
}

const ok = [], failed = [];
for (const c of targets) {
  const outPath = join(outDir, `${c.id}.mp4`);
  const t0 = Date.now();
  try {
    const composition = await selectComposition({ serveUrl, id: c.id, browserExecutable: BROWSER, port: PORT });
    await renderMedia({
      composition, serveUrl, codec: 'h264', outputLocation: outPath,
      browserExecutable: BROWSER, concurrency: CONCURRENCY, port: PORT,
      timeoutInMilliseconds: 90000,
    });
    console.log(`   ${c.id.padEnd(8)} ${String(c.width).padStart(4)}x${c.height}  ${c.durationInFrames}f  ${((Date.now() - t0) / 1000).toFixed(0)}s  -> out/${c.id}.mp4`);
    ok.push(c.id);
  } catch (err) {
    console.error(`   FAILED ${c.id}: ${err.message?.split('\n')[0]}`);
    failed.push(c.id);
  }
}
console.log(`\n=== ${ok.length}/${targets.length} rendered${failed.length ? `, FAILED: ${failed.join(' ')}` : ''}`);
if (failed.length) process.exit(1);
