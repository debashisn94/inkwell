# Tools reference

All tools are plain Node ESM with no dependencies of their own. Remotion is resolved from
the *ad project* you run them in, not from wherever inkwell is checked out, so you can clone
inkwell anywhere.

---

## `new-ad.mjs` — scaffold and research

```bash
node tools/new-ad.mjs <url> [--out=ad]
```

Copies `template/` to `--out`, runs research, writes a starter `ad.json`.

Refuses to run if `<out>/ad.json` already exists, so it cannot overwrite copy you have
written. To re-research an existing project, run `research.mjs` directly.

---

## `research.mjs` — product URL → `brand.json`

```bash
node tools/research.mjs <url> [--out=dir]
```

Writes `<out>/brand.json` and downloads imagery to `<out>/public/assets/`.

**Extracted:** `name`, `title`, `description`, `headings`, `keywords`, `themeColor`, `hero`,
`logo`, `images`, plus a `palette` and per-asset dimensions.

Reads the HTML head rather than scraping `<img>` tags — most product sites render imagery in
JavaScript, so an `<img>` sweep returns nothing on exactly the polished sites worth
advertising. `og:image` is reliably present and owner-chosen.

The palette is sampled **only from `og:image` and the icon**. Sampling every image on the
page sounds more thorough and is wrong: on a portfolio or customer-logo strip those are other
companies' marks.

Overwrites `brand.json`. Never touches `ad.json`.

---

## `render-ad.mjs` — render every format

```bash
node tools/render-ad.mjs                  # all formats
node tools/render-ad.mjs Reel Wide        # a subset
node tools/render-ad.mjs --list           # show available
```

Run from the ad project directory. Bundles once and reuses it across formats, which saves a
minute or two per composition.

| Env | Default | |
|---|---|---|
| `CHROME_PATH` | Remotion's own | Use a system browser when the download is blocked |
| `CONCURRENCY` | 4 | Lower it on shared hosts, where a large page pool fails to boot |
| `PORT` | 3333 | **Change it if running two renders at once** |

> Two renders on the same port interfere. If you background several and send output to
> `/dev/null`, failures are invisible and you will compare stale files without noticing.

---

## `qa.mjs` — frame QA

```bash
node tools/qa.mjs <CompId> [--timing=<path>] [--stem=<id>] [--sheet]
```

Samples each beat and flags near-blank frames — the recurring bug where a scene changed and
nothing was drawn. `--sheet` writes a contact sheet next to the video.

Exits non-zero when it finds something, so it works in CI.

---

## The freeze check

Not a tool here, but the most useful check there is:

```bash
ffmpeg -i out/Reel.mp4 -vf "freezedetect=n=-58dB:d=0.7" -f null -
```

Any output means part of the ad is a still frame. A first cut measured **56% frozen** — the
single thing that made it read as a slideshow rather than a video.

---

## Character animation extras

`bake-bvh.py`, `chunk.mjs`, `phonetics.mjs`, `tts-queue.sh`, `pace-fix.mjs`,
`finish-audio.mjs`, `align-words.mjs` and `render.mjs` belong to the separate
character-animation toolkit. See
[references/characters.md](../skills/inkwell/references/characters.md).
