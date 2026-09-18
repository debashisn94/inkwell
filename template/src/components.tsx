import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate, Img, staticFile } from 'remotion';
import { Layout } from './layout';
import { theme } from './theme';

// A single entrance primitive, used everywhere. Consistency of motion is most of what
// makes an ad feel authored rather than assembled.
export const useRise = (delayFrames = 0, distance = 28) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delayFrames, fps, config: { damping: 22, mass: 0.6 } });
  return {
    opacity: interpolate(s, [0, 1], [0, 1]),
    transform: `translateY(${interpolate(s, [0, 1], [distance, 0])}px)`,
  };
};

export const Kicker: React.FC<{ l: Layout; children: React.ReactNode; delay?: number }> =
  ({ l, children, delay = 0 }) => (
    <div style={{
      ...useRise(delay, 14),
      display: 'inline-flex', alignItems: 'center', gap: 0.9 * l.u,
      fontSize: l.type.kicker, letterSpacing: 0.22 * l.u, textTransform: 'uppercase',
      fontWeight: 700, color: theme.accent, fontFamily: theme.font,
    }}>
      <span style={{ width: 1.1 * l.u, height: 1.1 * l.u, borderRadius: 99, background: theme.accent }} />
      {children}
    </div>
  );

export const Headline: React.FC<{ l: Layout; children: React.ReactNode; delay?: number }> =
  ({ l, children, delay = 4 }) => (
    <h1 style={{
      ...useRise(delay),
      margin: 0, fontFamily: theme.font, color: theme.ink,
      fontSize: l.type.headline, lineHeight: 1.06, fontWeight: 800,
      letterSpacing: -0.035 * l.type.headline, maxWidth: l.maxMeasure,
    }}>{children}</h1>
  );

export const Body: React.FC<{ l: Layout; children: React.ReactNode; delay?: number }> =
  ({ l, children, delay = 10 }) => (
    <p style={{
      ...useRise(delay, 18),
      margin: 0, fontFamily: theme.font, color: theme.muted,
      fontSize: l.type.body, lineHeight: 1.42, maxWidth: l.maxMeasure * 1.05, fontWeight: 450,
    }}>{children}</p>
  );

// Product imagery, given a box that matches the asset's OWN aspect ratio.
//
// The tempting default -- a fixed-height box with object-fit:cover -- silently destroys
// the most common asset there is. An og:image is a 1.91:1 banner with the product name set
// across it; crop that into a portrait box and the wordmark loses both ends, so the ad
// leads with a headline sliced in half. Fitting the box to the image keeps banners intact,
// and the box is still capped so a tall asset cannot push the copy off-frame.
import brand from '../brand.json';

const arOf = (src: string): number | null => {
  const hit = (brand as any).assets?.find((a: any) => a.file === src || a.file?.endsWith(src.split('/').pop()));
  return hit?.ar ?? null;
};

export const Shot: React.FC<{ l: Layout; src: string; delay?: number; height?: number }> =
  ({ l, src, delay = 2, height }) => {
    const rise = useRise(delay, 26);
    const ar = arOf(src);
    const boxWidth = l.stack === 'row' ? l.width * 0.46 - l.safe.x : l.width - l.safe.x * 2;
    const cap = l.height * l.mediaFraction;
    const natural = ar ? boxWidth / ar : cap;
    return (
      <div style={{
        ...rise,
        width: '100%', height: height ?? Math.min(natural, cap),
        borderRadius: l.radius, overflow: 'hidden',
        border: `${Math.max(1, 0.12 * l.u)}px solid ${theme.hairline}`,
        boxShadow: `0 ${2.4 * l.u}px ${6 * l.u}px rgba(0,0,0,${theme.dark ? 0.55 : 0.18})`,
        background: theme.dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
      }}>
        <Img src={staticFile(src)} style={{ width: '100%', height: '100%', objectFit: ar ? 'contain' : 'cover' }} />
      </div>
    );
  };

export const Logo: React.FC<{ l: Layout; src?: string; name: string }> = ({ l, src, name }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 1.2 * l.u,
    fontFamily: theme.font, color: theme.ink, fontSize: 2.9 * l.u, fontWeight: 700,
    letterSpacing: 0.02 * l.u,
  }}>
    {src ? (
      <Img src={staticFile(src)} style={{ height: 4.2 * l.u, width: 4.2 * l.u, objectFit: 'contain', borderRadius: 0.8 * l.u }} />
    ) : null}
    {name}
  </div>
);
