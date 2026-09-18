// Scene types. Each one lays itself out differently per shape -- that is the whole point
// of the ratio engine. Portrait stacks media over words; landscape sets them side by side.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Layout, contentBox } from '../layout';
import { theme } from '../theme';
import { Kicker, Headline, Body, Shot, Logo, useRise, Camera, Words } from '../components';
import { countUp, stagger } from '../motion';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { Backdrop } from '../Backdrop';

export type Scene =
  | { type: 'hook'; seconds: number; kicker?: string; headline: string; sub?: string; shot?: string }
  | { type: 'feature'; seconds: number; kicker?: string; headline: string; bullets?: string[]; shot?: string }
  | { type: 'proof'; seconds: number; quote: string; attrib?: string; stat?: string; statLabel?: string }
  | { type: 'cta'; seconds: number; headline: string; action: string; url?: string; shot?: string };

const Stage: React.FC<{ l: Layout; children: React.ReactNode; seed?: number; center?: boolean }> =
  ({ l, children, seed = 0, center = false }) => (
    <AbsoluteFill>
      <Camera seed={seed}>
        <Backdrop l={l} seed={seed} />
      </Camera>
      <div style={{
        ...contentBox(l),
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        alignItems: center ? 'center' : 'stretch',
        textAlign: center ? 'center' : 'left',
      }}>
        {children}
      </div>
    </AbsoluteFill>
  );

// Media + words, arranged by shape. This single helper is what makes one ad definition
// work at 9:16 and 16:9 without either one looking like an afterthought.
const Split: React.FC<{ l: Layout; media?: React.ReactNode; children: React.ReactNode }> =
  ({ l, media, children }) => {
    // No media in a wide frame: a left-aligned column leaves the right half empty, which
    // reads as a broken layout rather than a deliberate one. Centre and let it breathe.
    if (!media) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: l.gap, justifyContent: 'center',
          height: '100%',
          alignItems: l.stack === 'row' ? 'center' : 'stretch',
          textAlign: l.stack === 'row' ? 'center' : 'left',
        }}>{children}</div>
      );
    }
    if (l.stack === 'row') {
      return (
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: l.gap * 1.4, height: '100%' }}>
          <div style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', gap: l.gap, justifyContent: 'center' }}>
            {children}
          </div>
          <div style={{ flex: '0 0 46%' }}>{media}</div>
        </div>
      );
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: l.gap * 1.2, justifyContent: 'center', height: '100%' }}>
        {media}
        <div style={{ display: 'flex', flexDirection: 'column', gap: l.gap }}>{children}</div>
      </div>
    );
  };

export const HookScene: React.FC<{ l: Layout; s: Extract<Scene, { type: 'hook' }> }> = ({ l, s }) => (
  <Stage l={l} seed={0}>
    <Split l={l} media={s.shot ? <Shot l={l} src={s.shot} /> : undefined}>
      {s.kicker ? <Kicker l={l}>{s.kicker}</Kicker> : null}
      <Headline l={l}>{s.headline}</Headline>
      {s.sub ? <Body l={l}>{s.sub}</Body> : null}
    </Split>
  </Stage>
);

export const FeatureScene: React.FC<{ l: Layout; s: Extract<Scene, { type: 'feature' }> }> = ({ l, s }) => (
  <Stage l={l} seed={1}>
    <Split l={l} media={s.shot ? <Shot l={l} src={s.shot} /> : undefined}>
      {s.kicker ? <Kicker l={l}>{s.kicker}</Kicker> : null}
      <Headline l={l}>{s.headline}</Headline>
      {s.bullets?.length ? (
        // The BLOCK may be centred in a wide frame, but the list inside it never is:
        // centred bullets leave the dots stranded away from ragged text and read as an
        // accident. Centre the container, keep the items flush left.
        <div style={{
          display: 'flex', flexDirection: 'column', gap: l.gap * 0.55,
          textAlign: 'left', alignSelf: l.stack === 'row' && !s.shot ? 'center' : 'stretch',
        }}>
          {s.bullets.map((b, i) => (
            <Bullet key={i} l={l} delay={12 + i * 5}>{b}</Bullet>
          ))}
        </div>
      ) : null}
    </Split>
  </Stage>
);

