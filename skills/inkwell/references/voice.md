# Making synthetic narration sound unhurried

## Pace is the tell, not timbre

Neural TTS clones timbre well enough that listeners stop noticing it. What they keep
noticing is pace, because most models choose a speaking rate **per chunk, with no memory of
the previous one**. An episode can jump from 2.25 to 3.12 words per second between
consecutive sentences. The listener does not think "that was 39% faster" -- they think the
first statement rushed and the second dragged.

Measured against a human reading the same script: a person varies pace by about 67% across
an episode; the model varied by about 150%. People vary a lot. Models hit extremes people
never do.

`pace-fix.mjs` measures words-per-second per chunk and pulls the outliers toward a target
with ffmpeg's `atempo`. The variation that survives is the natural kind.

**Target the series pace, not the episode's own median.** Normalising to the episode's own
median only evens it out internally -- it cannot detect an episode that is uniformly rushed,
which is exactly the failure that ships. Pick one number for the whole series (2.65 w/s at
chunk level, before gaps are inserted, is a calm explainer pace) and hold every episode to it.

## Three things that cost a render pass to learn

**`atempo` is only clean over a narrow range.** It accepts 0.5-2.0 per instance and gets
grainy on speech past about 0.8. Anything steeper should be split across two gentler stages
(`atempo=sqrt(f),atempo=sqrt(f)`). Clamp the total to roughly 0.70-1.35.

**Keep the sample format identical.** If a later step concatenates raw streams, a chunk
re-encoded to a different format silently becomes noise rather than failing loudly. Pin
`pcm_s16le` and the sample rate on every intermediate write.

**Always re-stretch from a pristine source.** Keep the untouched originals in a `_prepace/`
directory and stretch from those every time. Stretching an already-stretched file compounds
the artefacts, and you will not hear it until it is bad.

## Pick the reference clip on pitch

For voice cloning, record 20-30 seconds of your natural speech and A/B candidates on pitch
above all else. A reference sitting even one or two semitones below your real speaking pitch
is the usual reason a clone *nearly* sounds like you and never quite does. Use lowest
aperiodicity to break ties.

## Respell for the voice, not for the viewer

Keep two fields per chunk: `text` (what appears on screen) and `tts_text` (what the model
reads). `phonetics.mjs` only ever edits the second. This lets you spell a word wrong for the
model -- spacing out an acronym so it is not read as a word, or respelling a name the model
mangles -- without that ever reaching the viewer. Add entries by ear as you hit them.

## Anchor anything you repeat every episode

A sign-off spoken at the end of every episode gets re-rolled by the model on every build, so
a bad take lands at random. Across one 36-episode series the model produced "Link in air",
"Link in beer", and a sentence broken in the wrong place -- each shipped because nobody
re-listens to the line they have already heard thirty times. Record one vetted take and
substitute it by exact text match. Point `signoff` in the config at it.

## Batch position changes the output

At least one model hallucinates as a function of **position in the batch**, not of the
sentence itself: a line that comes out garbled in a long run comes out perfect when
generated on its own. If one chunk is reliably wrong, regenerate it alone before you start
rewriting the sentence.
