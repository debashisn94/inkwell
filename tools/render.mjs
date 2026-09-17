// Render Remotion compositions. Bundles ONCE and reuses it across every id, which saves
// a minute or two of bundling per composition on a batch.
//   node tools/render.mjs Ep01 Ep02 ...      # video(s) -> out/<id>.mp4
//   node tools/render.mjs --still Cover      # -> out/<id>.png
//   node tools/render.mjs --frames=0,30 Ep01 # -> out/frames/<id>-0000.png
//
// CHROME_PATH selects the browser (Remotion's bundled Chromium download is blocked on
// some networks); CONCURRENCY caps the page pool -- keep it low on shared hosts, where
// a large pool intermittently fails to boot.
import { bundle } from '@remotion/bundler';
import { selectComposition, renderMedia, renderStill } from '@remotion/renderer';
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig } from './lib/config.mjs';

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
