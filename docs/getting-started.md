# Getting started

A complete run, start to finish. About ten minutes, most of it spent writing copy.

## Before you start

- **Node.js 20+**
- **ffmpeg and ffprobe** on your `PATH` — `brew install ffmpeg`, or your distro's package
- **Chrome or Chromium.** Remotion downloads its own, but that download is blocked on some
  networks. If it fails, point at an existing browser:

  ```bash
  export CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  ```

No API keys. Nothing to sign up for.

## 1. Scaffold and research

```bash
node tools/new-ad.mjs https://your-product.com --out=ad
```

This copies the ad template into `ad/`, then reads the product page and writes
`ad/brand.json`:

```
-> fetching https://your-product.com
   Your Product — "The tagline from the page"
   got hero  237KB  https://your-product.com/og-image.png
   got logo  19KB   https://your-product.com/icon.png

   palette  accent #daaf4e  ink #f5f6f8  surface #000000  (dark brand)
   assets   2
   wrote    ad/brand.json
```

It also writes a starter `ad/ad.json` with every line you need to replace marked `REWRITE`.

If the palette looks wrong, see [troubleshooting](troubleshooting.md#the-palette-is-wrong) —
there is an override and you do not have to fight the extractor.

## 2. Read before you write

Open `ad/brand.json`. It carries the site's own `title`, `description`, `headings` and
`keywords`.

**Then open the product page yourself.** The extractor gets you identity and assets; it
cannot tell you what the product is for, who it beats, or what the objection is. Pricing,
proof and the competing alternative are usually right there on the page, and they are the
three things that decide whether an ad works.

## 3. Write the ad

Rewrite `ad/ad.json`. Full field reference: [ad.json](ad-json.md).

A worked example, taken from a real product page rather than invented:

```json
{
  "brandName": "Astrika",
  "logo": "assets/logo.png",
  "scenes": [
    { "type": "hook", "seconds": 4,
      "kicker": "Real Vedic Jyotish",
      "headline": "Job lost? Relationship over?",
      "sub": "Free kundalis are everywhere. Honest answers aren't.",
      "shot": "assets/hero.png" },

    { "type": "feature", "seconds": 5.5,
      "kicker": "How it works",
      "headline": "Your actual chart. Not sun-sign filler.",
      "bullets": [
        "Swiss Ephemeris · Lahiri ayanamsa · classical Parashari",
        "No astrologer ever sees your chart",
        "No per-minute calls. ₹49 a question, flat."
      ] },

    { "type": "proof", "seconds": 5.5,
      "quote": "The chart isn't saying \"no.\" It's saying \"not until you're not asking.\"",
      "attrib": "Real answer · audited · names redacted" },

    { "type": "cta", "seconds": 4,
      "headline": "First reading and first question, free.",
      "action": "Ask my chart →",
      "url": "astrika.in" }
  ]
}
```

Every line there came off the product's own page. **Do not invent a statistic, a review, or
a price.** You are advertising someone's product; a fabricated number is a real problem, not
a rounding error.

## 4. Render every format

```bash
cd ad
npm install
node ../tools/render-ad.mjs
```

```
-> bundling
   Reel     1080x1920  570f  35s  -> out/Reel.mp4
   Feed     1080x1350  570f  34s  -> out/Feed.mp4
   Square   1080x1080  570f  33s  -> out/Square.mp4
   Wide     1920x1080  570f  35s  -> out/Wide.mp4

=== 4/4 rendered
```

One definition, four real layouts — not one master letterboxed. Why they differ:
[aspect-ratios](../skills/inkwell/references/aspect-ratios.md).

## 5. Check it

```bash
node ../tools/qa.mjs Reel --sheet
```

And run the freeze check, which catches the single most common failure — an ad that has
quietly become a slideshow:

```bash
ffmpeg -i out/Reel.mp4 -vf "freezedetect=n=-58dB:d=0.7" -f null -
```

Any output means part of your ad is a still frame. It should print nothing.

**Then watch one.** Automated checks catch frozen frames and blank scenes; they do not catch
a headline that reads awkwardly in landscape, or a hero image that turned out to be a logo
on a transparent background.

## Iterating

Editing copy needs no re-research:

```bash
# edit ad/ad.json, then
node ../tools/render-ad.mjs Reel      # one format while iterating
node ../tools/render-ad.mjs           # all four when happy
```

Re-run `research.mjs` only when the product's site itself has changed:

```bash
node ../tools/research.mjs https://your-product.com --out=.
```

It overwrites `brand.json` but **never** your `ad.json`.
