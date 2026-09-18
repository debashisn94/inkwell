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
