# Character animation (optional extra)

Inkwell's main job is ad video from a product URL. This half of the repo is for the other
kind of video: narrated explainers with an animated character. It shares the render and QA
tooling and nothing else — skip it entirely unless a brief calls for a character.

- [characters-svg.md](characters-svg.md) — building a flat-cartoon character in SVG that
  does not look amateur. Exact proportions, a facial grid, limb construction, cel-shading
  placement, and rigging that survives large rotations.
- [mocap-rigs.md](mocap-rigs.md) — driving that character with real motion capture via
  `tools/bake-bvh.py`, plus the three mistakes that make the result look wrong.
- [caption-timing.md](caption-timing.md) — word-accurate captions against a voiceover.
- [voice.md](voice.md) — making synthetic narration sound unhurried.

A runnable demo lives in [`examples/hello-inkwell`](../../../examples/hello-inkwell).

Pipeline: `chunk → phonetics → tts-queue → pace-fix → finish-audio → align-words → render
→ qa`. Order matters — `pace-fix` rewrites the chunk wavs that `finish-audio` stitches, and
`align-words` needs both the mastered audio and the exact timing.
