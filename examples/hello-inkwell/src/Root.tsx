import React from 'react';
import { Composition } from 'remotion';
import { Walk } from './Walk';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Walk"
    component={Walk}
    durationInFrames={180}
    fps={30}
    width={1080}
    height={1920}
  />
);
