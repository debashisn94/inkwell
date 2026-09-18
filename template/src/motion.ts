// The motion layer.
//
// The failure this exists to prevent: animate every element once on entry, then hold. The
// result is a slide deck with cross-fades -- in a 5-second scene with a 1-second entrance,
// four fifths of the running time is a frozen frame, and the eye reads that as a
// presentation recording rather than a video.
//
// Three things fix it, and all three matter:
//   1. The camera NEVER stops. A slow push-in runs the full duration of every scene, so no
//      frame is identical to the one before it.
//   2. Text arrives as words, not as a block. Staggered words read as speech; a single
//      fading paragraph reads as a slide build.
//   3. Scenes push each other off screen. A cross-fade is the absence of a transition.
//
// Everything here is a pure function of `frame`, which is what keeps renders deterministic.
import { interpolate, spring } from 'remotion';

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

// Continuous camera. Alternating direction per scene stops a run of scenes from feeling
// like one long zoom, and the movement is deliberately small -- enough that the frame is
// never static, not enough to notice as an effect.
export const camera = (frame: number, duration: number, seed: number) => {
  const t = duration > 0 ? Math.min(1, frame / duration) : 0;
  const dir = seed % 2 === 0 ? 1 : -1;
  const zoomIn = Math.floor(seed / 2) % 2 === 0;
  const scale = zoomIn ? 1 + 0.052 * t : 1.052 - 0.052 * t;
  return {
    scale,
    x: dir * interpolate(t, [0, 1], [-0.9, 0.9]),   // percent of frame
    y: interpolate(t, [0, 1], [0.55, -0.55]) * (zoomIn ? 1 : -1),
  };
};

// Scene entrance and exit. The outgoing scene keeps moving as it leaves, which is what
// makes one scene feel like it pushed the last one out rather than dissolved into it.
export const sceneTransition = (frame: number, duration: number, fps: number) => {
  const IN = 16;
  const OUT = 13;
  const enter = spring({ frame, fps, config: { damping: 200, stiffness: 110, mass: 0.7 }, durationInFrames: IN });
  const exit = interpolate(frame, [duration - OUT, duration], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const e = easeOutCubic(exit);
  return {
    opacity: Math.min(enter, 1 - e),
    // enters from below, leaves upward -- a consistent vertical push
    y: interpolate(enter, [0, 1], [7, 0]) - e * 6,
    scale: interpolate(enter, [0, 1], [1.045, 1]) - e * 0.03,
  };
};

// Per-item entrance, staggered. Used for words, bullets, and anything in a list.
export const stagger = (frame: number, fps: number, index: number, delay = 0, per = 2.4) => {
  const s = spring({
    frame: frame - delay - index * per,
    fps,
    config: { damping: 18, mass: 0.52, stiffness: 120 },
  });
  return s;
};

// A number that counts up, so a stat is an event rather than a caption. Falls back to the
// original string whenever it is not purely numeric, so "₹49" and "300+" keep their shape.
export const countUp = (value: string, frame: number, fps: number, delay = 0, seconds = 1.1) => {
  const m = value.match(/^(\D*?)([\d,.]+)(\D*)$/);
  if (!m) return value;
  const [, pre, digits, post] = m;
  const target = Number(digits.replace(/,/g, ''));
  if (!Number.isFinite(target)) return value;
  const p = easeOutCubic(
    interpolate(frame, [delay, delay + seconds * fps], [0, 1], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    }),
  );
  const decimals = (digits.split('.')[1] || '').length;
  const now = target * p;
  const shown = decimals ? now.toFixed(decimals) : Math.round(now).toLocaleString('en-IN');
  return `${pre}${shown}${post}`;
};

// Slow continuous drift for background layers, at a different rate from the camera so the
// two never lock together into a single flat move.
export const parallax = (frame: number, duration: number, depth = 1) => {
  const t = duration > 0 ? frame / duration : 0;
  return {
    x: Math.sin(t * Math.PI * 0.8) * 1.6 * depth,
    y: Math.cos(t * Math.PI * 0.6) * 1.1 * depth,
  };
};
