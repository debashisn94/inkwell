// The film's scene library. Each scene is a pure function of scene-local time `t`
// (seconds) and carries its own sound cues, so a scene can be reordered or reused without
// re-timing anything by hand.
//
// Every scene type registers:
//   min     -- the shortest the choreography needs to finish and breathe
//   voiceAt -- where narration starts inside the scene, chosen so the key phrase lands on
//              the scene's key visual (the reveal, the lock slam, the quote)
import React from 'react';
import { E, bez, clamp01, enter, mix, order, p, pulse, typeEnd, typed } from './anim';
import { Constellation, Icon, Rich, Sfx, Top, Words } from './ui';
import { tag as brandTag, wordmark } from './theme';

type Props = { s: any; t: number; dur: number };

// ------------------------------------------------------------------ terminal
// A product problem, shown happening. Types a command, a question and the tool's
// unhelpful answer, then wipes it and starts over -- the "every morning" beat.
const Terminal: React.FC<Props> = ({ s, t }) => {
  const cmd = s.command ?? 'claude';
  const e1 = typeEnd(cmd, 1.2, 14);
  const t3 = e1 + 0.6, e3 = typeEnd(s.prompt, t3, 42);
  const t4 = e3 + 0.4, e4 = typeEnd(s.reply, t4, 70);
  const w = e4 + 0.7;
  const stamps: string[] = s.stamps ?? [];
  const flip = p(t, w, 0.2, E.in2) - p(t, w + 0.2, 0.25);
  const wiped = p(t, w, 0.45);
  const settle = p(t, w + 0.5, 1.2, E.inOut3);
  const caretOn = t < 1 || t > 1 + 10 * 0.35 || Math.floor((t - 1) / 0.35) % 2 === 1;
  const flicker = t > w + 0.3 && t < w + 1.2 ? 0.2 + 0.8 * pulse(t, w + 0.3, 0.3, 3) : 1;
  const termIn = p(t, 0.4, 1.1);
  return (
    <>
      <div className="top" style={{ top: 120, textAlign: 'center' }}>
        <Words text={s.headline} t={t} at={w + 0.8} stagger={0.07} className="h1" />
      </div>
      <div className="term" style={{
        opacity: termIn * mix(1, 0.45, settle),
        transform: `translateY(${80 * (1 - termIn) + 150 * settle}px) scale(${mix(0.96, 1, termIn) * mix(1, 0.86, settle)})`,
      }}>
        <div className="term-bar"><i /><i /><i /><span>{s.title ?? '~'}</span></div>
        <div className="term-body">
          {stamps.length > 0 && (
            <div className="stamp" style={{ transform: `perspective(400px) rotateX(${90 * flip}deg)` }}>
              {t < w + 0.2 ? stamps[0] : stamps[1] ?? stamps[0]}
            </div>
          )}
          <div className="ln"><span className="c-acc">$ </span>{typed(cmd, t, 1.2, 14)}</div>
          <div className="ln dim" style={{ opacity: p(t, e1 + 0.2, 0.3) * flicker }}>{s.status}</div>
          <div className="ln" style={{ opacity: t >= t3 ? 1 - wiped : 0, filter: `blur(${6 * wiped}px)` }}>
            <span className="c-cy">› </span>{typed(s.prompt, t, t3, 42)}
          </div>
          <div className="ln c-2" style={{ opacity: t >= e3 + 0.3 ? 1 - wiped : 0, filter: `blur(${6 * wiped}px)` }}>
            {typed(s.reply, t, t4, 70)}<span className="caret" style={{ opacity: caretOn ? 1 : 0 }} />
          </div>
        </div>
      </div>
      <Sfx name="whoosh-soft" at={0.35} vol={0.25} />
      <Sfx name="typing-slow" at={1.2} dur={cmd.length / 14} vol={0.5} />
      <Sfx name="typing" at={t3} dur={s.prompt.length / 42} vol={0.4} />
      <Sfx name="wipe" at={w} vol={0.45} />
      <Sfx name="tick" at={w + 0.2} vol={0.5} />
      <Sfx name="pop" at={w + 0.45} vol={0.25} />
    </>
  );
};

