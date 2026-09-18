import React from 'react';
import { Composition } from 'remotion';
import { Ad, totalFrames } from './Ad';

// Every platform size worth shipping. One ad definition, four real layouts -- not one
// master letterboxed three times.
export const FORMATS = [
  { id: 'Reel',   width: 1080, height: 1920, note: 'Reels · Shorts · TikTok · Stories (9:16)' },
  { id: 'Feed',   width: 1080, height: 1350, note: 'Instagram / Facebook feed (4:5)' },
  { id: 'Square', width: 1080, height: 1080, note: 'Feed · LinkedIn (1:1)' },
  { id: 'Wide',   width: 1920, height: 1080, note: 'YouTube · LinkedIn · X · pre-roll (16:9)' },
] as const;

const FPS = 30;

export const RemotionRoot: React.FC = () => (
  <>
    {FORMATS.map((f) => (
      <Composition
        key={f.id}
        id={f.id}
        component={Ad}
        durationInFrames={totalFrames(FPS)}
        fps={FPS}
        width={f.width}
        height={f.height}
      />
    ))}
  </>
);
