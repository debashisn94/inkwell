import React from 'react';
import { AbsoluteFill, Sequence, useVideoConfig, useCurrentFrame } from 'remotion';
import { sceneTransition } from './motion';
import { useLayout } from './layout';
import { theme, name } from './theme';
import { Scene, HookScene, FeatureScene, ProofScene, CTAScene } from './scenes';
import ad from '../ad.json';
import brand from '../brand.json';

const scenes = (ad as any).scenes as Scene[];
const logo = (ad as any).logo ?? (brand as any).assets?.find((a: any) => a.label === 'logo' && !a.vector)
  ? 'assets/' + ((brand as any).assets?.find((a: any) => a.label === 'logo' && !a.vector)?.file.split('/').pop())
  : undefined;

// Scene transition. A cross-fade is the absence of a transition -- two still frames
// dissolving into each other is exactly what makes an ad read as a slide deck. Scenes here
// arrive from below and leave upward while still moving, so each one pushes the last out.
const Cut: React.FC<{ durationInFrames: number; children: React.ReactNode }> =
  ({ durationInFrames, children }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const t = sceneTransition(frame, durationInFrames, fps);
    return (
      <AbsoluteFill style={{
        opacity: t.opacity,
        transform: `translateY(${t.y}%) scale(${t.scale})`,
        willChange: 'transform, opacity',
      }}>
        {children}
      </AbsoluteFill>
    );
  };

export const Ad: React.FC = () => {
  const l = useLayout();
  const { fps } = useVideoConfig();
  let at = 0;

  return (
    <AbsoluteFill style={{ background: theme.surface }}>
      {scenes.map((s, i) => {
        // Overlap: the outgoing scene is still on screen and still moving while the next
        // one arrives. Butt-jointed sequences give a dead frame at every boundary.
        const OVERLAP = 8;
        const dur = Math.round((s.seconds ?? 3) * fps) + (i === scenes.length - 1 ? 0 : OVERLAP);
        const from = at;
        at += dur - (i === scenes.length - 1 ? 0 : OVERLAP);
        return (
          <Sequence key={i} from={from} durationInFrames={dur}>
            <Cut durationInFrames={dur}>
              {s.type === 'hook' ? <HookScene l={l} s={s} />
                : s.type === 'feature' ? <FeatureScene l={l} s={s} />
                : s.type === 'proof' ? <ProofScene l={l} s={s} />
                : <CTAScene l={l} s={s} logo={logo} name={name} />}
            </Cut>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const totalFrames = (fps: number) =>
  scenes.reduce((n, s) => n + Math.round((s.seconds ?? 3) * fps), 0);
