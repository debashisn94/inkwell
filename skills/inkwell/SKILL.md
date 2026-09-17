---
name: inkwell
description: Build flat-cartoon explainer video entirely in code with Remotion — mocap-driven 2D character rigs, hand-authored SVG characters, synthetic narration that sounds unhurried, and word-accurate captions. Use when making an animated explainer, a narrated short, a character-driven reel, a walk cycle or character animation in SVG/CSS, when timing captions to a voiceover word by word, when synthetic narration sounds rushed or robotic, or when batch-rendering Remotion compositions.
license: MIT
---

# Inkwell

Flat-cartoon video, entirely in code. This skill covers four jobs that each have a
non-obvious right answer, plus the tools that do them.

Load only the reference you need.

## Animating a character

A character that walks, gestures, or shifts weight → read
[references/mocap-rigs.md](references/mocap-rigs.md).

Hand-keyed walk cycles look hand-keyed. `tools/bake-bvh.py` reduces a real motion-capture
clip to 2D joint angles a flat SVG rig can consume, so you get genuine weight shift without
a 3D pipeline. The reference covers where to get free clips, how to map the angles onto
nested SVG transforms, and the three mistakes that make the result look wrong (floating
characters, double-rotated ankles, splayed arms on a front view).

## Drawing the character

Authoring or fixing a flat-cartoon character in SVG → read
[references/svg-characters.md](references/svg-characters.md).

Exact proportions, a facial grid, limb construction, cel-shading placement, and the rigging
setup that survives large rotations. Every number was corrected against a render rather than
guessed. If a character looks amateur and you cannot say why, the five tells at the end of
that file are almost always the reason — `paint-order="stroke"` and hue-rotated shadows lead
the list.

## Narration

Recording or generating a voiceover, or fixing one that sounds rushed → read
[references/voice.md](references/voice.md).

Pace is what gives synthetic narration away, not timbre, because most models pick a speaking
rate per chunk with no memory of the last one. Covers normalising pace against a series
target, the `atempo` limits, choosing a voice-clone reference on pitch, and keeping the
spelling the model reads separate from the words the viewer sees.

## Captions

Timing captions to narration word by word → read
[references/caption-timing.md](references/caption-timing.md).

The whole pipeline, and the one mistake worth stating up front: **do not assign transcribed
words to beats by clock time.** Transcription places a chunk's first word slightly before the
nominal window start, so every beat donates its first word to its predecessor and the mapping
runs one word late for the entire video. Align globally against the full transcript, then
split by script word count.

## The tools

All read `inkwell.config.json` from the project root; see `DEFAULTS` in
`tools/lib/config.mjs` for every key.

| Tool | Does |
|---|---|
| `bake-bvh.py` | BVH mocap → 2D joint angles for one normalised stride |
| `chunk.mjs` | script.md → beat-aligned `chunks.json` |
| `phonetics.mjs` | respell `tts_text` only, never on-screen `text` |
| `tts-queue.sh` | sequential TTS batch (one process at a time, resumable) |
| `pace-fix.mjs` | normalise per-chunk speaking rate toward a series target |
| `finish-audio.mjs` | stitch + master + emit exact beat timing |
| `align-words.mjs` | transcribe and align → per-word timestamps |
| `qa.mjs` | flag blank/empty frames in a finished render |
| `render.mjs` | bundle once, render many; stills and single frames too |

Pipeline order matters: `chunk → phonetics → tts-queue → pace-fix → finish-audio →
align-words → render → qa`. `pace-fix` must run before `finish-audio` (it rewrites the
chunk wavs that get stitched), and `align-words` after it (it needs the mastered file and
the exact timing).

## Two rules that apply throughout

**Never verify a generated file from the tool's own success output.** Several tools here
skip work when an output already exists, which means a stale file and a cheerful log line
look identical. When the input changed, delete the output.

**Check structure before rendering, not after.** If scene art is keyed on beat numbers, a
script edit that changes the beat count leaves art pointing at beats that no longer exist —
and the render succeeds with scenes silently missing.
