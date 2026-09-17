# Word-accurate captions without hand-keying

The goal: each word of the voiceover appears on screen as it is spoken, and the last word
of a beat is readable before the scene cuts. Doing that by hand for a few hundred words per
episode is unthinkable; doing it badly is worse than not doing it.

## The pipeline

    script.md
      -> chunk.mjs        deterministic split into beats (chunks.json)
      -> phonetics.mjs    respell tts_text only; on-screen text untouched
      -> tts-queue.sh     one wav per chunk
      -> pace-fix.mjs     even out the model's per-chunk speaking rate
      -> finish-audio.mjs stitch + master + emit EXACT beat timing
      -> align-words.mjs  transcribe, align, emit per-word timestamps

Two files come out the far end: `timing-<id>.generated.json` (when each beat starts and how
long it runs) and `beat-words-<id>.generated.json` (when each word inside it lands).

## Timing must be constructed, not measured

`finish-audio.mjs` knows every duration it is concatenating, so it computes beat timings as
it builds the file rather than measuring them back off the finished master. That timing is
therefore exact by construction, which is what lets the alignment step trust the beat
windows later.

The detail that prevents drift: a beat runs until the **next** beat starts, so the pause
between two beats is owned by the outgoing one. Give each beat only its own speech and the
gaps fall through the cracks; over twelve beats that accumulates into visible desync.

## Align globally, then split -- never window by clock time

The obvious approach is: for each beat, take the transcribed words whose timestamps fall
inside the beat's window. **This is wrong and it fails subtly.** Whisper places the first
word of a chunk a few hundredths of a second *before* the nominal window start. So every
beat donates its first word to its predecessor, and the mapping runs one word late for the
entire video. The visible symptom is specific: a beat's final word inherits the timestamp of
the *next* beat's first word, so it pops in at or after the cut and is never readable.

What works instead:

1. Flatten the whole script into one word list, tagging each word with its beat.
2. Align that against the whole transcript in one pass, with **Needleman-Wunsch**.
3. Split back into beats by **script word count**, never by clock time.

Global alignment matters because a greedy left-to-right walk cannot recover from the things
transcription actually does: merging "five hundred" into "500", or hallucinating a repeated
phrase in the tail. A few hundred words per side makes the full DP matrix trivially cheap.

Words the transcript never matched get their timestamps interpolated between their nearest
matched neighbours, so a number the model rewrote still lands in roughly the right place.

## Guarantee the last word is readable

After splitting, clamp each beat's words so they stay monotonic and inside the beat window,
then walk **backwards** from the last word pulling it off the cut by `minTail` (0.45s is a
comfortable default), pushing earlier words back only as far as needed to keep `minStep`
(0.10s) between them. Walking forwards instead compounds the shift and drags the whole beat
early.

## Two traps

**A tool that reuses stale output and prints success.** If the aligner skips transcription
when the words file already exists, editing the script and re-running gives you cheerful
output computed from the previous take. Delete the words file when the audio changes, or
key its name on a hash of the master.

**A structural gate is worth more than it looks.** If your scene art is keyed on beat
numbers, a script edit that changes the beat count leaves art pointing at beats that no
longer exist -- and the render succeeds, silently missing scenes. Check that the set of
beats your art defines is exactly the set your chunks file contains, before rendering.
