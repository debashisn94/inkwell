import React from 'react';
import { AbsoluteFill, Sequence, useVideoConfig } from 'remotion';
import { useLayout } from './layout';
import { theme, name } from './theme';
import { Scene, HookScene, FeatureScene, ProofScene, CTAScene } from './scenes';
import { SceneDurationProvider } from './Beat';
import { Chrome } from './Chrome';
import { Backdrop } from './Backdrop';
import ad from '../ad.json';
import brand from '../brand.json';

const scenes = (ad as any).scenes as Scene[];

const logoAsset = (brand as any).assets?.find((a: any) => a.label === 'logo' && !a.vector);
const logo: string | undefined = (ad as any).logo ?? logoAsset?.file;

// Scenes overlap substantially. This is the structural difference between a film and a
// slide deck: for roughly half a second, the outgoing scene's last elements and the
// incoming scene's first elements are BOTH on screen and both moving. There is never a
// frame where one rectangle of content cleanly replaces another, which is the thing the eye
// reads as "a slide changed".
//
// Elements inside each scene time their own exits (see scenes/index.tsx), so what leaves
// during this window is already thinning out rather than departing in a block.
const OVERLAP = 16;

export const Ad: React.FC = () => {
  const l = useLayout();
  const { fps } = useVideoConfig();

  let at = 0;
  const placed = scenes.map((s, i) => {
    const last = i === scenes.length - 1;
    const body = Math.round((s.seconds ?? 3) * fps);
    const dur = body + (last ? 0 : OVERLAP);
    const from = at;
    at += body;
    return { s, i, from, dur };
  });

  return (
    <AbsoluteFill style={{ background: theme.surface }}>
      {/* One continuous backdrop under everything. Never resets between scenes. */}
      <Backdrop l={l} />
      {placed.map(({ s, i, from, dur }) => (
        <Sequence key={i} from={from} durationInFrames={dur}>
          <SceneDurationProvider value={dur}>
            {s.type === 'hook' ? <HookScene l={l} s={s} />
              : s.type === 'feature' ? <FeatureScene l={l} s={s} />
              : s.type === 'proof' ? <ProofScene l={l} s={s} />
              : <CTAScene l={l} s={s} logo={logo} name={name} />}
          </SceneDurationProvider>
        </Sequence>
      ))}
      {/* Outside every Sequence, so it never resets. */}
      <Chrome l={l} logo={logo} name={name} />
    </AbsoluteFill>
  );
};

export const totalFrames = (fps: number) =>
  scenes.reduce((n, s) => n + Math.round((s.seconds ?? 3) * fps), 0);
