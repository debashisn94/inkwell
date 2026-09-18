// Word-by-word reveal driven by a beat-words file.
//
// In a real project this data comes out of tools/align-words.mjs. Here it is checked in
// so the example renders with no TTS engine or transcriber installed -- see README.
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

type Word = { w: string; s: number };
type Beat = { start: number; seconds: number };

export const Captions: React.FC<{ beats: Word[][]; timing: Beat[] }> = ({ beats, timing }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const t = frame / fps;

  const i = timing.findIndex((b) => t >= b.start && t < b.start + b.seconds);
  if (i === -1) return null;
  const words = beats[i] ?? [];

  return (
    <div
      style={{
        position: 'absolute', bottom: 260, left: 0, width,
        display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
        gap: '0 18px', padding: '0 90px', boxSizing: 'border-box',
      }}
    >
      {words.map((word, k) => {
        // each word pops in on its own timestamp
        const delay = word.s * fps;
        const pop = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.5 } });
        const shown = frame >= delay;
        return (
          <span
            key={k}
            style={{
              fontFamily: 'Georgia, "Iowan Old Style", serif',
              fontSize: 72, fontWeight: 700, color: '#2E1D14',
              opacity: shown ? interpolate(pop, [0, 1], [0, 1]) : 0,
              transform: `translateY(${shown ? interpolate(pop, [0, 1], [26, 0]) : 26}px)`,
              display: 'inline-block',
            }}
          >
            {word.w}
          </span>
        );
      })}
    </div>
  );
};
