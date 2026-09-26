import React from 'react';
import { Composition } from 'remotion';
import { Film, totalSeconds } from './Film';

// A narrated film is 16:9 only. Its layouts are built on a wide canvas (diagrams, side-by-
// side columns); a 9:16 cut is a different edit, not a reflow. Use the ad formats for that.
const FPS = 30;

export const RemotionRoot: React.FC = () => (
  <Composition id="Film" component={Film} durationInFrames={Math.ceil(totalSeconds() * FPS)} fps={FPS} width={1920} height={1080} />
);
