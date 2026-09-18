# Customising

## Override the palette

In `ad.json`, merged over the extracted values:

```json
{ "palette": { "accent": "#8B5CF6", "surface": "#0B0D12", "ink": "#F5F6F8", "dark": true } }
```

`dark` decides light-on-dark vs dark-on-light and the backdrop's intensity. Text colour on
the CTA button is computed from `accent`'s luminance, so it stays readable automatically.

## Fonts

```json
{ "font": "\"Inter\", -apple-system, BlinkMacSystemFont, sans-serif" }
```

Only fonts available to the rendering browser will work. For a webfont, load it in
`template/src/index.ts` via Remotion's font APIs and reference the family here — a bare
family name that is not installed silently falls back, and you will not notice until you
compare two renders side by side.

## Add an aspect ratio

One entry in `FORMATS` in `template/src/Root.tsx`:

```ts
{ id: 'Link', width: 1200, height: 628, note: 'Link preview' },
```

Nothing else changes. The layout engine derives type scale, safe areas, stack direction and
measure from the dimensions.

## Change scene pacing

`seconds` per scene in `ad.json`. Two structural constants live in code:

- `OVERLAP` in `Ad.tsx` (16 frames) — how long consecutive scenes coexist. Lower it and the
  handoff sharpens; drop it to zero and you are back to hard cuts between slides.
- Per-element `enterAt` / `exitAt` in `scenes/index.tsx`, in frames relative to the scene.

## Write a new scene type

1. Add a variant to the `Scene` union in `template/src/scenes/index.tsx`.
2. Build the component. Wrap each element in `<Beat>` with its own `enterAt` / `exitAt` — if
   everything shares one timing, that scene will read as a slide even though the others do
   not.
3. Use `l` from `useLayout()` for every dimension. Any hardcoded pixel value breaks one
   aspect ratio and you will not notice until you render all four.
4. Dispatch it in `Ad.tsx`.

## Adjust the backdrop

`template/src/Backdrop.tsx`. It renders **once for the whole ad**, beneath every scene.

Keep it that way. Moving it back inside scenes means each incoming scene covers the outgoing
one the moment its Sequence starts, every staggered exit happens behind an opaque wall, and
each boundary becomes a dead frame.

## Use your own imagery

Drop files in `ad/public/assets/` and reference them as `assets/name.png`.

Add them to `brand.json`'s `assets` array with `width`, `height` and `ar` so `Shot` can fit
the box to the image. Without those it falls back to `cover` and may crop.