// ------------------------------------------------------------------ chips
// The repeated work: a cloud of things people re-explain, which then dissolves.
const Chips: React.FC<Props> = ({ s, t }) => {
  const chips: string[] = s.chips ?? [];
  const perm = order(chips.length);
  const [l1, l2] = s.lines ?? [];
  const lift = p(t, 5.8, 1, E.inOut3);
  return (
    <>
      <Top t={t} kicker={s.kicker} headline={s.headline} size="h1" />
      <div className="chips">
        {chips.map((c, i) => {
          const k = p(t, 1.2 + i * 0.22, 0.7, E.back(1.6));
          const d = p(t, 4.6 + perm.indexOf(i) * 0.12, 1.1, E.in2);
          return (
            <div key={i} className="chip" style={{
              opacity: clamp01((t - 1.2 - i * 0.22) / 0.4) * (1 - d),
              transform: `translateY(${40 * (1 - k) - 60 * d}px) scale(${mix(0.92, 1, k) * mix(1, 0.9, d)})`,
              filter: d ? `blur(${14 * d}px)` : undefined,
            }}>{c}{s.chipTag && <small>{s.chipTag}</small>}</div>
          );
        })}
      </div>
      <div className="below" style={{ transform: `translateY(${-260 * lift}px)` }}>
        <div className="swap">
          {l1 && <p style={{ ...enter(t, 3.2, 0.7), opacity: p(t, 3.2, 0.5) * (1 - p(t, 5.6, 0.5)) }}><Rich text={l1} /></p>}
          {l2 && <p style={enter(t, 6.0, 0.7)}><Rich text={l2} /></p>}
        </div>
      </div>
      {chips.map((_, i) => <Sfx key={i} name="pop" at={1.2 + i * 0.22} vol={0.4} />)}
      <Sfx name="dissolve" at={4.6} vol={0.4} />
    </>
  );
};

// ------------------------------------------------------------------ blocked
// The obvious alternative, and why it is shut. Optional second beat: a real quote.
const Blocked: React.FC<Props> = ({ s, t }) => {
  const items: string[] = s.items ?? [];
  const hasQuote = !!s.quote;
  const out = hasQuote ? p(t, 6.3, 0.7, E.in2) : 0;
  const shake = t > 4.1 && t < 4.46 ? (Math.floor((t - 4.1) / 0.06) % 2 === 0 ? 10 : 0) : 0;
  const outStyle = { opacity: 1 - out, transform: `translateY(${-40 * out}px)`, filter: out ? `blur(${8 * out}px)` : undefined };
  const lk = p(t, 3.6, 0.55, E.back(2));
  return (
    <>
      <div style={outStyle}><Top t={t} kicker={s.kicker} headline={s.headline} /></div>
      <div style={{ ...outStyle, transform: `translate(${shake}px, ${-40 * out}px)` }}>
        <div className="stack">{items.map((it, i) => <div key={i} style={enter(t, 1.3 + i * 0.15, 0.7, { x: -40 })}>{it}</div>)}</div>
        <div className="flowbar" style={{ transform: `scaleX(${p(t, 2.0, 1.1, E.inOut2)})`, opacity: 1 - 0.75 * p(t, 4.1, 0.4) }} />
        <div className="dest" style={enter(t, 2.6, 0.8, { scale: 0.9 })}><Icon name={s.destIcon ?? 'cloud'} sw={1.1} />{s.destination}</div>
        <div className="lock" style={{ opacity: clamp01((t - 3.6) / 0.3), transform: `scale(${mix(2.4, 1, lk)}) rotate(${-25 * (1 - lk)}deg)` }}><Icon name="lock" /></div>
        <div className="lock-label" style={enter(t, 4.2, 0.5, { y: 10 })}>{s.label ?? 'BLOCKED'}</div>
      </div>
      {hasQuote && (
        <>
          <div className="quote">
            <span className="mark" style={enter(t, 6.9, 0.8, { scale: 0.6 })}>“</span>
            <Words as="blockquote" text={s.quote} t={t} at={7.1} stagger={0.08} />
            <cite style={enter(t, 8.6, 0.7, { y: 14 })}>{s.attrib}</cite>
          </div>
          {s.stat && <div className="stat" style={enter(t, 9.3, 0.8, { y: 30 })}><b>{s.stat.value}</b><span>{s.stat.label}</span></div>}
        </>
      )}
      <Sfx name="whoosh-soft" at={2.0} vol={0.3} />
      <Sfx name="lock" at={3.6} vol={0.9} />
      <Sfx name="impact-soft" at={3.6} vol={0.6} />
      {hasQuote && <Sfx name="whoosh" at={6.3} vol={0.3} />}
    </>
  );
};

