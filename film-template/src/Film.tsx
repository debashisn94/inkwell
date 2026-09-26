import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { SCENES } from './scenes';
import { Sfx, playVoice } from './ui';
import { E, clamp01, p } from './anim';
import { css } from './styles';
import { cssVars, brandName, wordmark, tag } from './theme';
import film from '../film.json';
import voice from '../voice.generated.json';

const scenes: any[] = (film as any).scenes ?? [];
const lines: any[] = (voice as any).lines ?? [];

// Narration drives the edit. A scene lasts as long as its choreography needs, or as long
// as its voice line needs plus a breath -- whichever is longer. Without generated voice
// (a silent preview) each scene falls back to its `seconds` or the type's minimum.
const TAIL = 1.2;
const EXIT = 0.7;

export const plan = () => {
  let at = 0;
  return scenes.map((s, i) => {
    const def = SCENES[s.type];
    if (!def) throw new Error(`film.json scene ${i + 1}: unknown type "${s.type}"`);
    const line = lines.find((l) => l.scene === i + 1);
    const voiceAt = s.voice?.at ?? def.voiceAt;
    const need = line ? voiceAt + line.seconds + TAIL : 0;
    const dur = Math.max(s.seconds ?? def.min, need);
    const out = { s, i, start: at, dur, voiceAt, line, def };
    at += dur;
    return out;
  });
};
export const totalSeconds = () => plan().reduce((n, x) => n + x.dur, 0);

// Each scene leaves the same way: drifts up, softens and fades over its last 0.7s. The
// ambient layer underneath never cuts, so the change reads as a camera move, not a slide.
const SceneFrame: React.FC<{ x: ReturnType<typeof plan>[number] }> = ({ x }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const k = p(t, x.dur - EXIT, EXIT, E.in2);
  const C = x.def.C;
  return (
    <div className="scene" style={{ opacity: 1 - k, transform: `translateY(${-30 * k}px)`, filter: k ? `blur(${10 * k}px)` : undefined }}>
      <C s={x.s} t={t} dur={x.dur} />
    </div>
  );
};

const Ambient: React.FC<{ T: number; t: number }> = ({ T, t }) => {
  const k = E.sine(clamp01(t / T));
  return (
    <>
      <div className="glow" style={{ width: 900, height: 900, left: -200, top: -260, transform: `translate(${900 * k}px, ${380 * k}px)`, background: 'radial-gradient(circle, color-mix(in oklab, var(--accent) 22%, transparent), transparent 65%)' }} />
      <div className="glow" style={{ width: 1000, height: 1000, right: -300, bottom: -400, transform: `translate(${-700 * k}px, ${-300 * k}px)`, background: 'radial-gradient(circle, color-mix(in oklab, var(--accent2) 13%, transparent), transparent 65%)' }} />
      <div className="grid" style={{ backgroundPosition: `0px ${400 * (t / T)}px` }} />
    </>
  );
};

const GRAIN = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

export const Film: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const P = plan();
  const T = totalSeconds();
  const cur = [...P].reverse().find((x) => x.start <= t) ?? P[0];
  // brand mark steps aside while the product name itself is on screen
  const hide = P.reduce((h, x) => {
    if (!x.def.hideBrand) return h;
    const inK = p(t, x.start, 0.4), outK = x === P[P.length - 1] ? 0 : p(t, x.start + x.dur, 0.6);
    return Math.max(h, inK * (1 - outK));
  }, 0);
  const chromeIn = p(t, 0.2, 1.2);
  return (
    <AbsoluteFill className="film" style={cssVars}>
      <style>{css}</style>
      <Ambient T={T} t={t} />
      {[['tl', { left: 40, top: 40, borderWidth: '1px 0 0 1px' }], ['tr', { right: 40, top: 40, borderWidth: '1px 1px 0 0' }],
        ['bl', { left: 40, bottom: 40, borderWidth: '0 0 1px 1px' }], ['br', { right: 40, bottom: 40, borderWidth: '0 1px 1px 0' }]].map(([k, st]: any) =>
        <div key={k} className="tick" style={{ ...st, opacity: chromeIn }} />)}
      <div className="chrome brandmark" style={{ opacity: chromeIn * (1 - hide) }}><b>{wordmark}</b>{tag && <span>{tag}</span>}</div>
      <div className="chrome" style={{ right: 72, top: 64, opacity: chromeIn }}>
        <span style={{ color: 'var(--text)' }}>{String(cur.i + 1).padStart(2, '0')}</span> / {String(P.length).padStart(2, '0')}
      </div>

      {P.map((x) => (
        <Sequence key={x.i} from={Math.round(x.start * fps)} durationInFrames={Math.round(x.dur * fps)} name={`${x.i + 1} ${x.s.type}`}>
          <SceneFrame x={x} />
        </Sequence>
      ))}

      {playVoice && P.filter((x) => x.line).map((x) => (
        <Sequence key={`v${x.i}`} from={Math.round((x.start + x.voiceAt) * fps)} name={`voice ${x.i + 1}`} layout="none">
          <Audio src={staticFile(x.line.file)} />
        </Sequence>
      ))}
      {/* a soft whoosh under every scene change */}
      {P.slice(1).map((x) => <Sfx key={`w${x.i}`} name="whoosh" at={x.start - 0.75} vol={0.3} />)}

      <div className="vignette" />
      <div style={{ position: 'absolute', inset: '-50%', opacity: 0.07, mixBlendMode: 'overlay', backgroundImage: GRAIN, transform: `translateX(${Math.floor(t * 4) % 60}px)` }} />
    </AbsoluteFill>
  );
};

export const filmTitle = brandName;
