// Render Remotion compositions. Bundles ONCE and reuses it across every id, which saves
// a minute or two of bundling per composition on a batch.
//   node tools/render.mjs Ep01 Ep02 ...      # video(s) -> out/<id>.mp4
//   node tools/render.mjs --still Cover      # -> out/<id>.png
//   node tools/render.mjs --frames=0,30 Ep01 # -> out/frames/<id>-0000.png
//
// CHROME_PATH selects the browser (Remotion's bundled Chromium download is blocked on
// some networks); CONCURRENCY caps the page pool -- keep it low on shared hosts, where
// a large pool intermittently fails to boot.
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { loadConfig } from './lib/config.mjs';

// Resolve Remotion from the PROJECT being rendered, not from wherever this script lives.
// Node resolves bare imports relative to the importing file, so a plain
// `import from '@remotion/bundler'` only works when this tool sits inside the project's
// own node_modules tree -- which it does not when inkwell is installed globally or
// cloned alongside. Resolving against the cwd's package.json is what makes the tools
// runnable from any project directory.
const projectRequire = createRequire(join(process.cwd(), 'package.json'));
const load = async (pkg) => {
  try {
    return await import(pathToFileURL(projectRequire.resolve(pkg)).href);
  } catch {
    console.error(`Cannot resolve ${pkg} from ${process.cwd()}.`);
    console.error('Run this from a project directory that has Remotion installed.');
    process.exit(1);
  }
};
const { bundle } = await load('@remotion/bundler');
const { selectComposition, renderMedia, renderStill } = await load('@remotion/renderer');

const cfg = loadConfig();
const BROWSER = process.env.CHROME_PATH || cfg.render.browser || undefined;
const CONCURRENCY = Number(process.env.CONCURRENCY || cfg.render.concurrency);
const PORT = Number(process.env.PORT || cfg.render.port);
const SKIP_EXISTING = process.env.SKIP_EXISTING !== '0';

const argv = process.argv.slice(2);
const still = argv.includes('--still');
const framesArg = argv.find((a) => a.startsWith('--frames='));
const frames = framesArg ? framesArg.split('=')[1].split(',').map(Number) : null;
const scale = Number(process.env.SCALE || 1);
const ids = argv.filter((a) => !a.startsWith('--'));
if (!ids.length) { console.error('usage: render.mjs [--still|--frames=0,30] <CompId> [...]'); process.exit(1); }

const outDir = cfg.at(cfg.paths.out);
mkdirSync(outDir, { recursive: true });

console.log(`-> bundling once for ${ids.length} composition(s)...`);
const serveUrl = await bundle({ entryPoint: cfg.at(cfg.paths.entry) });
console.log('   bundled');

const ok = [], failed = [];
for (const id of ids) {
  try {
    const composition = await selectComposition({ serveUrl, id, browserExecutable: BROWSER, port: PORT });

    if (frames) {
      const dir = join(outDir, 'frames');
      mkdirSync(dir, { recursive: true });
      for (const f of frames) {
        const output = join(dir, `${id}-${String(f).padStart(4, '0')}.png`);
        await renderStill({ composition, serveUrl, output, frame: f, scale,
          browserExecutable: BROWSER, port: PORT, overwrite: true });
        console.log(`   ${output}`);
      }
    } else if (still) {
      const output = join(outDir, `${id}.png`);
      await renderStill({ composition, serveUrl, output, browserExecutable: BROWSER, port: PORT, overwrite: true });
      console.log(`   ${output}`);
    } else {
      const outPath = join(outDir, `${id}.mp4`);
      if (SKIP_EXISTING && existsSync(outPath)) { console.log(`   ${id} exists, skipping`); ok.push(id); continue; }
      const t0 = Date.now();
      await renderMedia({ composition, serveUrl, codec: 'h264', outputLocation: outPath,
        browserExecutable: BROWSER, concurrency: CONCURRENCY, port: PORT, timeoutInMilliseconds: 90000 });
      console.log(`   ${id}  ${composition.durationInFrames}f in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    ok.push(id);
  } catch (err) {
    console.error(`   FAILED ${id}: ${err.message?.split('\n')[0]}`);
    failed.push(id);
  }
}
console.log(`\n=== ${ok.length}/${ids.length} ok${failed.length ? `, FAILED: ${failed.join(' ')}` : ''}`);
if (failed.length) process.exit(1);
