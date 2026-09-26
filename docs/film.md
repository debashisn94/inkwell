# Narrated launch films

An ad sells in 15 seconds. A **film** explains: 90 seconds to two minutes, 16:9, a
narrator walking a buyer from the problem to the offer, with sound design under every
beat. It's the format for a launch video, a founding-customer pitch, or the hero video on a
product page.

**Sample:** [`examples/holt-teams-film/`](../examples/holt-teams-film/) is a complete film
built with this pipeline, and its rendered MP4 is committed next to it.

```bash
node tools/new-film.mjs https://your-product.com --out=film
# write film/film.json -- every line marked REWRITE
cd film && npm install
python ../tools/film-voice.py            # narration: one narrator, an expressive take per line
node ../tools/render-film.mjs --stems    # out/Film.mp4 + out/voice.wav + out/sfx.wav
```

## How the pieces fit

| Step | Tool | Output |
|---|---|---|
| Scaffold + research | `new-film.mjs` | `film.json` starter, `brand.json` palette from the product's own site |
| Script | you | `film.json`: scenes, on-screen copy, one narration line per scene |
| Narration | `film-voice.py` | `public/voice/sNN.wav`, `voice.generated.json` (durations) |
| Picture + sound | `render-film.mjs` | `out/Film.mp4`, mastered to −16 LUFS |

**The narration drives the edit.** Each scene lasts as long as its choreography needs, or
as long as its line plus a breath, whichever is longer. Re-voice a line and the film
retimes itself; there are no timings to adjust by hand. Without `voice.generated.json` the
film renders as a silent preview at each scene's minimum length, which is useful while
you are still writing.

## Writing the film

A film is a short argument. The structure that works:

1. **Problem, shown happening** (`terminal` or `chips`). The viewer's pain, in their words.
2. **The obvious fix, and why it fails** (`blocked`). This is what makes the product
   necessary rather than nice.
3. **Reveal** (`reveal`). The name lands only after the problem is felt.
4. **How it works** (`flow`, `record`, `metric`). Concrete, one idea per scene.
5. **Trust** (`features`, `split`). What's real today, and what isn't yet.
6. **Offer** (`numbers`) and **action** (`end`).

Rules that matter more than the template:

- **One narration line per scene, 15–25 words.** Longer lines stretch the scene until the
  visuals have nothing left to do.
- **Narration and screen text should agree, not repeat each other.** The screen carries the
  headline; the voice carries the sentence around it.
- **Write for the ear.** Punctuation steers the read: `...` holds a beat, a `?` turns the
  line ("The obvious fix? ..."), short fragments land hard ("Claude Code. Cursor. Codex.").
- **Claim only what is true today.** Use `split` to separate shipped from planned; a film
  that implies an unbuilt feature exists is a liability.
- `*asterisks*` mark accent-coloured words in any headline or line. `\n` breaks a line.

## Scene reference

Every scene takes `voice: { text, emotion, at? }`. `emotion` is a free-text delivery
instruction for that line ("The big reveal: excited, bright and proud"); `at` overrides
when the line starts inside the scene. `seconds` sets a minimum length.

| type | Fields | Use it for |
|---|---|---|
| `terminal` | `title`, `stamps[2]`, `command`, `status`, `prompt`, `reply`, `headline` | A developer tool failing, shown live. Types a question, shows the useless answer, wipes it, starts over. |
| `chips` | `kicker`, `headline`, `chips[]`, `chipTag`, `lines[2]` | Repeated busywork. Chips pop in, then dissolve; two lines swap underneath. |
| `blocked` | `kicker`, `headline`, `items[3]`, `destination`, `destIcon`, `label`, optional `quote`, `attrib`, `stat{value,label}` | The alternative, shut by a lock slam. The optional quote is a second beat with a real person's words. |
| `quote` | `quote`, `attrib`, `stat{value,label}` | A testimonial on its own. |
| `reveal` | `lines[]`, `motif` (default true) | The product name. Uses top-level `wordmark` and `tag`. |
| `flow` | `kicker`, `headline`, `boundary`, `sources[{initial,label,tag}]`, `hub`, `outside{label,note,icon}` | How it works: sources feed one hub inside a boundary; nothing crosses to the outside. Up to five sources. |
| `record` | `kicker`, `headline`, `cardTitle`, `fields[[key, jsonValue]]`, `callouts[{field,title,body}]` | One data record typed in; callouts light up the fields they explain (`field` is the 0-based index). |
| `metric` | `kicker`, `headline`, `counter{to,label}`, `bar{label,segments[{value,label,share}]}`, `big{value,label}` | Something growing without bound next to something that stays fixed. `share` values are percentages. |
| `features` | `kicker`, `headline`, `cards[{icon,title,body}]`, `log{title,rows[{text,bad}]}` | Up to four pillars, with an optional live log as evidence. |
| `split` | `kicker`, `headline`, `left{title,items}`, `right{title,items}`, `footnote` | Shipped vs. coming. Checkmarks draw on the left; dashed rings spin on the right. |
| `numbers` | `kicker`, `headline`, `numbers[{value,label}]`, `price{value,label}`, `footnote` | The offer, as numbers that count up. |
| `end` | `headline`, `links[]` | Wordmark, call to action, where to go. |

