# Troubleshooting

Every entry here is something that actually happened during the build, and most of them fail
in a way that points at the wrong cause.

## The palette is wrong

First check *which* asset it sampled — `brand.json` records `palette.sampledFrom`.

Override it and move on; there is no prize for making the extractor agree with you:

```json
{
  "palette": { "accent": "#8B5CF6", "ink": "#F5F6F8", "surface": "#000000", "dark": true }
}
```

Merged over the extracted palette, so you can override one key.

Known limits: a brand whose accent appears **only** in an SVG (ffmpeg cannot rasterise
those), and a site with no `og:image` and no icon, where it falls back to `theme-color`.

## The ad shows the wrong company's colour

The palette samples only `og:image` and the icon for exactly this reason. If it still
happens, the brand's own `og:image` probably features a partner or customer logo. Override
`palette.accent`.

## Text is cut off at the edges of a hero image

Fixed, but worth recognising: an `og:image` is a 1.91:1 banner, usually with the product name
set across it. Earlier versions dropped it into a portrait box with `object-fit: cover`,
which crops the wordmark off both ends and looks broken rather than cropped.

Research now measures every asset with `ffprobe` and `Shot` fits the box to the image. If
you see cropping, check the asset has `width`/`height`/`ar` in `brand.json` — an asset added
by hand will not, and falls back to `cover`.

## "Cannot resolve @remotion/bundler"

Run render tools **from the ad project directory**, after `npm install`. Node resolves bare
imports relative to the importing file, so the tools resolve Remotion against your project's
`package.json` instead. Run them from elsewhere and there is nothing to resolve.

## Renders fail intermittently, or the browser will not boot

Lower `CONCURRENCY` (default 4). On shared or memory-constrained hosts a large page pool
fails to start. `CONCURRENCY=2` is reliable.

If Remotion cannot download Chromium, set `CHROME_PATH` to a system browser.

## Two renders at once produce nothing, or stale files

Both used port 3333. Set `PORT` per run.

This one deserves care: if you background several renders and send their output to
`/dev/null`, the failures are invisible, the previous `out/*.mp4` files are still sitting
there, and you will compare stale renders and conclude your fix did not work. Run serially,
or give each run its own port, and keep the output visible.

## Whole words missing on some frames

Per-word `will-change` plus a `blur()` filter promotes every word to its own compositor
layer. Chrome runs out of compositing memory and **silently drops layers** — words fail to
paint on individual frames while neighbouring frames are perfect.

It presents as a timing bug in the stagger, which is the wrong place to look. Keep per-word
animation to `transform` and `opacity`, with no `will-change`.

## The ad feels like a slideshow

Measure it:

```bash
ffmpeg -i out/Reel.mp4 -vf "freezedetect=n=-58dB:d=0.7" -f null -
```

Output means part of the ad is a still frame.

If it measures 0% and *still* feels slidy, the problem is structural rather than easing —
see [aspect-ratios § motion](../skills/inkwell/references/aspect-ratios.md#motion). The short
version: elements that arrive together, hold, and leave together are a slide, however
smoothly the group is transformed.

## A scene is frozen but the rest is fine

A scene with no `shot` has nothing moving once its text has landed and its counter has
finished. The content layer floats slowly to prevent this. If you have customised `Stage`
and removed that float, text-only scenes will freeze while media scenes stay clean —
which is why this reads as a content problem rather than a code one.

## The thumbnail is black

Social platforms use frame 0 as the poster image. Springs starting at frame 0 leave the
first frames nearly empty. The hook's opening beats use a negative `enterAt` so their springs
are already in progress at frame 0. Preserve that if you write a custom opening scene.

Check it:

```bash
ffmpeg -i out/Reel.mp4 -vf "select=eq(n\,0)" -frames:v 1 frame0.png
```

## Nothing renders and there is no error

Check `ad.json` is valid JSON — a trailing comma is the usual culprit:

```bash
node -e "JSON.parse(require('fs').readFileSync('ad.json','utf8')); console.log('ok')"
```
