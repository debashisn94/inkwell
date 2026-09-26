import React from 'react';
import { Audio, Sequence, getInputProps, staticFile, useVideoConfig } from 'remotion';
import { E, p, enter, mix } from './anim';

// ---------------------------------------------------------------------------
// Audio
// ---------------------------------------------------------------------------

// Render-time switch so one composition can produce the full mix or either stem:
//   inputProps { mix: 'full' | 'voice' | 'sfx' | 'none' }
export const MIX: string = (getInputProps() as any).mix || 'full';
export const playVoice = MIX === 'full' || MIX === 'voice';
const playSfx = MIX === 'full' || MIX === 'sfx';

// Sound design sits roughly 10 dB under narration. It is texture, not a soundtrack:
// anything louder starts masking consonants, and the buyer adds music on top.
const SFX_GAIN = 0.5;

/** A one-shot from public/sfx. `dur` loops it (typing) for that many seconds. */
export const Sfx: React.FC<{ name: string; at: number; vol?: number; dur?: number }> = ({ name, at, vol = 1, dur }) => {
  const { fps } = useVideoConfig();
  if (!playSfx || at < 0) return null;
  return (
    <Sequence from={Math.round(at * fps)} durationInFrames={dur ? Math.max(1, Math.round(dur * fps)) : undefined} layout="none">
      <Audio src={staticFile(`sfx/${name}.wav`)} volume={vol * SFX_GAIN} loop={!!dur} />
    </Sequence>
  );
};

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

/**
 * Headline copy arrives word by word from behind a mask.
 * Markup: *accent words* and \n for a line break.
 */
export const Words: React.FC<{ text: string; t: number; at: number; stagger?: number; className?: string; style?: React.CSSProperties; as?: any }> = ({
  text, t, at, stagger = 0.06, className, style, as: Tag = 'h1',
}) => {
  let i = 0;
  return (
    <Tag className={className} style={style}>
      {text.split('\n').map((line, li) => {
        // splitting on '*' alternates plain / accent runs
        const toks: { w: string; acc: boolean }[] = [];
        line.split('*').forEach((run, ri) => run.split(/\s+/).filter(Boolean).forEach((w) => toks.push({ w, acc: ri % 2 === 1 })));
        return (
          <React.Fragment key={li}>
            {li > 0 && <br />}
            {toks.map(({ w, acc }, wi) => {
              const k = p(t, at + (i++) * stagger, 0.9, E.out4);
              return (
                <React.Fragment key={wi}>
                  {wi > 0 && ' '}
                  <span className="w">
                    <span className={`wi${acc ? ' em' : ''}`} style={{ transform: `translateY(${115 * (1 - k)}%) rotate(${3 * (1 - k)}deg)` }}>{w}</span>
                  </span>
                </React.Fragment>
              );
            })}
          </React.Fragment>
        );
      })}
    </Tag>
  );
};

/** Inline *accent* markup for copy that does not animate word by word. */
export const Rich: React.FC<{ text: string }> = ({ text }) => (
  <>{text.split(/(\*[^*]+\*)/).filter(Boolean).map((part, i) =>
    part.startsWith('*') && part.endsWith('*') ? <span key={i} className="em">{part.slice(1, -1)}</span> : <React.Fragment key={i}>{part}</React.Fragment>)}</>
);

/** The kicker + headline block most scenes open with. */
export const Top: React.FC<{ t: number; kicker?: string; headline: string; size?: 'h1' | 'h2'; stagger?: number; style?: React.CSSProperties }> = ({
  t, kicker, headline, size = 'h2', stagger, style,
}) => (
  <div className="top" style={style}>
    {kicker && <div className="eyebrow" style={enter(t, 0.2, 0.6, { x: -20 })}>{kicker}</div>}
    <Words text={headline} t={t} at={0.35} stagger={stagger} className={size} style={{ marginTop: kicker ? 26 : 0 }} />
  </div>
);

// ---------------------------------------------------------------------------
// Icons: 16px stroke set, scaled. Name them in film.json.
// ---------------------------------------------------------------------------