// ------------------------------------------------------------------ quote
const Quote: React.FC<Props> = ({ s, t }) => (
  <>
    <div className="quote">
      <span className="mark" style={enter(t, 0.3, 0.8, { scale: 0.6 })}>“</span>
      <Words as="blockquote" text={s.quote} t={t} at={0.5} stagger={0.08} />
      <cite style={enter(t, 2.0, 0.7, { y: 14 })}>{s.attrib}</cite>
    </div>
    {s.stat && <div className="stat" style={enter(t, 2.7, 0.8, { y: 30 })}><b>{s.stat.value}</b><span>{s.stat.label}</span></div>}
  </>
);

// ------------------------------------------------------------------ reveal
// The product name lands. Constellation draws in, the wordmark rises, the tag slides on.
export const Wordmark: React.FC<{ t: number; at: number; size?: number; motif?: boolean; big?: boolean }> = ({ t, at, size = 240, motif = true, big = true }) => {
  const d = big ? 1 : 0.1;
  const bar = p(t, at + (big ? 1.7 : 0.6), 0.8, E.inOut3);
  const tg = p(t, at + (big ? 2.0 : 0.8), 0.7, E.back(1.8));
  return (
    <>
      <div className="wordmark" style={{ fontSize: size }}>
        {[...wordmark].map((c, i) => {
          const k = p(t, at + d + i * 0.07, 0.9, E.out4);
          return <span key={i} className="ch" style={{ opacity: clamp01((t - at - d - i * 0.07) / 0.5), transform: `translateY(${70 * (1 - k)}%)` }}>{c}</span>;
        })}
        <i className="bar" style={{ transform: `scaleX(${bar})`, width: size * 0.54, height: size / 20, bottom: -size / 9.2 }} />
      </div>
      {brandTag && <div className="brandtag" style={{ opacity: clamp01((t - at - (big ? 2.0 : 0.8)) / 0.4), transform: `translateX(${-30 * (1 - tg)}px)`, fontSize: size / 6, marginBottom: size / 7 }}>{brandTag}</div>}
      {motif && <Constellation t={t} at={at} pulseAt={at + 2.6} />}
    </>
  );
};

const Reveal: React.FC<Props> = ({ s, t }) => {
  const lines: string[] = s.lines ?? [];
  const grow = p(t, 0.4, 5, E.out2);
  return (
    <>
      <div className="logo" style={{ transform: `translate(-50%, -62%) scale(${mix(0.94, 1, grow)})` }}>
        <Wordmark t={t} at={0.4} motif={s.motif !== false} />
      </div>
      <div className="tagline">{lines.map((l, i) => <p key={i} style={enter(t, 3.2 + i * 0.9, 0.8)}><Rich text={l} /></p>)}</div>
      <Sfx name="riser" at={0.1} vol={0.55} />
      <Sfx name="impact" at={1.4} vol={0.9} />
      <Sfx name="shimmer" at={0.6} vol={0.6} />
      <Sfx name="shimmer" at={3.0} vol={0.35} />
    </>
  );
};

