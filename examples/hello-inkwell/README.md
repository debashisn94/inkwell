# hello-inkwell

A minimal, runnable Remotion project that exercises the two halves of Inkwell that need no
API keys: a **mocap-driven character rig** and **word-timed captions**.

```bash
cd examples/hello-inkwell
npm install
npm run render      # -> out/Walk.mp4
npm run qa          # frame QA + contact sheet
npm run dev         # Remotion Studio, if you want to poke at it
```

`CHROME_PATH` may be needed if Remotion cannot download its own Chromium:

```bash
export CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

## What it shows

**`src/Character.tsx`** — a flat-cartoon character built to `references/svg-characters.md`:
tapered closed-path limbs, joint caps, `paint-order="stroke"`, a single non-black outline
ink, two tones per material, and the under-chin shadow. Rigged as nested groups so each
joint angle drives one transform.

It is drawn **in profile on purpose.** The baker flattens motion onto the sagittal plane, so
the swing it describes is forward-and-back. Drive a front-facing character with it and that
swing reads as limbs splaying sideways — the third gotcha in `references/mocap-rigs.md`, and
unmistakable once you have seen it.

**`src/Walk.tsx`** — samples the baked cycle against the frame clock, lerps between samples
through `shortestArc` so the ±180° seam takes the short way, and applies a **ground
constraint**: the baker emits joint angles but no root position, so the composition runs the
same 2D forward kinematics the rig uses, finds the lowest foot for the current pose, and
offsets the character so that foot rests on the ground line. Without it the character
floats and skates.

**`src/Captions.tsx`** — word-by-word reveal driven by a beat-words file.

## About the data

`src/data/walk-cycle.json` was produced by the baker from a CMU Graphics Lab clip:

```bash
python3 ../../tools/bake-bvh.py your-clip.bvh src/data/walk-cycle.json
```

`src/data/captions.json` and `timing.json` are **checked in by hand** so this example runs
with no TTS engine or transcriber installed. In a real project they are generated:

```bash
node ../../tools/chunk.mjs script.md audio/demo-chunks.json
../../tools/tts-queue.sh demo
node ../../tools/pace-fix.mjs demo
node ../../tools/finish-audio.mjs demo     # -> timing-demo.generated.json
node ../../tools/align-words.mjs demo      # -> beat-words-demo.generated.json
```

There is no audio track on the render for the same reason — the point here is the rig and
the caption timing, both of which are visible without sound.

## Credit

Motion data derived from the [CMU Graphics Lab Motion Capture
Database](http://mocap.cs.cmu.edu/), which is free for all uses.