const ICONS: Record<string, React.ReactNode> = {
  graph: <><circle cx="3.5" cy="4" r="1.8" /><circle cx="12.5" cy="3" r="1.8" /><circle cx="8" cy="12" r="1.8" /><path d="M4.8 5.4 7 10.4M11.6 4.6 9 10.6M5.2 3.6l5.6-.4" /></>,
  shield: <path d="M8 1.5 13.5 3.5v4c0 3.4-2.3 5.9-5.5 7-3.2-1.1-5.5-3.6-5.5-7v-4z" />,
  checklist: <><path d="M2.5 4h7M2.5 8h7M2.5 12h4" /><path d="m10 11.5 1.6 1.6L14.5 10" /></>,
  plug: <path d="M6 1.5v3M10 1.5v3M4 4.5h8v3a4 4 0 0 1-8 0zM8 11.5v3" />,
  lock: <><rect x="3" y="7" width="10" height="7.5" rx="1.5" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" /></>,
  cloud: <path d="M4.5 12.5a3 3 0 0 1-.3-6 4 4 0 0 1 7.7-1 3 3 0 0 1 .6 7z" />,
  bolt: <path d="M9 1.5 3.5 9H8l-1 5.5L12.5 7H8z" />,
  eye: <><path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z" /><circle cx="8" cy="8" r="2" /></>,
  clock: <><circle cx="8" cy="8" r="6" /><path d="M8 4.5V8l2.5 1.5" /></>,
  users: <><circle cx="5.5" cy="5.5" r="2.2" /><circle cx="11.5" cy="6.5" r="1.8" /><path d="M1.5 13.5c.5-2.3 2-3.5 4-3.5s3.5 1.2 4 3.5M10 10.2c1.9-.3 3.6.7 4.2 3.3" /></>,
  chart: <path d="M2 14h12M4 11V8M8 11V4M12 11V6.5" />,
  spark: <path d="M8 2v3M8 11v3M2 8h3M11 8h3M4 4l2 2M10 10l2 2M12 4l-2 2M6 10l-2 2" />,
  code: <path d="m5.5 4.5-3.5 3.5 3.5 3.5M10.5 4.5 14 8l-3.5 3.5" />,
  globe: <><circle cx="8" cy="8" r="6" /><path d="M2 8h12M8 2c2 2.2 2 9.8 0 12M8 2c-2 2.2-2 9.8 0 12" /></>,
  check: <path d="M3 8.5 6.5 12 13 4.5" />,
};
export const Icon: React.FC<{ name: string; sw?: number; style?: React.CSSProperties }> = ({ name, sw = 1.5, style }) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={style}>
    {ICONS[name] ?? ICONS.spark}
  </svg>
);

// ---------------------------------------------------------------------------
// The constellation: a small knowledge-graph motif, drawn in on reveal.
// ---------------------------------------------------------------------------

const NODES = [[880, 90, 7, 'a'], [980, 150, 8.5, 'b'], [1080, 110, 5.5, 'w'], [1030, 230, 7, 'a'], [1120, 200, 6, 'b'], [820, 180, 6, 'w'], [900, 250, 5, 'a']] as const;
const EDGES = [[0, 1], [1, 2], [1, 3], [0, 5], [5, 3], [2, 4], [3, 4], [5, 6], [6, 3]];
const GLOWS = [0, 1, 3, 4];

export const Constellation: React.FC<{ t: number; at: number; width?: number; height?: number; big?: boolean; pulseAt?: number }> = ({
  t, at, width = 380, height = 250, big = true, pulseAt,
}) => {
  const col = (c: string) => (c === 'a' ? 'var(--accent)' : c === 'b' ? 'var(--accent2)' : 'var(--text)');
  return (
    <svg width={width} height={height} viewBox="800 70 340 200" aria-hidden style={{ overflow: 'visible' }}>
      <g stroke="color-mix(in oklab, var(--text) 22%, var(--bg))" strokeWidth={2}>
        {EDGES.map(([a, b], i) => {
          const [x1, y1] = NODES[a], [x2, y2] = NODES[b];
          const len = Math.hypot(x2 - x1, y2 - y1);
          const k = big ? p(t, at + i * 0.07, 1.1, E.inOut2) : 1;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} strokeDasharray={len} strokeDashoffset={len * (1 - k)} />;
        })}
      </g>
      {big && GLOWS.map((n, i) => {
        const [x, y, , c] = NODES[n];
        const k = p(t, at + 0.4 + i * 0.1, 1.2);
        return <circle key={i} cx={x} cy={y} r={(n === 1 ? 30 : 24) * k} fill={col(c)} opacity={0.28 * k} style={{ filter: 'blur(6px)' }} />;
      })}
      {NODES.map(([x, y, r, c], i) => {
        const k = big ? p(t, at + 0.2 + i * 0.08, 0.6, E.back(3)) : 1;
        let s = k * (big ? 1 : 1.3);
        if (pulseAt !== undefined) {
          const ph = (t - pulseAt - i * 0.1) / 0.6;
          if (ph > 0 && ph < 4) s *= 1 + 0.35 * Math.sin(Math.PI * (ph % 1)) ** 2;
        }
        return <circle key={i} cx={x} cy={y} r={r * Math.max(0, s)} fill={col(c)} />;
      })}
    </svg>
  );
};

export { mix };
