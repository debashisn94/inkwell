# /inkwell

**A product URL in. Ad videos in every aspect ratio out.**

`/inkwell` researches a product from its own website — real imagery, real brand colours,
real positioning — then renders a finished ad in every platform size: 9:16 for Reels,
Shorts and TikTok, 4:5 and 1:1 for feed, 16:9 for YouTube and pre-roll. One definition,
four real layouts, built on [Remotion](https://remotion.dev).

No API keys. No stock-photo account. The ad is made of the product's own assets.

## Install

**Claude Code** — as a plugin:

```
/plugin marketplace add debashisn94/inkwell
/plugin install inkwell@inkwell
```

**Any other agent** — via the `skills` CLI (Cursor, Codex, Copilot, Gemini CLI, opencode):

```
npx skills add https://github.com/debashisn94/inkwell --skill inkwell
```

**No installer** — copy it:

```
rsync -a --exclude '.DS_Store' skills/inkwell/ ~/.claude/skills/inkwell/
```

## Use it

```bash
node tools/new-ad.mjs https://your-product.com --out=ad
# rewrite ad/ad.json — every line marked REWRITE
cd ad && npm install
node ../tools/render-ad.mjs
```

```
out/Reel.mp4     1080x1920   Reels · Shorts · TikTok · Stories
out/Feed.mp4     1080x1350   Instagram / Facebook feed
out/Square.mp4   1080x1080   Feed · LinkedIn
out/Wide.mp4     1920x1080   YouTube · LinkedIn · X · pre-roll
```

Ask your agent instead, and it will research the product, write the copy, and render:

```
make an ad for https://your-product.com
```

## How the research works

`tools/research.mjs` reads the page and writes `brand.json`: name, positioning, headings,
keywords, downloaded imagery, and a brand palette.

Two decisions in there are the difference between an ad that looks like the product and one
that looks like a template:

**It reads the HTML head, not `<img>` tags.** Most polished product sites render imagery in
JavaScript or as CSS backgrounds, so a raw-HTML image sweep comes back empty on exactly the
sites you most want to advertise. `og:image` is the one asset that is reliably present,
correctly sized, and chosen by the owner to represent the product.

**It samples the palette only from the brand's own declared assets.** Sampling every image
on the page sounds more thorough and is actively wrong: on a portfolio or a customer-logo
strip, those are *other companies'* marks. Tested against a site carrying client logos, the
accent came back as the client's teal instead of the brand's amber.

Colour extraction runs through `ffmpeg` rather than an image library, so there is no native
dependency. Getting it right took three attempts — the write-up is in
[`tools/lib/colors.mjs`](tools/lib/colors.mjs), and the short version is that averaging
colours in RGB buckets returns mud, and sampling too coarsely destroys the accent before
any logic runs.

## One ad, every aspect ratio

Not a 16:9 master with bars added — a letterboxed reel wastes the top and bottom third of
the most valuable surface in social. Each shape gets a real layout: type scales off the
short edge, safe areas match what the platform actually covers, and the stack direction
flips between portrait and landscape.

Full reasoning in
[references/aspect-ratios.md](skills/inkwell/references/aspect-ratios.md). Adding a fifth
format is one entry in `FORMATS` — the engine derives the rest.

## Documentation

| | |
|---|---|
| [Getting started](docs/getting-started.md) | A complete run, start to finish |
| [`ad.json` reference](docs/ad-json.md) | Every field, and the writing rules that matter more |
| [Tools](docs/tools.md) | Every command, flag and environment variable |
| [Customising](docs/customising.md) | Palette, fonts, new aspect ratios, new scene types |
| [Troubleshooting](docs/troubleshooting.md) | The failure modes, including the ones that point at the wrong cause |
| [Aspect ratios & motion](skills/inkwell/references/aspect-ratios.md) | Why each format is laid out differently, and what stops it reading as a slideshow |

## Requirements

- Node.js 20+ and [Remotion](https://remotion.dev) (free for individuals and teams of ≤3)
- `ffmpeg` and `ffprobe` on `PATH`

## What's in this repo

- `skills/inkwell/` — the skill and its references
- `docs/` — full documentation
- `tools/` — research, scaffold, render, QA
- `template/` — the ad project copied into your working directory
- `examples/hello-inkwell/` — a runnable demo of the character-animation extra

## Also here: character animation

The repo carries a second, optional toolkit for narrated explainer video — mocap-driven 2D
character rigs, an SVG character playbook, narration pacing and word-accurate captions. It
shares the render and QA tooling and nothing else. See
[references/characters.md](skills/inkwell/references/characters.md).

## License

MIT. Remotion is free for individuals and organisations of three or fewer people and
requires a company licence above that.
