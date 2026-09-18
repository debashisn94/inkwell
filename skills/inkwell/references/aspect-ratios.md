# One ad, every aspect ratio

A platform-native ad is not a 16:9 master with bars added. A letterboxed reel throws away
the top and bottom third of the most valuable surface in social, and the platforms rank it
accordingly. Inkwell renders four real layouts from one definition.

| Id | Size | Ratio | Where |
|---|---|---|---|
| `Reel` | 1080×1920 | 9:16 | Reels · Shorts · TikTok · Stories |
| `Feed` | 1080×1350 | 4:5 | Instagram / Facebook feed |
| `Square` | 1080×1080 | 1:1 | Feed · LinkedIn |
| `Wide` | 1920×1080 | 16:9 | YouTube · LinkedIn · X · pre-roll |

## The four rules in `layout.ts`

**1. Type scales off the SHORT edge.** The common mistake is sizing text as a fraction of
width. Do that and one headline is enormous at 1920×1080 and unreadable at 1080×1920,
because width changes by 78% between them while the thing your eye judges text against does
not. Everything here is expressed in `u`, one percent of the short edge.

The headline still differs per shape, deliberately: 8.8u portrait, 8.0u square, 7.0u
landscape. Landscape has the least vertical room, so the same words must take less of it.

**2. Safe areas are not decorative.** On 9:16 the platform covers roughly the top 13% with
an avatar and close button, and the bottom 20% with the caption, the CTA and a progress
bar. Anything placed there is hidden or competing with a button. Landscape is nearly all
usable, so it reserves far less. A reel that looks bottom-empty in a preview is correct —
that space belongs to the platform.

**3. Stack direction flips.** Portrait stacks media over words. Landscape sets them side by
side, media at 46%. Forcing one arrangement into both wastes half the frame.

The related case is easy to miss: **a landscape scene with no media**. A left-aligned column
in a 1920-wide frame leaves the right half empty and reads as a bug rather than a choice, so
those scenes centre instead. But the block centres while any bullet list inside it stays
flush left — centred bullets strand the dots away from ragged text.

**4. Line length is capped in characters, not pixels.** A headline that sets to three tidy
lines at 9:16 runs to one long line at 16:9 unless the measure is constrained. `maxMeasure`
caps it at roughly 22 characters at headline size.

## Assets keep their own aspect ratio

The most common asset on the web is an `og:image`, and it is a 1.91:1 banner — usually with
the product name set across it. Dropping that into a portrait box with `object-fit: cover`
crops the wordmark off both ends, so the ad opens on a headline sliced in half. It looks
broken, not cropped.

The research step measures every asset with `ffprobe` and records its ratio, and the `Shot`
component gives each image a box matching its own shape, capped so a tall asset cannot push
the copy off-frame.

## Adding a format

Add an entry to `FORMATS` in `src/Root.tsx`. Nothing else needs to change — the layout
engine derives everything from the dimensions. 1200×628 for a link preview or 2560×1440 for
a YouTube masthead both work without new code.

## Motion

A separate concern from layout, and the one that decides whether the output reads as a
video at all. See `template/src/motion.ts`.

The failure mode is easy to fall into: animate each element once on entry, then hold. In a
five-second scene with a one-second entrance, four fifths of the running time is a frozen
frame. Measured on a first cut, **56% of the ad was a still image**. `ffmpeg`'s
`freezedetect` filter will tell you this in one command and is worth running on every cut:

```bash
ffmpeg -i out/Reel.mp4 -vf "freezedetect=n=-58dB:d=0.7" -f null -
```

Four things take it to zero:

**The camera never stops.** A slow push-in runs the full duration of every scene, so no
frame equals the one before it. Direction alternates per scene, otherwise a run of scenes
becomes one long zoom.

**Text arrives as words, not blocks.** Staggered words carry a rhythm the eye follows like
speech. A paragraph fading in as one unit is a slide build, and reads as one.

**Scenes push each other off.** A cross-fade is the absence of a transition. Scenes enter
from below and leave upward *while still moving*, and consecutive scenes overlap by a few
frames so there is no dead frame at the boundary.

**Nothing final is static.** Numbers count up rather than appearing. The CTA button
breathes — it is the last thing on screen and the only thing you want acted on.

### Keep per-word animation cheap

Animating a dozen words individually is fine. Giving each one `will-change` and a `blur()`
filter is not: both promote every word to its own compositor layer, Chrome runs out of
compositing memory, and it **silently drops layers** — whole words fail to paint on some
frames while neighbouring frames are correct. It presents as a timing bug in the stagger,
which is the wrong place to look.

Per-word animation should use `transform` and `opacity` only, with no `will-change`, and
let the browser decide what to promote. Reserve `will-change` for the one element per scene
that genuinely moves every frame: the camera.
