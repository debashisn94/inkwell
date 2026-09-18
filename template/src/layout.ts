// The aspect-ratio engine.
//
// One ad definition renders to every platform size. That is not letterboxing a 16:9 master
// -- a letterboxed reel wastes the top and bottom third of the most valuable surface on
// social, and platforms downrank it. Each format gets a real layout.
//
// Four rules do most of the work:
//
// 1. TYPE SCALES OFF THE SHORT EDGE. The most common mistake is sizing text as a fraction
//    of width. Do that and the same headline is enormous at 1920x1080 and unreadable at
//    1080x1920. The short edge is what your eye actually judges text size against.
//
// 2. SAFE AREAS ARE NOT DECORATIVE. On 9:16, platform chrome covers roughly the top 13%
//    (avatar, close button) and bottom 20% (caption, CTA, progress bar). Anything you put
//    there is either hidden or competing with a button. Landscape is nearly all usable.
//
// 3. STACK DIRECTION FLIPS. Portrait stacks vertically: media above, words below.
//    Landscape sits side by side. Forcing one arrangement into both wastes half the frame.
//
// 4. LINE LENGTH IS CAPPED IN CHARACTERS, NOT PIXELS. A headline that reads well at 9:16
//    runs to one long line at 16:9 unless you constrain the measure.
import { useVideoConfig } from 'remotion';

export type Shape = 'portrait' | 'square' | 'landscape';

export type Layout = {
  shape: Shape;
  width: number;
  height: number;
  u: number;                       // 1 unit = 1% of the short edge
  safe: { top: number; bottom: number; x: number };
  stack: 'row' | 'column';
  type: { kicker: number; headline: number; body: number; cta: number };
  gap: number;
  radius: number;
  maxMeasure: number;              // headline max-width, in px, from a character cap
  mediaFraction: number;           // how much of the frame the product shot may claim
};

export const shapeOf = (ar: number): Shape =>
  ar < 0.85 ? 'portrait' : ar <= 1.15 ? 'square' : 'landscape';

export const useLayout = (): Layout => {
  const { width, height } = useVideoConfig();
  const ar = width / height;
  const shape = shapeOf(ar);
  const u = Math.min(width, height) / 100;

  const safe =
    shape === 'portrait'
      ? { top: height * 0.13, bottom: height * 0.20, x: width * 0.075 }
      : shape === 'square'
        ? { top: height * 0.08, bottom: height * 0.10, x: width * 0.075 }
        : { top: height * 0.09, bottom: height * 0.10, x: width * 0.065 };

  // Headline sizes are tuned per shape: landscape has the least vertical room for text,
  // portrait the most, so the same words can afford to be bigger in a reel.
  const headline = (shape === 'landscape' ? 7.0 : shape === 'square' ? 8.0 : 8.8) * u;

  return {
    shape, width, height, u, safe,
    stack: shape === 'landscape' ? 'row' : 'column',
    type: {
      kicker: 2.5 * u,
      headline,
      body: 3.4 * u,
      cta: 4.0 * u,
    },
    gap: 3.2 * u,
    radius: 2.2 * u,
    // ~22 characters per line at headline size keeps the measure tight in every format
    maxMeasure: Math.min(width - safe.x * 2, headline * 0.55 * 22),
    mediaFraction: shape === 'landscape' ? 0.46 : shape === 'square' ? 0.44 : 0.40,
  };
};

// Content box: the region every scene is allowed to draw in.
export const contentBox = (l: Layout) => ({
  position: 'absolute' as const,
  left: l.safe.x,
  right: l.safe.x,
  top: l.safe.top,
  bottom: l.safe.bottom,
  width: l.width - l.safe.x * 2,
  height: l.height - l.safe.top - l.safe.bottom,
});
