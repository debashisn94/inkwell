// Scene types. Two things are happening here at once:
//
//   1. Layout adapts to the aspect ratio (see layout.ts).
//   2. Every element owns its own entrance and exit (see motion.ts / Beat.tsx).
//
// The second one is what stops the output reading as a slide deck. Nothing here moves as a
// group: the image is already leaving while the headline settles, and bullets leave in the
// reverse of the order they arrived. There is no frame at which the composition agrees with
// itself, which is exactly the difference between a film and a slide transition.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { Layout, contentBox } from '../layout';
import { theme } from '../theme';
import { Kicker, Headline, Body, Shot, Logo, Words } from '../components';
import { Beat, useSceneDuration } from '../Beat';
import { countUp, stagger, parallax } from '../motion';

export type Scene =
  | { type: 'hook'; seconds: number; kicker?: string; headline: string; sub?: string; shot?: string }
  | { type: 'feature'; seconds: number; kicker?: string; headline: string; bullets?: string[]; shot?: string }
  | { type: 'proof'; seconds: number; quote: string; attrib?: string; stat?: string; statLabel?: string }
  | { type: 'cta'; seconds: number; headline: string; action: string; url?: string; shot?: string };

// Scenes are TRANSPARENT. The backdrop lives once, in Ad.tsx, beneath all of them -- if
// each scene painted its own, the incoming one would cover the outgoing one the instant its
// Sequence began, and every carefully staggered exit would happen behind an opaque wall.
const Stage: React.FC<{ l: Layout; children: React.ReactNode; seed?: number; center?: boolean }> =
  ({ l, children, seed = 0, center = false }) => {
    const frame = useCurrentFrame();
    const dur = useSceneDuration();
    // A slow float on the content layer, at a different rate from the backdrop.
    //
    // Not decoration. A scene with no product shot has nothing left moving once its text has
    // arrived and its counter has finished, and the backdrop alone drifts too slowly to
    // register -- freezedetect caught exactly that: a 0.7s frozen stretch inside a
    // text-only proof scene while every other scene measured clean. A few pixels of travel
    // across the scene is invisible as an effect and keeps the frame alive.
    const d = parallax(frame, dur, 0.5);
    return (
      <AbsoluteFill>
        <div style={{
          ...contentBox(l),
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          alignItems: center ? 'center' : 'stretch',
          textAlign: center ? 'center' : 'left',
          transform: `translate(${d.x * 0.3}%, ${d.y * 0.3}%)`,
        }}>
          {children}
        </div>
      </AbsoluteFill>
    );
  };

const Split: React.FC<{ l: Layout; media?: React.ReactNode; children: React.ReactNode }> =
  ({ l, media, children }) => {
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

export const HookScene: React.FC<{ l: Layout; s: Extract<Scene, { type: 'hook' }> }> = ({ l, s }) => {
  const dur = useSceneDuration();
  return (
    <Stage l={l} seed={0}>
      {/* Negative enterAt on the opening beats.
          Social platforms use frame 0 as the thumbnail, and a spring starting at 0 leaves
          the first few frames nearly black -- a dark, empty thumbnail on the one surface
          that decides whether the ad is watched at all. Starting these springs already in
          progress means frame 0 is a composed frame. */}
      <Split l={l} media={s.shot
        ? <Beat enterAt={-10} exitAt={dur - 26} from="scale" to="left" distance={40}><Shot l={l} src={s.shot} /></Beat>
        : undefined}>
        {s.kicker ? (
          <Beat enterAt={-6} exitAt={dur - 22} from="left" to="left" distance={26}>
            <Kicker l={l}>{s.kicker}</Kicker>
          </Beat>
        ) : null}
        <Beat enterAt={-2} exitAt={dur - 16} from="up" to="up" distance={30}>
          <Headline l={l} delay={0}>{s.headline}</Headline>
        </Beat>
        {s.sub ? (
          <Beat enterAt={14} exitAt={dur - 12} from="up" to="up" distance={22}>
            <Body l={l} delay={16}>{s.sub}</Body>
          </Beat>
        ) : null}
      </Split>
    </Stage>
  );
};

export const FeatureScene: React.FC<{ l: Layout; s: Extract<Scene, { type: 'feature' }> }> = ({ l, s }) => {
  const dur = useSceneDuration();
  return (
    <Stage l={l} seed={1}>
      <Split l={l} media={s.shot
        ? <Beat enterAt={0} exitAt={dur - 24} from="right" to="right" distance={44}><Shot l={l} src={s.shot} /></Beat>
        : undefined}>
        {s.kicker ? (
          <Beat enterAt={3} exitAt={dur - 22} from="left" to="left" distance={26}>
            <Kicker l={l}>{s.kicker}</Kicker>
          </Beat>
        ) : null}
        <Beat enterAt={6} exitAt={dur - 18} from="up" to="up" distance={30}>
          <Headline l={l} delay={6}>{s.headline}</Headline>
        </Beat>
        {s.bullets?.length ? (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: l.gap * 0.55,
            textAlign: 'left', alignSelf: l.stack === 'row' && !s.shot ? 'center' : 'stretch',
          }}>
            {s.bullets.map((b, i) => (
              // Bullets leave in REVERSE order, last first. Arriving and departing in the
              // same order makes a list feel like a conveyor; reversing it feels authored.
              <Beat key={i} enterAt={16 + i * 6} exitAt={dur - 16 - (s.bullets!.length - 1 - i) * 3}
                    from="left" to="left" distance={22}>
                <BulletRow l={l}>{b}</BulletRow>
              </Beat>
            ))}
          </div>
        ) : null}
      </Split>
    </Stage>
  );
};

