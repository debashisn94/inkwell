// Generated backdrop, built from the brand's own accent.
//
// This is the last tier of the imagery cascade. Real product imagery is always better, but
// most sites publish exactly one usable asset (an og:image) and render everything else in
// JavaScript, so a text scene would otherwise sit on flat black. A backdrop derived from
// the extracted accent keeps every scene on-brand without inventing product screenshots
// that do not exist, and without a stock-photo API key.
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

export const Backdrop: React.FC<{ l: Layout; seed?: number }> = ({ l, seed = 0 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  // a slow drift so the frame is never completely static under the text
  const t = interpolate(frame, [0, durationInFrames], [0, 1], { extrapolateRight: 'clamp' });

  const corners = [
    { x: 18, y: 16 }, { x: 82, y: 22 }, { x: 24, y: 78 }, { x: 76, y: 70 },
  ];
  const c = corners[seed % corners.length];
  const drift = 6 * t;

  return (
    <AbsoluteFill style={{ background: theme.surface, overflow: 'hidden' }}>
      {/* brand glow */}
      <AbsoluteFill style={{
        background: `radial-gradient(circle at ${c.x + drift}% ${c.y - drift}%, ${alpha(theme.accent, theme.dark ? 0.26 : 0.18)} 0%, transparent 58%)`,
      }} />
      {/* opposing cool fill keeps the glow from reading as a single flat wash */}
      <AbsoluteFill style={{
        background: `radial-gradient(circle at ${100 - c.x}% ${100 - c.y}%, ${alpha(theme.accent, theme.dark ? 0.10 : 0.07)} 0%, transparent 52%)`,
      }} />
      {/* fine grid, scaled off the short edge so density matches in every format */}
      <AbsoluteFill style={{
        backgroundImage:
          `linear-gradient(${alpha(theme.ink, 0.045)} 1px, transparent 1px),` +
          `linear-gradient(90deg, ${alpha(theme.ink, 0.045)} 1px, transparent 1px)`,
        backgroundSize: `${8 * l.u}px ${8 * l.u}px`,
        maskImage: 'radial-gradient(circle at 50% 45%, black 20%, transparent 78%)',
        WebkitMaskImage: 'radial-gradient(circle at 50% 45%, black 20%, transparent 78%)',
      }} />
      {/* vignette so text always has a floor of contrast */}
      <AbsoluteFill style={{
        background: `radial-gradient(ellipse at 50% 50%, transparent 45%, ${alpha(theme.surface, 0.75)} 100%)`,
      }} />
    </AbsoluteFill>
  );
};
