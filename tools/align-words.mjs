// Transcribe the mastered voiceover and emit per-beat word timestamps for word-by-word
// caption reveals.
//   node tools/align-words.mjs r09
//
// Beat windows come from timing-<id>.generated.json, which is exact by construction,
// so each spoken word is assigned to the beat whose window contains it.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { loadConfig, stemOf } from './lib/config.mjs';

const cfg = loadConfig();
const stem = stemOf(process.argv[2]);
const P = cfg.paths;

const master = cfg.at(P.audio, `${stem}-master.wav`);
const wordsJson = cfg.at(P.audio, `${stem}-words.json`);
const chunks = JSON.parse(readFileSync(cfg.at(P.audio, `${stem}-chunks.json`), 'utf8'));
const timing = JSON.parse(readFileSync(cfg.at(P.generated, `timing-${stem}.generated.json`), 'utf8'));

// ---- transcribe with word timestamps ----
if (!existsSync(wordsJson)) {
  const py = `
import json, mlx_whisper
r = mlx_whisper.transcribe(${JSON.stringify(master)},
      path_or_hf_repo=${JSON.stringify(cfg.whisper.model)},
      word_timestamps=True)
ws = [{"w": w["word"].strip(), "s": round(w["start"],2), "e": round(w["end"],2)}
      for seg in r["segments"] for w in seg.get("words",[]) if w["word"].strip()]
json.dump({"words": ws}, open(${JSON.stringify(wordsJson)}, "w"))
print("words:", len(ws))
`;
  const pyFile = cfg.at(P.audio, `_whisper-${stem}.py`);
  writeFileSync(pyFile, py);
  const activate = cfg.voice.activate ? `${cfg.voice.activate} && ` : '';
  execFileSync('bash', ['-lc', `${activate}python ${JSON.stringify(pyFile)}`], { stdio: 'inherit' });
}

const { words: spoken } = JSON.parse(readFileSync(wordsJson, 'utf8'));
const norm = (w) => w.toLowerCase().replace(/[^a-z0-9']/g, '');

// ---- align the whole script against the whole spoken stream, then split by beat ----
// The obvious implementation walks a time window per beat and takes inWin[k]
// positionally. Don't: whisper puts the first word of a chunk a few hundredths BEFORE
// the nominal window start, so every beat donates its first word to its predecessor and
// the mapping runs one word late for the whole video -- a beat's final word inherits the
// timestamp of the NEXT beat's first word and pops in at or after the cut, i.e. never
// readable. Fix: one monotonic alignment over the full transcript, with beat boundaries
// applied afterwards by script word count, never by clock time.
const flat = []; // every script word, tagged with the beat it belongs to
chunks.forEach((c, i) =>
  c.text.split(/\s+/).filter(Boolean).forEach((w) => flat.push({ w, beat: i })),
);

const A = flat.map((x) => norm(x.w));
const B = spoken.map((x) => norm(x.w));

// Needleman-Wunsch. A few hundred words a side, so the full matrix is cheap and we get
// a true global alignment instead of a greedy walk that cannot recover from a whisper
// merge ("Five hundred" -> "500") or a hallucinated repeat in the tail.
const GAP = -1, HIT = 2, MISS = -1;
const n = A.length, m = B.length;
const sc = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
for (let i = 1; i <= n; i++) sc[i][0] = i * GAP;
for (let j = 1; j <= m; j++) sc[0][j] = j * GAP;
for (let i = 1; i <= n; i++) {
  for (let j = 1; j <= m; j++) {
    const diag = sc[i - 1][j - 1] + (A[i - 1] === B[j - 1] ? HIT : MISS);
    sc[i][j] = Math.max(diag, sc[i - 1][j] + GAP, sc[i][j - 1] + GAP);
  }
}
const at = new Array(n).fill(null); // script index -> spoken timestamp, or null
{
  let i = n, j = m;
  while (i > 0 && j > 0) {
    const diag = sc[i - 1][j - 1] + (A[i - 1] === B[j - 1] ? HIT : MISS);
    if (sc[i][j] === diag) {
      if (A[i - 1] === B[j - 1]) at[i - 1] = spoken[j - 1].s;
      i--; j--;
    } else if (sc[i][j] === sc[i - 1][j] + GAP) i--;
    else j--;
  }
}

// Words whisper never matched (numerals it rewrote, mumbles) are interpolated between
// their nearest matched neighbours so they still land in the right place.
const aligned = at.filter((v) => v !== null).length;
const firstT = at.find((v) => v !== null) ?? 0;
const lastT = [...at].reverse().find((v) => v !== null) ?? timing[timing.length - 1].start;
for (let k = 0; k < n; k++) {
  if (at[k] !== null) continue;
  let a = k - 1; while (a >= 0 && at[a] === null) a--;
  let b = k + 1; while (b < n && at[b] === null) b++;
  if (a < 0 && b >= n) at[k] = firstT;
  else if (a < 0) at[k] = Math.max(0, at[b] - 0.25 * (b - k));
  else if (b >= n) at[k] = lastT + 0.25 * (k - a);
  else at[k] = at[a] + ((at[b] - at[a]) * (k - a)) / (b - a);
}

// ---- split back into beats, then guarantee the last word is actually readable ----
const { minTail: MIN_TAIL, minStep: MIN_STEP } = cfg.captions;
const out = [];
let cur = 0;
for (let bi = 0; bi < chunks.length; bi++) {
  const beat = flat.filter((f) => f.beat === bi).map((f, k) => ({ w: f.w, s: at[cur + k] }));
  cur += beat.length;

  const winStart = timing[bi].start;
  const winEnd = winStart + timing[bi].seconds;
  // keep it monotonic and inside the beat's own window
  for (let k = 0; k < beat.length; k++) {
    if (beat[k].s < winStart) beat[k].s = winStart;
    if (k > 0 && beat[k].s < beat[k - 1].s) beat[k].s = beat[k - 1].s;
  }
  // pull the tail back off the cut, pushing earlier words only as far as needed
  let limit = winEnd - MIN_TAIL;
  for (let k = beat.length - 1; k >= 0; k--) {
    if (beat[k].s > limit) beat[k].s = limit;
    limit = beat[k].s - MIN_STEP;
  }
  out.push(beat.map((b) => ({ w: b.w, s: +Math.max(0, b.s).toFixed(2) })));
}

writeFileSync(cfg.at(P.generated, `beat-words-${stem}.generated.json`), JSON.stringify(out, null, 1) + '\n');
console.log(
  `${stem}: ${out.length} beats, ${out.flat().length} words timed, ` +
  `${aligned}/${n} matched to whisper (${spoken.length} spoken detected)`,
);
