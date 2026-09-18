import React from 'react';
import { AbsoluteFill, Sequence, useVideoConfig, useCurrentFrame, interpolate } from 'remotion';
import { useLayout } from './layout';
import { theme, name } from './theme';
import { Scene, HookScene, FeatureScene, ProofScene, CTAScene } from './scenes';
import ad from '../ad.json';
import brand from '../brand.json';

const scenes = (ad as any).scenes as Scene[];
const logo = (ad as any).logo ?? (brand as any).assets?.find((a: any) => a.label === 'logo' && !a.vector)
  ? 'assets/' + ((brand as any).assets?.find((a: any) => a.label === 'logo' && !a.vector)?.file.split('/').pop())
  : undefined;

// A short cross-fade between scenes. Hard cuts read as a slideshow; anything longer than
// ~6 frames reads as sluggish on a feed where the viewer is already scrolling.
const FADE = 6;

const Fade: React.FC<{ durationInFrames: number; children: React.ReactNode }> = ({ durationInFrames, children }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, FADE, durationInFrames - FADE, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

export const Ad: React.FC = () => {
  const l = useLayout();
  const { fps } = useVideoConfig();
  let at = 0;

  return (
    <AbsoluteFill style={{ background: theme.surface }}>
      {scenes.map((s, i) => {
        const dur = Math.round((s.seconds ?? 3) * fps);
        const from = at;
        at += dur;
        return (
          <Sequence key={i} from={from} durationInFrames={dur}>
            <Fade durationInFrames={dur}>
              {s.type === 'hook' ? <HookScene l={l} s={s} />
                : s.type === 'feature' ? <FeatureScene l={l} s={s} />
                : s.type === 'proof' ? <ProofScene l={l} s={s} />
                : <CTAScene l={l} s={s} logo={logo} name={name} />}
            </Fade>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const totalFrames = (fps: number) =>
  scenes.reduce((n, s) => n + Math.round((s.seconds ?? 3) * fps), 0);