const BulletRow: React.FC<{ l: Layout; children: React.ReactNode }> = ({ l, children }) => (
  <div style={{
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
  const dur = useSceneDuration();
  return (
    <Stage l={l} seed={2}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: l.gap, justifyContent: 'center', height: '100%' }}>
        {s.stat ? (
          <Beat enterAt={0} exitAt={dur - 20} from="scale" to="up" distance={26}>
            <div style={{
              fontFamily: theme.font, color: theme.accent, fontWeight: 800,
              fontSize: l.type.headline * 1.45, lineHeight: 1, letterSpacing: -0.04 * l.type.headline,
            }}>{countUp(s.stat, frame, fps, 2)}</div>
            {s.statLabel ? (
              <div style={{ fontFamily: theme.font, color: theme.muted, fontSize: l.type.body, marginTop: l.gap * 0.4 }}>
                {s.statLabel}
              </div>
            ) : null}
          </Beat>
        ) : null}
        <Beat enterAt={8} exitAt={dur - 14} from="left" to="left" distance={30}>
          <QuoteBlock l={l} quote={s.quote} />
        </Beat>
        {s.attrib ? (
          <Beat enterAt={20} exitAt={dur - 12} from="up" to="up" distance={18}>
            <div style={{ fontFamily: theme.font, color: theme.muted, fontSize: l.type.body * 0.92 }}>
              {s.attrib}
            </div>
          </Beat>
        ) : null}
      </div>
    </Stage>
  );
};

// The rule draws down the side as the quote arrives, so the quote is built rather than shown.
const QuoteBlock: React.FC<{ l: Layout; quote: string }> = ({ l, quote }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const draw = stagger(frame, fps, 0, 8);
  return (
    <div style={{ display: 'flex', gap: 2 * l.u }}>
      <div style={{
        flex: 'none', width: 0.5 * l.u, borderRadius: 99, background: theme.accent,
        transformOrigin: 'top', transform: `scaleY(${draw})`,
      }} />
      <blockquote style={{
        margin: 0, fontFamily: theme.font, color: theme.ink, fontWeight: 600,
        fontSize: l.type.headline * 0.58, lineHeight: 1.28, maxWidth: l.maxMeasure * 1.1,
      }}>
        <Words text={quote} l={l} delay={12} per={1.5} lift={0.8} />
      </blockquote>
    </div>
  );
};

export const CTAScene: React.FC<{ l: Layout; s: Extract<Scene, { type: 'cta' }>; logo?: string; name: string }> =
  ({ l, s, logo, name }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const dur = useSceneDuration();
    const appear = stagger(frame, fps, 0, 16);
    // A slow breathing pulse. The CTA is the last thing on screen and the only thing you
    // want acted on, so it must not be the stillest object in the ad.
    const pulse = 1 + 0.02 * Math.sin((frame / fps) * Math.PI * 1.7);
    return (
      <Stage l={l} seed={3} center>
        <div style={{
          display: 'flex', flexDirection: 'column', gap: l.gap,
          justifyContent: 'center', alignItems: 'center', height: '100%', textAlign: 'center',
        }}>
          <Beat enterAt={0} exitAt={dur + 99} from="scale" to="scale">
            <Logo l={l} src={logo} name={name} />
          </Beat>
          <Beat enterAt={6} exitAt={dur + 99} from="up" to="up" distance={28}>
            <Headline l={l} delay={6}>{s.headline}</Headline>
          </Beat>
          <div style={{
            opacity: appear,
            transform: `translateY(${(1 - appear) * 2.2 * l.u}px) scale(${appear * pulse})`,
            marginTop: l.gap * 0.3, padding: `${1.8 * l.u}px ${3.6 * l.u}px`,
            borderRadius: 99, background: theme.accent, color: theme.onAccent,
            fontFamily: theme.font, fontSize: l.type.cta, fontWeight: 750,
            boxShadow: `0 ${1.2 * l.u}px ${4 * l.u}px ${theme.accent}33`,
          }}>{s.action}</div>
          {s.url ? (
            <Beat enterAt={24} exitAt={dur + 99} from="up" to="up" distance={14}>
              <div style={{ fontFamily: theme.font, color: theme.muted, fontSize: l.type.body * 0.95 }}>
                {s.url}
              </div>
            </Beat>
          ) : null}
        </div>
      </Stage>
    );
  };