// ------------------------------------------------------------------ flow
// How it works: sources feed one hub inside a boundary; nothing crosses to the outside.
const HUB = [912, 570];
const Flow: React.FC<Props> = ({ s, t }) => {
  const src: any[] = s.sources ?? [];
  const n = src.length;
  // sources sit centred in the boundary box, a little below the hub, so the box label clears the first tile
  const ys = src.map((_, i) => 632 + (i - (n - 1) / 2) * 120);
  const curves = ys.map((y) => [[620, y], [Math.abs(y - 570) > 150 ? 780 : 760, y], [800, 570], HUB]);
  const hues = ['var(--accent)', 'var(--accent2)', '#C9A7F0', '#9ED68A', '#F29B8B'];
  const hub = p(t, 2.8, 1, E.back(1.6));
  const recall = p(t, 6.4, 0.6);
  const particles: React.ReactNode[] = [];
  const dot = (key: string, P: number[][], at: number, d: number, rev: boolean, color: string, r: number) => {
    if (t < at || t > at + d) return;
    const k = E.inOut2(clamp01((t - at) / d));
    const [x, y] = bez(P, rev ? 1 - k : k);
    const o = Math.min(1, (t - at) / 0.15, (at + d - t) / 0.15);
    particles.push(<circle key={key} cx={x} cy={y} r={r} fill={color} opacity={o} style={{ filter: `drop-shadow(0 0 8px ${color})` }} />);
  };
  curves.forEach((P, i) => [0, 1].forEach((k) => {
    dot(`in${i}${k}`, P, 3.8 + i * 0.3 + k * 1.1, 1.2, false, 'var(--accent2)', 7);
    dot(`out${i}${k}`, P, 6.4 + i * 0.12 + k * 0.9, 1.1, true, 'var(--accent)', 8);
  }));
  const bnd = p(t, 0.9, 1.4, E.out2);
  const top = 330, h = Math.max(660, n * 120 + 180);
  return (
    <>
      <Top t={t} kicker={s.kicker} headline={s.headline} style={{ top: 120 }} />
      <svg viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0 }}>
        <rect x={130} y={top} width={1300} height={h} rx={28} fill="color-mix(in oklab, var(--accent) 2.5%, transparent)" stroke="var(--accent)" strokeOpacity={0.55} strokeWidth={2} strokeDasharray="10 10" strokeDashoffset={400 * (1 - bnd)} opacity={bnd} />
        <text x={170} y={top + 46} style={{ font: '600 18px var(--f-mono)', letterSpacing: '.16em', fill: 'var(--accent)', opacity: p(t, 1.4, 0.6) }}>{s.boundary}</text>
        {curves.map((P, i) => {
          const d = `M${P[0]} C ${P[1]}, ${P[2]}, ${P[3]}`;
          const k = p(t, 2.5 + i * 0.1, 0.9, E.inOut2);
          return <path key={i} d={d} fill="none" strokeWidth={2} stroke={recall > 0 ? `color-mix(in oklab, var(--accent) ${40 * recall}%, var(--border-strong))` : 'var(--border-strong)'} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - k} />;
        })}
        {s.outside && <>
          <path d="M1232 570 L 1600 570" fill="none" stroke="var(--border-strong)" strokeWidth={2} strokeDasharray="6 8" strokeDashoffset={-60 * p(t, 5.6, 1, E.linear)} opacity={p(t, 5.6, 0.3)} />
          <g stroke="var(--danger)" strokeWidth={4} strokeLinecap="round">
            {['M1498 548 l44 44', 'M1542 548 l-44 44'].map((d, i) => {
              const k = p(t, 6.5 + i * 0.1, 0.45, E.back(3));
              return <path key={i} d={d} style={{ transform: `scale(${k})`, transformOrigin: '1520px 570px' }} />;
            })}
          </g>
        </>}
        {particles}
      </svg>
      {src.map((x, i) => (
        <React.Fragment key={i}>
          <div className="tile" style={{ left: 200, top: ys[i] - 36, background: hues[i % hues.length], ...enter(t, 1.6 + i * 0.12, 0.5, { scale: 0.6 }, E.back(2)) }}>{x.initial}</div>
          <div className="agent" style={{ left: 310, top: ys[i] - 30, ...enter(t, 1.9 + i * 0.12, 0.6, { x: -30 }) }}>{x.label}{x.tag && <small>{x.tag}</small>}</div>
        </React.Fragment>
      ))}
      <div className="hub" style={{ opacity: clamp01((t - 2.8) / 0.5), transform: `scale(${mix(0.5, 1, hub)})`, boxShadow: `0 0 ${120 + 80 * pulse(t, 6.2, 0.8, 2)}px color-mix(in oklab, var(--accent) ${18 + 22 * pulse(t, 6.2, 0.8, 2)}%, transparent)` }}>
        <Constellation t={t} at={0} width={220} height={150} big={false} pulseAt={3.6} />
      </div>
      <div className="hub-label" style={enter(t, 3.4, 0.6, { y: 10 })}>{s.hub}</div>
      {s.outside && <>
        <div className="ghost" style={enter(t, 5.4, 0.7, { x: 30 })}><Icon name={s.outside.icon ?? 'cloud'} sw={1} />{s.outside.label}</div>
        <div className="never" style={enter(t, 6.9, 0.7, { y: 16 })}><Rich text={s.outside.note} /></div>
      </>}
      {src.map((_, i) => <Sfx key={i} name="pop-hi" at={1.6 + i * 0.12} vol={0.3} />)}
      <Sfx name="impact-soft" at={2.8} vol={0.5} />
      <Sfx name="ticks" at={3.8} vol={0.25} />
      <Sfx name="ticks" at={6.4} vol={0.3} />
      {s.outside && <Sfx name="lock" at={6.5} vol={0.35} />}
    </>
  );
};

