import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, Img, staticFile } from 'remotion';
import { Layout } from './layout';
import { theme } from './theme';
import { stagger, camera, parallax } from './motion';
import brand from '../brand.json';

// Single-element entrance. Kept for small items; anything with words uses <Words>.
export const useRise = (delayFrames = 0, distance = 28) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = stagger(frame, fps, 0, delayFrames);
  return {
    opacity: interpolate(s, [0, 1], [0, 1]),
    transform: `translateY(${interpolate(s, [0, 1], [distance, 0])}px)`,
  };
};

// Text that arrives word by word. This is the single biggest difference between something
// that reads as a video and something that reads as a slide: a paragraph that fades in as
// one block is a build, whereas staggered words carry a rhythm the eye follows like speech.
export const Words: React.FC<{
  text: string; l: Layout; delay?: number; per?: number; style?: React.CSSProperties; lift?: number;
}> = ({ text, l, delay = 0, per = 2.4, style, lift = 0.9 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <span style={style}>
      {text.split(/\s+/).filter(Boolean).map((w, i) => {
        const s = stagger(frame, fps, i, delay, per);
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              marginRight: '0.26em',
              opacity: s,
              // Scale, not blur, and NO will-change.
              //
              // Both were here and both had to go. A headline plus a sub-line is a dozen
              // words, each promoted to its own compositor layer by will-change and each
              // carrying a blur filter that forces another. Chrome runs out of compositing
              // memory and silently DROPS layers -- whole words simply do not paint on
              // some frames. It looks like a timing bug in the stagger, which is where you
              // will waste your afternoon. Per-word animation must stay cheap: transform
              // and opacity only, and let the browser decide what to promote.
              transform: `translateY(${(1 - s) * lift * l.u * 2.4}px) scale(${0.94 + 0.06 * s})`,
            }}
          >
            {w}
          </span>
        );
      })}
    </span>
  );
};

export const Kicker: React.FC<{ l: Layout; children: React.ReactNode; delay?: number }> =
  ({ l, children, delay = 0 }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const s = stagger(frame, fps, 0, delay);
    // the rule draws outward, so the kicker builds rather than appears
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 0.9 * l.u,
        fontSize: l.type.kicker, letterSpacing: 0.22 * l.u, textTransform: 'uppercase',
        fontWeight: 700, color: theme.accent, fontFamily: theme.font,
        opacity: s,
      }}>
        <span style={{
          width: interpolate(s, [0, 1], [0, 3.4 * l.u]), height: 0.36 * l.u,
          borderRadius: 99, background: theme.accent, flex: 'none',
        }} />
        <span style={{ transform: `translateX(${(1 - s) * -1.2 * l.u}px)`, display: 'inline-block' }}>
          {children}
        </span>
      </div>
    );
  };

export const Headline: React.FC<{ l: Layout; children: string; delay?: number }> =
  ({ l, children, delay = 3 }) => (
    <h1 style={{
      margin: 0, fontFamily: theme.font, color: theme.ink,
      fontSize: l.type.headline, lineHeight: 1.06, fontWeight: 800,
      letterSpacing: -0.035 * l.type.headline, maxWidth: l.maxMeasure,
    }}>
      <Words text={children} l={l} delay={delay} per={2.6} lift={1.4} />
    </h1>
  );

export const Body: React.FC<{ l: Layout; children: string; delay?: number }> =
  ({ l, children, delay = 12 }) => (
    <p style={{
      margin: 0, fontFamily: theme.font, color: theme.muted,
      fontSize: l.type.body, lineHeight: 1.42, maxWidth: l.maxMeasure * 1.05, fontWeight: 450,
    }}>
      <Words text={children} l={l} delay={delay} per={1.15} lift={0.6} />
    </p>
  );

const arOf = (src: string): number | null => {
  const hit = (brand as any).assets?.find(
    (a: any) => a.file === src || a.file?.endsWith(src.split('/').pop()),
  );
  return hit?.ar ?? null;
};

// Product imagery, given a box that matches the asset's OWN aspect ratio.
//
// The tempting default -- a fixed-height box with object-fit:cover -- silently destroys the
// most common asset there is. An og:image is a 1.91:1 banner with the product name set
// across it; crop that into a portrait box and the wordmark loses both ends, so the ad
// leads with a headline sliced in half.
//
// The image also moves independently of the scene camera. Matching speeds would flatten
// the frame into a single pan; a slower drift inside the frame gives it depth.
export const Shot: React.FC<{ l: Layout; src: string; delay?: number; height?: number }> =
  ({ l, src, delay = 2, height }) => {
    const frame = useCurrentFrame();
    const { fps, durationInFrames } = useVideoConfig();
    const s = stagger(frame, fps, 0, delay);
    const ar = arOf(src);
    const boxWidth = l.stack === 'row' ? l.width * 0.46 - l.safe.x : l.width - l.safe.x * 2;
    const cap = l.height * l.mediaFraction;
    const natural = ar ? boxWidth / ar : cap;
    const p = parallax(frame, durationInFrames, 1);
    const inner = 1 + 0.06 * Math.min(1, frame / Math.max(1, durationInFrames));

    return (
      <div style={{
        opacity: s,
        transform: `translateY(${(1 - s) * 3 * l.u}px) scale(${interpolate(s, [0, 1], [0.965, 1])})`,
        width: '100%', height: height ?? Math.min(natural, cap),
        borderRadius: l.radius, overflow: 'hidden',
        border: `${Math.max(1, 0.12 * l.u)}px solid ${theme.hairline}`,
        boxShadow: `0 ${2.4 * l.u}px ${6 * l.u}px rgba(0,0,0,${theme.dark ? 0.55 : 0.18})`,
        background: theme.dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
        willChange: 'transform',
      }}>
        <Img
          src={staticFile(src)}
          style={{
            width: '100%', height: '100%',
            objectFit: ar ? 'contain' : 'cover',
            transform: `scale(${inner}) translate(${p.x * 0.4}%, ${p.y * 0.4}%)`,
          }}
        />
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

// Scene camera wrapper. Applied once per scene so every layer inside shares one move.
export const Camera: React.FC<{ seed: number; children: React.ReactNode }> = ({ seed, children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const c = camera(frame, durationInFrames, seed);
  return (
    <div style={{
      position: 'absolute', inset: 0,
      transform: `scale(${c.scale}) translate(${c.x}%, ${c.y}%)`,
      willChange: 'transform',
    }}>
      {children}
    </div>
  );
};
