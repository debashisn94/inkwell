# /inkwell

**Flat-cartoon video, entirely in code.**

`/inkwell` is an agent skill and toolkit for building narrated explainer video with
[Remotion](https://remotion.dev): mocap-driven 2D character rigs, hand-authored SVG
characters, synthetic narration that sounds unhurried, and captions timed to the word.

It is the extracted, generalised version of a pipeline that shipped a few dozen episodes.
Most of what is here is not code so much as the corrected answer to four problems that each
have an obvious solution that does not work.

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

Add `-g` to install globally; drop it to scope to the current project.

**No installer** — copy it:

```
rsync -a --exclude '.DS_Store' skills/inkwell/ ~/.claude/skills/inkwell/
```

This repo also exposes the skill at `.claude/skills/`, `.agents/skills/`, and
`.opencode/skills/` via symlinks, so agents that scan those paths find it with no config.

## What's actually in here

Four problems, and what turned out to be true about each:

**Characters that move like bodies.** Hand-keyed walk cycles look hand-keyed, and a 3D
pipeline is a different job with rigging and lighting attached. `bake-bvh.py` runs full
forward kinematics over a motion-capture clip, projects it to the sagittal plane, and reads
2D joint angles **off the bone vectors between world positions** rather than unpicking Euler
channel orders — which is what makes it work across skeletons instead of just one.

**Characters that don't look amateur.** Exact proportions, a facial grid, limb construction,
cel-shading placement, and rigging that survives large rotations. Every number was corrected
against a render rather than guessed. Two of the five listed amateur tells are a single
missing SVG attribute and hue-rotated shadows.

**Narration that doesn't sound rushed.** Pace gives synthetic voice away, not timbre. Most
models pick a speaking rate per chunk with no memory of the last one — an episode can jump
2.25 → 3.12 words/sec between consecutive sentences. A human reading the same script varied
by 67%; the model by 150%.

**Captions timed to the word.** The obvious implementation assigns transcribed words to
beats by clock time. It fails subtly: transcription places a chunk's first word slightly
*before* the nominal window start, so every beat donates its first word to its predecessor
and the mapping runs one word late for the whole video. Global Needleman-Wunsch alignment
over the full transcript, split afterwards by script word count.

## The pipeline

```
script.md
  → chunk.mjs         beat-aligned chunks.json
  → phonetics.mjs     respell tts_text only; on-screen text untouched
  → tts-queue.sh      one wav per chunk
  → pace-fix.mjs      normalise speaking rate toward a series target
  → finish-audio.mjs  stitch + master + exact beat timing
  → align-words.mjs   transcribe + align → per-word timestamps
  → render.mjs        bundle once, render many
  → qa.mjs            flag blank frames in the finished file
```

Order matters: `pace-fix` rewrites the chunk wavs that `finish-audio` stitches, and
`align-words` needs both the mastered audio and the exact timing.

Every tool reads `inkwell.config.json` from your project root. See `DEFAULTS` in
`tools/lib/config.mjs` for the full set of keys — paths, pace target, gap lengths, mastering
filter, QA threshold, render concurrency.

## Requirements

- Node.js 20+ and [Remotion](https://remotion.dev) (free for individuals and teams of ≤3)
- `ffmpeg` and `ffprobe` on `PATH`
- Python 3 — for `bake-bvh.py` (standard library only, no dependencies)
- A TTS engine, if you want synthetic narration. `tts-queue.sh` is written for
  [VoxCPM](https://github.com/OpenBMB/VoxCPM); swap the marked ENGINE block for another.
- A word-timestamp transcriber for captions — `mlx-whisper` on Apple Silicon by default.

The character and mocap halves need none of the audio tooling; the caption and voice halves
need none of the character tooling. Take either.

## Motion capture clips

The [CMU Graphics Lab Motion Capture Database](http://mocap.cs.cmu.edu/) is free for all
uses and has thousands of clips. Use the cgspeed BVH conversions — their joint names match
the `NAMES` map in `bake-bvh.py` as shipped. Retarget another skeleton by editing that map.

## What's in this repo

- `skills/inkwell/` — the skill and its four references
- `tools/` — the pipeline, all config-driven
- `.claude-plugin/` — plugin manifest and marketplace catalog
- `.claude/`, `.agents/`, `.opencode/` — symlinks for agent discovery

## License

MIT. The CMU mocap database has its own terms (free for all uses); Remotion is free for
individuals and organisations of three or fewer people and requires a company licence above
that.