// ------------------------------------------------------------------ record
// One data record, typed in, with callouts that light up the fields they explain.
const Record: React.FC<Props> = ({ s, t }) => {
  const fields: [string, string][] = s.fields ?? [];
  const callouts: any[] = s.callouts ?? [];
  const first = fields[0]?.[1] ?? '';
  const hl = (idx: number) => {
    const c = callouts.findIndex((x) => x.field === idx);
    if (c < 0) return 0;
    const at = 4 + c * 0.9;
    return p(t, at, 0.4) * (1 - p(t, at + 1.2, 0.6));
  };
  const val = (v: string, i: number) => {
    const cls = /^-?[\d.]+$/.test(v.trim()) ? 'n' : 's';
    return <span className={cls}>{i === 0 ? typed(v, t, 1.6, 44) : v}</span>;
  };
  const lines = ['{', ...fields.map(([k, v], i) => ({ k, v, i })), '}'];
  return (
    <>
      <Top t={t} kicker={s.kicker} headline={s.headline} />
      <div className="card" style={{ ...enter(t, 0.9, 1, { y: 60 }), transform: `perspective(1400px) rotateX(${12 * (1 - p(t, 0.9, 1))}deg) ${enter(t, 0.9, 1, { y: 60 }).transform}` }}>
        <div className="card-h"><Icon name="checklist" />{s.cardTitle ?? 'RECORD'}</div>
        <pre>{lines.map((l, j) => (
          <span key={j} className="fl" style={{ ...enter(t, 1.3 + j * 0.12, 0.4, { x: -12 }), background: typeof l === 'object' ? `color-mix(in oklab, var(--accent) ${14 * hl(l.i)}%, transparent)` : undefined }}>
            {typeof l === 'string' ? l : <>  <span className="k">"{l.k}"</span>: {val(l.v, l.i)}{l.i < fields.length - 1 ? ',' : ''}</>}
          </span>
        ))}</pre>
      </div>
      <div className="callouts">
        {callouts.map((c, i) => <div key={i} className="co" style={enter(t, 4 + i * 0.9, 0.7, { x: 40 })}><b>{c.title}</b><p><Rich text={c.body} /></p></div>)}
      </div>
      <Sfx name="whoosh-soft" at={0.9} vol={0.25} />
      <Sfx name="typing" at={1.6} dur={first.length / 44} vol={0.3} />
      {callouts.map((_, i) => <Sfx key={i} name="pop-hi" at={4 + i * 0.9} vol={0.35} />)}
    </>
  );
};

