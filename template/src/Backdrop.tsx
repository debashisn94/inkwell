// ONE backdrop for the whole ad, rendered once beneath every scene.
//
// It started as a per-scene layer and that was a structural bug, not a styling choice: each
// incoming scene painted its own opaque background on top of the outgoing one, so the
// moment a new Sequence began it instantly hid the previous scene -- overlap and staggered
// exits included. The result was a dead frame at every boundary, with the old scene masked
// and the new one not yet animated in. Worse than the cross-fade it replaced.
//
// Hoisting it out fixes that AND removes the last thing that reset between scenes. The
// background now drifts continuously across the entire ad, so the eye is never shown a
// discontinuity to read as "a new slide".
//
// It is also the last tier of the imagery cascade. Real product imagery is always better,
// but most sites publish exactly one usable asset, so a text scene would otherwise sit on
// flat black. Deriving this from the extracted accent keeps every scene on-brand without
// inventing product screenshots that do not exist.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { theme } from './theme';
import { Layout } from './layout';

const alpha = (hex: string, a: number) => {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},${a})`;
};

export const Backdrop: React.FC<{ l: Layout }> = ({ l }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = interpolate(frame, [0, durationInFrames], [0, 1], { extrapolateRight: 'clamp' });

  // The glow travels a long arc across the whole runtime rather than jumping per scene.
  const gx = 22 + 56 * (0.5 - 0.5 * Math.cos(t * Math.PI * 1.7));
  const gy = 26 + 48 * (0.5 - 0.5 * Math.cos(t * Math.PI * 1.15 + 0.7));
  // a slow continuous zoom on the whole field, so nothing is ever pinned
  const scale = 1.06 + 0.10 * t;

  return (
    <AbsoluteFill style={{ background: theme.surface, overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `scale(${scale})` }}>
        <AbsoluteFill style={{
          background: `radial-gradient(circle at ${gx}% ${gy}%, ${alpha(theme.accent, theme.dark ? 0.30 : 0.20)} 0%, transparent 56%)`,
        }} />
        <AbsoluteFill style={{
          background: `radial-gradient(circle at ${100 - gx}% ${100 - gy}%, ${alpha(theme.accent, theme.dark ? 0.12 : 0.08)} 0%, transparent 50%)`,
        }} />
        <AbsoluteFill style={{
          backgroundImage:
            `linear-gradient(${alpha(theme.ink, 0.05)} 1px, transparent 1px),` +
            `linear-gradient(90deg, ${alpha(theme.ink, 0.05)} 1px, transparent 1px)`,
          backgroundSize: `${8 * l.u}px ${8 * l.u}px`,
          maskImage: 'radial-gradient(circle at 50% 45%, black 18%, transparent 76%)',
          WebkitMaskImage: 'radial-gradient(circle at 50% 45%, black 18%, transparent 76%)',
        }} />
      </AbsoluteFill>
      <AbsoluteFill style={{
        background: `radial-gradient(ellipse at 50% 50%, transparent 46%, ${alpha(theme.surface, 0.72)} 100%)`,
      }} />
    </AbsoluteFill>
  );
};
