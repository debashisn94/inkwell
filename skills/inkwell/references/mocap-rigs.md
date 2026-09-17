# Driving a 2D character with real motion capture

Hand-keyed walk cycles look hand-keyed. Real mocap carries weight shift, asymmetry, and
the small corrections a body makes to stay balanced -- none of which you will think to
animate. `tools/bake-bvh.py` strips a BVH clip down to the handful of numbers a flat 2D
rig actually needs, so you get that motion without a 3D pipeline.

## Why 2D at all

A full 3D render of a stylized character is enormously more expensive than drawing the
same character as SVG and rotating groups. On a laptop, a 2D-in-code character renders in
the tens of frames per second; the equivalent 3D scene is not a slower version of the same
job, it is a different job with rigging, lighting, and materials attached. If the camera
never leaves a side or three-quarter view -- which for explainer video it usually does not
-- the 3D is paying for freedom you never spend.

## Getting a clip

The CMU Graphics Lab Motion Capture Database (`mocap.cs.cmu.edu`) is free for all uses and
has thousands of clips. Use the cgspeed BVH conversions -- the joint names match the
`NAMES` map in the baker as shipped. Subject 08 is walks; 07 is more walks; 09 is runs.

## What the baker does

    python3 tools/bake-bvh.py walk.bvh src/rig/walk-cycle.generated.json

1. Full 3D forward kinematics over the skeleton hierarchy -> world position of every joint.
2. Work out the direction the hips actually travelled across the clip; call that forward.
3. Project every joint onto that plane, giving a clean sagittal (side-on) view.
4. Read angles off the **bone vectors between positions**, never off the Euler channels.
5. Autocorrelate the thigh-swing signal to find one stride, and resample it to 24 samples.

Step 4 is the one that matters. BVH files declare their own rotation channel order, and
different exporters disagree; unpicking that correctly for every skeleton is a rabbit hole.
Positions have no such ambiguity. Reading the angle between two world positions gives the
same answer regardless of how the file chose to encode the rotation that produced it. Only
the joint NAME map is skeleton-specific -- retarget by editing the right-hand side.

## What you get

```json
{ "source": "walk.bvh", "samples": 24, "strideSeconds": 1.0083,
  "bob": [0.0, 0.41, ...],
  "cycle": [ { "hipR": 61.2, "knR": 18.4, "ankR": -4.1, "hipL": ..., "shR": ...,
               "lean": 2.1, "headTilt": -1.3 }, ... ] }
```

`cycle` is one stride as 24 samples of joint angles in degrees. `bob` is the hip rise and
fall per sample. `strideSeconds` is how long one stride took in the source clip.

## Using it

Loop the cycle against your frame clock and lerp between samples:

```js
const t = (frame / fps) / cycle.strideSeconds;      // strides elapsed
const f = (t % 1) * cycle.samples;                  // fractional sample index
const [a, b] = [Math.floor(f) % cycle.samples, Math.ceil(f) % cycle.samples];
const k = f - Math.floor(f);
const ang = (j) => cycle.cycle[a][j] + shortestArc(cycle.cycle[b][j] - cycle.cycle[a][j]) * k;
```

`shortestArc` wraps a difference into (-180, 180] so interpolating across the +180/-180
seam takes the short way round. The baker already wraps the stored values, but you need the
same wrap at lerp time.

Map each angle onto the nested-group transforms from the SVG playbook: `hipR` rotates the
upper leg group, `knR` the shin group nested inside it, `ankR` the foot inside that. Apply
`bob` as a vertical translate on the whole character, and `lean` on the torso group.

## Three things that will look wrong

**No ground constraint = a floating character.** The baker emits joint angles, not a root
position. Nothing in the data pins the feet to the floor. Work out the lowest foot position
per sample yourself and offset the character so it rests on your ground line; otherwise it
will drift and skate.

**The ankle is relative to the shin, not the world.** `ankR` is stored as an angle measured
against the parent bone, matching how you will nest the transform groups. Treating it as a
world angle gives you a foot that rotates twice as far as it should and clips through the leg.

**A front-view rig plays a side-view walk with splayed arms.** The baker flattens the motion
onto the sagittal plane. If your character is drawn facing the viewer, its arms swing
forward and back in a plane you are looking down, so they read as splaying outward instead.
Either draw the character in profile or three-quarter, or give the rig a `spread` parameter
that scales the arm swing down and adds a small lateral component for the front view.