// ------------------------------------------------------------------ metric
// Something growing without bound next to something that stays fixed.
const Metric: React.FC<Props> = ({ s, t }) => {
  const N = 36 * 16;
  const palette = ['var(--accent2)', 'var(--accent)', 'var(--text)', 'color-mix(in oklab, var(--accent) 45%, var(--bg))'];
  const fill = (t - 1.1) / 5 * N;
  const c = s.counter ?? {};
  const cv = Math.round((c.to ?? 0) * E.out2(clamp01((t - 1.1) / 5)));
  const segs: any[] = s.bar?.segments ?? [];
  const segCol = ['var(--accent)', 'color-mix(in oklab, var(--accent) 60%, var(--text))', 'var(--accent2)', 'var(--border-strong)'];
  const ring = pulse(t, 4.6, 0.4, 4);
  return (
    <>
      <Top t={t} kicker={s.kicker} headline={s.headline} />
      <div className="dots" style={{ opacity: p(t, 0.9, 0.5) }}>
        {Array.from({ length: N }, (_, i) => <i key={i} style={{ background: i < fill ? palette[(i * 7 + Math.floor(i / 36) * 3) % 4] : 'var(--border-strong)' }} />)}
      </div>
      <div className="cnt" style={enter(t, 1.0, 0.6)}><b>{cv.toLocaleString('en-US')}</b><span>{c.label}</span></div>
      <div className="budget">
        <div className="lbl" style={{ opacity: p(t, 1.6, 0.5) }}>{s.bar?.label}</div>
        <div className="tbar" style={{ opacity: p(t, 1.7, 0.4), boxShadow: `0 0 0 3px color-mix(in oklab, var(--accent) ${50 * ring}%, transparent)` }}>
          {segs.map((g, i) => <div key={i} className="seg" style={{ width: `${g.share}%`, background: g.color ?? segCol[i % 4], color: i === 3 ? 'var(--text-2)' : undefined, transform: `scaleX(${p(t, 1.9 + i * 0.25, 0.7)})` }}>{g.value}</div>)}
        </div>
        <div className="legend">{segs.map((g, i) => <div key={i} style={enter(t, 2.8 + i * 0.1, 0.5, { y: 10 })}><i style={{ background: g.color ?? segCol[i % 4] }} />{g.label}</div>)}</div>
        {s.big && <div className="fixed" style={enter(t, 3.8, 0.7)}><b>{s.big.value}</b><span>{s.big.label}</span></div>}
      </div>
      <Sfx name="ticks" at={1.1} dur={4.8} vol={0.3} />
      {segs.map((_, i) => <Sfx key={i} name="pop" at={1.9 + i * 0.25} vol={0.35} />)}
      <Sfx name="impact-soft" at={3.8} vol={0.4} />
    </>
  );
};

