---
name: inkwell
description: Turn a product URL into a finished ad video in every aspect ratio — 9:16 for Reels/Shorts/TikTok, 4:5 and 1:1 for feed, 16:9 for YouTube. Researches the product, pulls its real imagery and brand colours from its own site, writes the ad, and renders all formats with Remotion. Use when someone wants an ad, promo, launch, or social video for a product, website, or app, wants to advertise or market something, needs a video ad for YouTube/Instagram/LinkedIn/TikTok/Meta ads, or asks to make a video in multiple aspect ratios. Also makes narrated 16:9 launch films (90s-2min, cloned-voice narration, sound design) for launch videos, product-page heroes and founding-customer pitches.
license: MIT
---

# Inkwell

You turn a product URL into ad videos in every platform size.

**You own the story.** The tools handle research, layout, and rendering; the part that
decides whether the ad works is the copy, and that is yours. Treat the generated `ad.json`
as a stub to be rewritten, never as a draft to be tweaked.

## The flow

```bash
node tools/new-ad.mjs https://the-product.com --out=ad   # scaffold + research
# ...now rewrite ad/ad.json...
cd ad && npm install
node ../tools/render-ad.mjs                              # all four formats
```

`new-ad.mjs` writes `brand.json` (real imagery, palette, positioning) and a starter
`ad.json` with every line you must replace marked `REWRITE`.

## Step 1 — read the research before you write

Open `brand.json`. It has the site's own `title`, `description`, `headings`, and
`keywords`. **Also read the product page yourself.** The extractor gets you brand identity
and assets; it cannot tell you what the product is actually for, who it beats, or what the
objection is. Pricing, proof, and the competitive alternative are usually on the page and
are the three things that make an ad convert.

## Step 2 — write the ad

Four scene types, in `ad.json`. A 15–22 second ad is four scenes; do not exceed six.

| Scene | Fields | Job |
|---|---|---|
| `hook` | `kicker`, `headline`, `sub`, `shot` | Earn the next two seconds |
| `feature` | `kicker`, `headline`, `bullets[]`, `shot` | One reason to care, made concrete |
| `proof` | `quote`, `attrib`, `stat`, `statLabel` | Evidence someone else believed it |
| `cta` | `headline`, `action`, `url` | One action, named as a verb |

Rules that matter more than the template:

- **The hook is the whole ad.** Most viewers see only the first two seconds. Lead with the
  viewer's problem in their words, never with the product name or a greeting.
- **Say the number.** "₹49 a question, flat" beats "affordable pricing". Take real figures
  from the page; never invent one.
- **Headlines under ~8 words.** The measure is capped in characters, so long headlines
  shrink and wrap badly in landscape.
- **3 bullets maximum**, each a phrase, not a sentence.
- **One CTA.** A named action, and the bare domain.
- Claim only what the site claims. You are advertising someone's product — an invented
  statistic is a real problem, not a rounding error.

## Step 3 — render every format

`render-ad.mjs` renders `Reel` (9:16), `Feed` (4:5), `Square` (1:1) and `Wide` (16:9) from
one definition. Pass ids to render a subset; `--list` shows them.

These are not one master letterboxed four times — each shape gets a real layout. If you
need to know why a headline is a different size at 16:9, read
[references/aspect-ratios.md](references/aspect-ratios.md).

## Step 4 — look at the output

Render, then actually watch a frame from each format. `node ../tools/qa.mjs Reel --sheet`
gives a contact sheet. Things that only show up on inspection: a headline colliding with
the safe area, an asset that turned out to be a logo on a transparent background, copy that
reads fine in portrait and awkwardly in landscape.

## Imagery, in priority order

1. **The product's own site.** `og:image` and the icon, downloaded by the research step.
   This is what makes an ad look like the product rather than like a template.
2. **Stock**, if you have a key and the site is thin. Not required and not wired in by
   default — a real product screenshot beats a stock photo of a laptop every time.
3. **A generated backdrop.** Built from the extracted accent colour. This is the automatic
   fallback and it is why a text-only scene still looks on-brand.

If a site yields only one asset, **use fewer image scenes** rather than repeating the same
picture — repetition reads as a thin ad.

## Narrated launch films

When the brief is a launch video, an explainer, or anything longer than an ad (60 seconds
to two minutes, with a narrator), make a **film** instead. It is 16:9, voiced, and
sound-designed.

```bash
node tools/new-film.mjs https://the-product.com --out=film
# write film/film.json -- every line marked REWRITE
cd film && npm install
python ../tools/film-voice.py             # needs VoxCPM; one narrator, scored takes
node ../tools/render-film.mjs --stems     # out/Film.mp4 + voice/sfx stems
```

What you own, in order of how much it matters:

1. **The argument.** Problem shown happening, then the obvious fix and why it fails, then
   the reveal, how it works, what is real today, the offer, and the action. The product
   name lands only after the problem is felt.
2. **One narration line per scene, 15-25 words**, written for the ear. `...` holds a beat,
   a `?` turns the line, and fragments land hard. Give each line an `emotion`.
3. **Honesty about what ships.** Use a `split` scene to separate shipped from planned.

Read [docs/film.md](../../docs/film.md) for the twelve scene types and their fields
before writing `film.json`. The narration drives scene lengths, so never hand-time a scene.
After `film-voice.py`, read its score table: a line marked `x` failed a gate. Re-roll it
with `--lines N` and say which lines you could not verify by ear.

## Extras

The repo also carries a character-animation toolkit — mocap-driven 2D rigs and an SVG
character playbook — used for narrated explainer video rather than ads. See
[references/characters.md](references/characters.md) if a brief calls for it.
