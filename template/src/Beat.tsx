// Per-element choreography. Inside a <Sequence>, Remotion's useCurrentFrame() is already
// scene-relative, but durationInFrames is the COMPOSITION's, not the scene's -- so the
// scene length has to be supplied.
import React, { createContext, useContext } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { elementLife, Vector } from './motion';

const SceneDuration = createContext(90);
export const SceneDurationProvider = SceneDuration.Provider;
export const useSceneDuration = () => useContext(SceneDuration);

export const Beat: React.FC<{
  children: React.ReactNode;
  enterAt?: number;
  exitAt?: number;
  from?: Vector;
  to?: Vector;
  distance?: number;
  style?: React.CSSProperties;
}> = ({ children, enterAt = 0, exitAt, from = 'up', to = 'down', distance = 34, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dur = useSceneDuration();
  const life = elementLife(frame, dur, fps, { enterAt, exitAt, from, to, distance });
  return (
    <div style={{ ...style, opacity: life.opacity, transform: life.transform }}>
      {children}
    </div>
  );
};