// ------------------------------------------------------------------ features
// Up to four pillars, with an optional live log underneath as evidence.
const Features: React.FC<Props> = ({ s, t }) => {
  const cards: any[] = s.cards ?? [];
  const rows: any[] = s.log?.rows ?? [];
  let at = 3.0;
  const rowAt = rows.map((r) => { const a = at; at = typeEnd(r.text, at, 60) + 0.25; return a; });
  return (
    <>
      <Top t={t} kicker={s.kicker} headline={s.headline} />
      <div className="cards4" style={{ gridTemplateColumns: `repeat(${cards.length || 1}, 1fr)` }}>
        {cards.map((c, i) => {
          const ik = p(t, 1.4 + i * 0.15, 0.6, E.back(2.5));
          return (
            <div key={i} className="pc" style={enter(t, 1.2 + i * 0.15, 0.8, { y: 50 })}>
              <div className="ic" style={{ transform: `scale(${mix(0.4, 1, ik)}) rotate(${-20 * (1 - ik)}deg)` }}><Icon name={c.icon} /></div>
              <h3>{c.title}</h3><p>{c.body}</p>
            </div>
          );
        })}
      </div>
      {s.log && (
        <div className="log" style={enter(t, 2.6, 0.6)}>
          <div className="ah">{s.log.title}</div>
          {rows.map((r, i) => <div key={i} className="row" style={{ color: r.bad && t > typeEnd(r.text, rowAt[i], 60) ? 'var(--danger)' : undefined }}>{typed(r.text, t, rowAt[i], 60)}</div>)}
        </div>
      )}
      {cards.map((_, i) => <Sfx key={i} name="pop" at={1.2 + i * 0.15} vol={0.3} />)}
      {rows.map((r, i) => <Sfx key={`r${i}`} name="typing" at={rowAt[i]} dur={r.text.length / 60} vol={0.2} />)}
      {rows.some((r) => r.bad) && <Sfx name="lock" at={at - 0.2} vol={0.35} />}
    </>
  );
};

// ------------------------------------------------------------------ split
// Honest status: what exists today next to what is still to come.
const Split: React.FC<Props> = ({ s, t }) => {
  const L: string[] = s.left?.items ?? [], R: string[] = s.right?.items ?? [];
  const rAt = 1.5 + L.length * 0.3 + 0.4;
  return (
    <>
      <Top t={t} kicker={s.kicker} headline={s.headline} />
      <div className="cols">
        <div className="col now">
          <h4 style={enter(t, 1.0, 0.6, { y: 12 })}>{s.left?.title}</h4>
          {L.map((x, i) => (
            <div key={i} className="it" style={enter(t, 1.5 + i * 0.3, 0.5, { x: -24 })}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 8.5 6.5 12 13 4.5" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p(t, 1.6 + i * 0.3, 0.5, E.inOut2)} />
              </svg>{x}
            </div>
          ))}
        </div>
        <div className="col next">
          <h4 style={enter(t, 1.3, 0.6, { y: 12 })}>{s.right?.title}</h4>
          {R.map((x, i) => (
            <div key={i} className="it" style={enter(t, rAt + i * 0.3, 0.5, { x: -24 })}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4} style={{ transform: `rotate(${-180 * (1 - p(t, rAt + i * 0.3, 1))}deg)` }}>
                <circle cx="8" cy="8" r="5.5" strokeDasharray="2.4 2" />
              </svg>{x}
            </div>
          ))}
        </div>
      </div>
      {s.footnote && <div className="footnote" style={{ opacity: p(t, rAt + R.length * 0.3 + 0.5, 0.6) }}>{s.footnote}</div>}
      {L.map((_, i) => <Sfx key={i} name="pop-hi" at={1.6 + i * 0.3} vol={0.35} />)}
      {R.map((_, i) => <Sfx key={`r${i}`} name="tick" at={rAt + i * 0.3} vol={0.25} />)}
    </>
  );
};

