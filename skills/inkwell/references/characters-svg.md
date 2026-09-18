# SVG Character Playbook

Hand-authored flat-cartoon characters that hold up at video resolution. Every rule here was
derived by generating a test character, rendering it in headless Chrome (four arm poses, a
joint-cap test, a rim-light test), looking at the output, and correcting the rule that was
wrong. The numbers are the corrected ones.

Proportions below are written for an 11-year-old character on an 800x1000 canvas. Scale the
ratios, not the absolute units, for other ages and canvases.

## A. Construction rules

### Canvas & proportion
1. Canvas `viewBox="0 0 800 1000"`, character y=48→940, center `CX=400`. 1 unit ≈ 1 px at ~1010px render height.
2. Head-to-body **3.1 for an 11-year-old** (head 286 tall of 892 body). 2.5 = toddler, 4+ = teen. Head width = 0.86 × head height.
3. Facial grid (fractions of head height, top=0 chin=1.0): brow 0.47 · **eye line 0.58** · ear top 0.55 · nose 0.72 · mouth 0.81. Eye line too high = "adult in kid's body".
4. Eyes: radius `R = 0.082 × HH`; centers at `CX ± 0.195 × HH`. Sclera ry = 1.12R (taller than wide). Iris 0.74R offset **+3,+3**; pupil 0.42R offset +3,+4; catchlight 0.26R at **(−6,−8)** (opposite iris offset); second catchlight 0.12R at (+12,+10) op .85. Upper lash arc at 1.6×LF — biggest single "not amateur" fix.
5. Limbs = **closed tapered paths, never round-capped strokes**. Upper arm half-width 44→34 over 194; forearm 33→25 over 160; hand ellipse 34×39; leg 48→38 over 240. Taper ≥20%, lateral bow 5–8 units:
   ```js
   const limb = (w0, w1, L, bow = 8) =>
     `M ${-w0} 0 Q 0 ${-w0*0.55} ${w0} 0 Q ${w1+bow} ${L*0.55} ${w1} ${L} ` +
     `Q 0 ${L+w1*0.5} ${-w1} ${L} Q ${-w0+bow} ${L*0.5} ${-w0} 0 Z`;
   ```

### Line art
6. Outline **13 units for an 892-tall character (1.45% of height)**. Tiers: LW 13 silhouettes · LI 8 interior (collar/cuffs/hair strokes) · LF 5.5 facial (×1.6 for brows/lashes).
7. One outline colour for the whole character, **never #000** → `#2E1D14` on the root `<g>`, inherited.
8. Root `<g>`: `stroke-linejoin="round" stroke-linecap="round"` **`paint-order="stroke"`** — the most important attribute; default straddled strokes eat 6.5px off every edge and swallow thin features.

### Colour
9. **Shadows = mix toward ONE shadow ink, never HSL hue-rotation** (hue-rotate blew out to neon on saturated bases in testing):
   ```js
   const SHADOW_INK = '#2E2A63'; const LIGHT_INK = '#FFF2D2';
   sh = (c, t=0.22) => mix(c, SHADOW_INK, t);  hi = (c, t=0.18) => mix(c, LIGHT_INK, t);
   ```
   Ratios: skin 0.20 · sweater 0.30 · shirt 0.16 · dark bases (<L35%): use ink `#14122E` or multiply RGB ×0.80.
10. **Exactly two tones per material** (base + shadow). Highlight only on sweater + one cheek strip.
11. Blush: ellipse 32×15 at head fraction 0.70, x = ±(eye offset + 26), opacity 0.40, no stroke.

### Cel shading placement
12. Cut every shadow with `clipPath` reusing the fill's exact path; draw oversized sloppy shadow shapes; `stroke="none"` on the shadow group.
13. The five mandatory shadows: ① face terminator crescent hugging the shadow-side edge (never a straight slab) ② hair-cast band on forehead ③ **under-chin ellipse 104×36 at chin+16 (non-negotiable — without it the head floats)** ④ chest shadow under the head ⑤ sweater hem band. Per-limb: one longitudinal strip (~40% width) + one elbow fold at op .55.
14. Hair = one silhouette mass (parting cut as concave notch) + **exactly two** interior highlight strokes at LI.

### SVG craft
15. Primitives: ellipse (skull/eyes/hands), circle (pupils/joint caps), path (everything with character). **Never `<rect>` on a body.**
16. `Q` over `C`. Control point = chord midpoint displaced perpendicular by 0.25–0.35 × chord length.
17. Mirror sleeves/shoes with `transform="translate(800,0) scale(-1,1)"` — but **never mirror the face**; hand-offset eyes/brows/mouth by 3–8 units.
18. Ground shadow on black must be **light**: `<ellipse rx=190 ry=26 fill="#8FA8FF" opacity=".07"/>` (+ inner rx=120 @ .07). A dark shadow on black renders as nothing.
19. Gradients ≤1, **filters = 0** (feGaussianBlur/feDropShadow re-rasterize every Remotion frame).
20. On pure black: darkest fill above **L20%**; hair lifted to `#33261C` (L15%) minimum or the crown dissolves.

### Rigging
21. Pivot = nested groups: outer `rotate(a cx cy)` in world coords, inner `translate(cx cy)` making the joint the local origin. Chain elbow inside upper arm (`translate(0 194) rotate(b)`), wrist inside forearm (`translate(0 172)`). **No CSS transform-origin** (viewport-relative in SVG).
22. **Joint cap disc** as FIRST child of each segment group (r = top half-width: 44 shoulder, 33 elbow) or rotations >60° show seams.
23. Joint priority for an explainer character: ① mouth (swap 3–4 paths, don't rotate a jaw) ② eyelids ③ brows (ty ±10, rot ±8°) ④ neck ±8° ⑤ shoulder −105°…+30° ⑥ elbow −75°…+10° ⑦ wrist ±20° ⑧ torso lean ±5°.
24. Gotchas: limb shadows rotate with the limb (fine under 40°, counter-rotate beyond); squash-scale needs `vector-effect="non-scaling-stroke"`.

### Layer order (back → front)
`ground shadow → far arm → far leg → near leg → neck → torso → collar → near arm → head`

## C. 10-point self-audit
1 silhouette readable filled solid · 2 head ratio 3.0–3.3 · 3 eye line 0.55–0.60 · 4 every shadow hugs a form · 5 under-chin shadow exists · 6 pupils off-center + catchlights same side · 7 limbs taper ≥20% · 8 darkest fill above L20% (hair ≥L15%) · 9 pose sheet −105/−58/−13/+24° no seams · 10 <150 paths, zero filters.

## D. Five amateur tells and fixes
1. HSL hue-rotation shadows → mix toward one shadow ink.
2. Missing `paint-order="stroke"` → deflated, mushy edges.
3. Pure-black outlines/hair → `#2E1D14` outline, hair ≥ `#33261C`.
4. Constant-width tube limbs → tapered bowed closed paths.
5. Centered pupils / mirrored face / no lash line → offsets + lash arc + hand-drawn asymmetry.

## A worked palette

One complete set of values that satisfies every rule above, as a starting point to depart from:

skin `#EB944E` (shadow `#C57F52`) · sweater cobalt `#2149C1` (shadow `#1D3995`, highlight `#4061C9`) ·
trousers `#333B44` · hair `#33261C` (highlight `#5A4530`) · shirt `#F4F6FA` · outline `#2E1D14`.

Sample a palette from reference art rather than picking swatches by hand, and run a median
filter over the sampled region -- raw pixel picks land on anti-aliased edges and read muddy.