Icons: `graph shield checklist plug lock cloud bolt eye clock users chart spark code globe check`.

Top-level fields: `brandName`, `wordmark` (lower-case display name), `tag` (the chip beside
it, e.g. "teams"), `palette {accent, accent2, surface, ink}`, `narrator` (a voice
description, used once to design the narrator).

## Narration

`film-voice.py` needs [VoxCPM](https://github.com/OpenBMB/VoxCPM) (`pip install voxcpm`).
Whisper (`mlx_whisper` or `whisper`) and `transformers` are optional; without them the
accuracy and identity checks are skipped, and you should listen to every line yourself.

**One narrator, not eleven.** Voice-design models invent a new speaker on every call, so
generating each line from a description gives every line a different voice, which is the
first thing a listener notices. The tool designs the narrator *once* from `narrator`,
keeps the most expressive of three candidates as `voice/reference/narrator.wav`, and
clones every line from it. The line's `emotion` steers the delivery; the timbre stays put.
To narrate in your own voice, record 20–30 s of natural speech as `narrator.wav` first.

**Takes are scored, not trusted.** Each line gets `--takes` generations (default 2), and
each take is checked:

| Check | Gate | Catches |
|---|---|---|
| accuracy | ≥ 0.90 | Dropped, repeated or invented words (Whisper transcribes the take back) |
| identity | ≥ 0.93 | A take that drifted into a different voice (speaker-verification similarity to the anchor) |
| pace | 1.8–3.6 w/s | Rushed or garbled reads |
| range | highest wins | Flat delivery (pitch spread, in semitones) |

A brand name the transcriber does not know ("Holt" heard as "whole") will fail accuracy
even when it was spoken correctly. The tool passes the brand name to Whisper as a hint,
which fixes most cases.

```bash
python ../tools/film-voice.py --lines 3 8     # re-roll two lines after listening
python ../tools/film-voice.py --pick 5:1      # keep take 1 for scene 5 instead
```

## Sound design

`film-template/public/sfx/` is a small synthesized kit: key clicks, whooshes, a lock
slam, a riser into a sub impact, pops, ticks and a shimmer. It's generated from noise and
sine partials by `tools/make-sfx.py`, so it carries no licence terms. Every scene type
fires its own cues on its own animation beats, and a soft whoosh sits under each scene
change, so adding or reordering scenes needs no sound editing.

The kit sits about 10 dB under the narration. It's texture, not a soundtrack; leave the
music to the final mix.

## Rendering and mixing music

`render-film.mjs` renders picture, narration and sound in one Remotion pass and masters
the result to −16 LUFS integrated, −1.5 dBTP, the common target for YouTube, LinkedIn
and X.

With `--stems` it also writes `out/voice.wav` and `out/sfx.wav` at raw mix level. To add
music: put voice and sfx back together, sit the music around −30 LUFS under them, duck it
a further ~6 dB while the narrator speaks, and master the sum once.

`--stills 5,30,60` renders single frames for checking layout without a full render.

## Limits

- **16:9 only.** Diagrams and side-by-side layouts need a wide canvas; a 9:16 cut of a film
  is a different edit, not a reflow. Use the ad formats for vertical.
- **Dark only.** The ambient glow, grain and vignette that stop a film reading as slides
  need a dark canvas. A light brand keeps its accent colour; the surface is forced dark.
- **English narration** is what the scoring is tuned for.