// ------------------------------------------------------------------ numbers
// The offer, as numbers that count up, then the price.
const Numbers: React.FC<Props> = ({ s, t }) => {
  const nums: any[] = s.numbers ?? [];
  const count = (v: string, at: number) => {
    const m = String(v).match(/^(\D*?)([\d,]+)(\D*)$/);
    if (!m) return v;
    const n = Number(m[2].replace(/,/g, ''));
    return `${m[1]}${Math.round(n * E.out2(clamp01((t - at) / 1.3))).toLocaleString('en-US')}${m[3]}`;
  };
  return (
    <>
      <Top t={t} kicker={s.kicker} headline={s.headline} stagger={0.1} />
      <div className="nums" style={{ gridTemplateColumns: `repeat(${nums.length || 1}, 1fr)` }}>
        {nums.map((n, i) => (
          <div key={i} className="num" style={{ ...enter(t, 1.1 + i * 0.3, 0.7, { y: 40 }), borderTopColor: `color-mix(in oklab, var(--accent) ${38 * p(t, 1.1 + i * 0.3, 0.8)}%, var(--bg))` }}>
            <b>{count(n.value, 1.2 + i * 0.3)}</b><span>{n.label}</span>
          </div>
        ))}
      </div>
      {s.price && <div className="price" style={enter(t, 3.3, 0.7)}><b>{s.price.value}</b><span>{s.price.label}</span></div>}
      {s.footnote && <div className="walk" style={enter(t, 4.3, 0.7, { y: 14 })}>{s.footnote}</div>}
      {nums.map((_, i) => <Sfx key={i} name="ticks" at={1.2 + i * 0.3} vol={0.25} />)}
      {s.price && <Sfx name="impact-soft" at={3.3} vol={0.45} />}
    </>
  );
};

// ------------------------------------------------------------------ end
const End: React.FC<Props> = ({ s, t, dur }) => {
  const nudge = t > 3 ? Math.sin(Math.PI * clamp01(((t - 3) % 1) / 1)) ** 2 * 4 : 0;
  // The end card holds longest (it is where the music resolves), so it must never freeze:
  // a slow push-in runs the whole scene, and the wordmark's constellation keeps breathing.
  const push = mix(1, 1.045, E.sine(clamp01(t / dur)));
  return (
    <div style={{ position: 'absolute', inset: 0, transform: `scale(${push})` }}>
      <div className="logo" style={{ top: '42%', transform: 'translate(-50%, -50%)' }}>
        <Wordmark t={t} at={0.2} size={190} motif={false} big={false} />
      </div>
      <div className="cta">
        <Words as="h2" text={s.headline} t={t} at={1.3} stagger={0.09} />
        <div className="links">{(s.links ?? []).map((l: string, i: number) => (
          <span key={i} style={enter(t, 2.2 + i * 0.15, 0.7, { y: 24 })}><b style={{ transform: `translate(${nudge}px, ${-nudge}px)` }}>↗</b> {l}</span>
        ))}</div>
      </div>
      <Sfx name="impact" at={0.3} vol={0.9} />
      <Sfx name="shimmer" at={0.5} vol={0.5} />
    </div>
  );
};

// ------------------------------------------------------------------ registry
export const SCENES: Record<string, { C: React.FC<Props>; min: number; voiceAt: number; hideBrand?: boolean }> = {
  terminal: { C: Terminal, min: 10, voiceAt: 1.2 },
  chips:    { C: Chips, min: 8.5, voiceAt: 0.6 },
  blocked:  { C: Blocked, min: 7.5, voiceAt: 2.2 },
  quote:    { C: Quote, min: 6, voiceAt: 0.5 },
  reveal:   { C: Reveal, min: 8, voiceAt: 1.2, hideBrand: true },
  flow:     { C: Flow, min: 10, voiceAt: 0.6 },
  record:   { C: Record, min: 8.5, voiceAt: 0.6 },
  metric:   { C: Metric, min: 8.5, voiceAt: 0.6 },
  features: { C: Features, min: 8.5, voiceAt: 0.6 },
  split:    { C: Split, min: 7.5, voiceAt: 0.6 },
  numbers:  { C: Numbers, min: 7.5, voiceAt: 0.6 },
  end:      { C: End, min: 8, voiceAt: 1.0, hideBrand: true },
};