const Bullet: React.FC<{ l: Layout; children: React.ReactNode; delay: number }> = ({ l, children, delay }) => (
  <div style={{
    ...useRise(delay, 16),
    display: 'flex', alignItems: 'flex-start', gap: 1.4 * l.u,
    fontFamily: theme.font, color: theme.ink, fontSize: l.type.body,
    lineHeight: 1.34, fontWeight: 520, maxWidth: l.maxMeasure,
  }}>
    <span style={{
      flex: 'none', marginTop: 0.55 * l.u,
      width: 1.5 * l.u, height: 1.5 * l.u, borderRadius: 99, background: theme.accent,
    }} />
    <span>{children}</span>
  </div>
);

export const ProofScene: React.FC<{ l: Layout; s: Extract<Scene, { type: 'proof' }> }> = ({ l, s }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
  <Stage l={l} seed={2}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: l.gap, justifyContent: 'center', height: '100%' }}>
      {s.stat ? (
        <div style={{ ...useRise(0, 20) }}>
          <div style={{
            fontFamily: theme.font, color: theme.accent, fontWeight: 800,
            fontSize: l.type.headline * 1.45, lineHeight: 1, letterSpacing: -0.04 * l.type.headline,
          }}>{countUp(s.stat, frame, fps, 2)}</div>
          {s.statLabel ? (
            <div style={{ fontFamily: theme.font, color: theme.muted, fontSize: l.type.body, marginTop: l.gap * 0.4 }}>
              {s.statLabel}
            </div>
          ) : null}
        </div>
      ) : null}
      <blockquote style={{
        ...useRise(6, 22), margin: 0,
        borderLeft: `${0.5 * l.u}px solid ${theme.accent}`, paddingLeft: 2 * l.u,
        fontFamily: theme.font, color: theme.ink, fontWeight: 600,
        fontSize: l.type.headline * 0.58, lineHeight: 1.28, maxWidth: l.maxMeasure * 1.1,
      }}>
        <Words text={s.quote} l={l} delay={6} per={1.5} lift={0.8} />
      </blockquote>
      {s.attrib ? (
        <div style={{ ...useRise(14, 12), fontFamily: theme.font, color: theme.muted, fontSize: l.type.body * 0.92 }}>
          {s.attrib}
        </div>
      ) : null}
    </div>
  </Stage>
  );
};

export const CTAScene: React.FC<{ l: Layout; s: Extract<Scene, { type: 'cta' }>; logo?: string; name: string }> =
  ({ l, s, logo, name }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const appear = stagger(frame, fps, 0, 14);
  // A slow breathing pulse on the button. The CTA is the last thing on screen and the only
  // thing you want acted on, so it must not be the stillest object in the ad.
  const pulse = 1 + 0.018 * Math.sin((frame / fps) * Math.PI * 1.6);
  return (
    <Stage l={l} seed={3} center>
      <div style={{
        display: 'flex', flexDirection: 'column', gap: l.gap,
        justifyContent: 'center', alignItems: 'center', height: '100%', textAlign: 'center',
      }}>
        <div style={{ ...useRise(0, 18) }}><Logo l={l} src={logo} name={name} /></div>
        <Headline l={l} delay={6}>{s.headline}</Headline>
        <div style={{
          opacity: appear,
          transform: `translateY(${(1 - appear) * 2.2 * l.u}px) scale(${appear * pulse})`,
          marginTop: l.gap * 0.3, padding: `${1.8 * l.u}px ${3.6 * l.u}px`,
          borderRadius: 99, background: theme.accent, color: theme.onAccent,
          fontFamily: theme.font, fontSize: l.type.cta, fontWeight: 750,
          boxShadow: `0 ${1.2 * l.u}px ${4 * l.u}px ${theme.accent}33`,
          willChange: 'transform',
        }}>{s.action}</div>
        {s.url ? (
          <div style={{ ...useRise(20, 10), fontFamily: theme.font, color: theme.muted, fontSize: l.type.body * 0.95 }}>
            {s.url}
          </div>
        ) : null}
      </div>
    </Stage>
  );
  };
