// Persistent chrome: the one layer that never resets.
//
// Without it, every few seconds the entire frame is replaced by a different frame, which is
// the definition of a slide deck no matter how the replacement is animated. A brand mark and
// a progress rail that live for the whole ad give the eye something continuous to hold, so
// each scene reads as the same film moving on rather than a new slide arriving.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Img, staticFile } from 'remotion';
import { Layout } from './layout';
import { theme } from './theme';

export const Chrome: React.FC<{ l: Layout; logo?: string; name: string }> = ({ l, logo, name }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const p = interpolate(frame, [0, durationInFrames], [0, 1], { extrapolateRight: 'clamp' });
  // chrome is up almost immediately so frame 0 is branded
  const intro = interpolate(frame, [0, 6], [0.35, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const inset = l.safe.x;
  const barY = l.shape === 'portrait' ? l.height - l.safe.bottom * 0.52 : l.height - l.safe.bottom * 0.45;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {/* brand mark, top-left, present the entire ad */}
      <div style={{
        position: 'absolute', left: inset, top: l.safe.top * 0.42,
        display: 'flex', alignItems: 'center', gap: 0.9 * l.u,
        opacity: intro * 0.92,
      }}>
        {logo ? (
          <Img src={staticFile(logo)} style={{
            height: 3.1 * l.u, width: 3.1 * l.u, objectFit: 'contain', borderRadius: 0.6 * l.u,
          }} />
        ) : null}
        <span style={{
          fontFamily: theme.font, color: theme.ink, fontSize: 2.1 * l.u,
          fontWeight: 700, letterSpacing: 0.04 * l.u,
        }}>{name}</span>
      </div>

      {/* progress rail — the clearest signal that this is one continuous piece */}
      <div style={{
        position: 'absolute', left: inset, right: inset, top: barY,
        height: 0.28 * l.u, borderRadius: 99, background: theme.hairline, opacity: intro,
      }}>
        <div style={{
          width: `${p * 100}%`, height: '100%', borderRadius: 99, background: theme.accent,
        }} />
      </div>
    </AbsoluteFill>
  );
};
