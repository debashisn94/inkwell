// Stitch an episode's raw TTS chunks into a mastered master.wav, then emit the
// deterministic beat timing. One episode per invocation.
//   node tools/finish-audio.mjs r09
//
// Gaps: LEAD before the first word so it does not start abruptly, TAIL so it does not
// cut dead, and a pause before each chunk sized by whether it opens a paragraph or a
// section. The timing this writes is exact BY CONSTRUCTION -- it is computed from the
// durations being concatenated, not measured back off the finished file -- which is what
// lets align-words.mjs trust the beat windows later.
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { loadConfig, stemOf } from './lib/config.mjs';

const cfg = loadConfig();
const stem = stemOf(process.argv[2]);
const P = cfg.paths;
const { lead: LEAD, tail: TAIL, gapSection: GAP_SECTION, gapPara: GAP_PARA,
        gapLine: GAP_LINE, sampleRate: SR, master: MASTER_FILTER } = cfg.audio;

// A sign-off spoken at the end of every episode gets re-rolled by the TTS on each build,
// so a bad take lands at random -- across one 36-episode series the model produced
// "Link in air", "Link in beer", and a sentence broken in the wrong place. Point
// config.signoff at one vetted recording and the dice are gone. Matching is on the
// on-screen `text`, so an episode whose sign-off differs is left alone.
const SIGNOFF_TEXT = cfg.signoff.text;
const SIGNOFF_WAV = cfg.signoff.wav ? cfg.at(cfg.signoff.wav) : null;

const chunks = JSON.parse(readFileSync(cfg.at(P.audio, `${stem}-chunks.json`), 'utf8'));
const rawDir = cfg.at(P.audio, `${stem}-raw`);
const tmp = join(rawDir, '_tmp');
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });

const dur = (f) => parseFloat(execFileSync('ffprobe',
  ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim());

const silence = (secs) => {
  const f = join(tmp, `sil-${secs.toFixed(3)}.wav`);
  if (!existsSync(f)) {
    execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', `anullsrc=r=${SR}:cl=mono`,
      '-t', String(secs), '-c:a', 'pcm_s16le', '-y', f]);
  }
  return f;
};

// ---- build the concat list and the beat start times in one pass ----
const parts = [];
const timing = [];
let t = 0;
let signoffSwapped = false;

parts.push(silence(LEAD)); t += LEAD;

chunks.forEach((c, i) => {
  if (i > 0) {
    const gap = c.first_in_section ? GAP_SECTION : c.first_in_para ? GAP_PARA : GAP_LINE;
    parts.push(silence(gap));
    t += gap;
  }
  let wav = join(rawDir, `output_${String(i + 1).padStart(3, '0')}.wav`);
  if (SIGNOFF_TEXT && c.text.trim() === SIGNOFF_TEXT && SIGNOFF_WAV && existsSync(SIGNOFF_WAV)) {
    wav = SIGNOFF_WAV; // the vetted take, not this build's roll of the dice
    signoffSwapped = true;
  }
  if (!existsSync(wav)) throw new Error(`missing chunk audio: ${wav}`);
  // Beat i starts where its speech starts, minus the gap that precedes it, so the pause
  // is held by the OUTGOING beat and nothing drifts. Beat 0 absorbs the lead-in.
  timing.push({ start: i === 0 ? 0 : +t.toFixed(3) });
  parts.push(wav);
  t += dur(wav);
});
const audioEnd = t + TAIL;
parts.push(silence(TAIL));

// each beat runs until the NEXT beat's start -- this is the fix for gap drift
for (let i = 0; i < timing.length; i++) {
  const next = i + 1 < timing.length ? timing[i + 1].start : audioEnd;
  timing[i].seconds = +(next - timing[i].start).toFixed(3);
}

const listFile = join(tmp, 'list.txt');
writeFileSync(listFile, parts.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n') + '\n');

const stitched = join(rawDir, 'stitched.wav');
execFileSync('ffmpeg', ['-v', 'error', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', '-y', stitched]);

// master: clean the low end, tame sibilance, even out level, normalise loudness
const master = cfg.at(P.audio, `${stem}-master.wav`);
execFileSync('ffmpeg', ['-v', 'error', '-i', stitched, '-af', MASTER_FILTER,
  '-ar', String(SR), '-c:a', 'pcm_s16le', '-y', master]);

// the file the renderer actually plays
mkdirSync(cfg.at(P.public), { recursive: true });
const pub = cfg.at(P.public, `vo-${stem}.m4a`);
execFileSync('ffmpeg', ['-v', 'error', '-i', master, '-c:a', 'aac', '-b:a', '160k', '-y', pub]);

mkdirSync(cfg.at(P.generated), { recursive: true });
writeFileSync(cfg.at(P.generated, `timing-${stem}.generated.json`), JSON.stringify(timing, null, 1) + '\n');
rmSync(tmp, { recursive: true, force: true });

const totalWords = chunks.reduce((a, c) => a + c.words, 0);
console.log(`${stem}: ${chunks.length} chunks -> ${audioEnd.toFixed(2)}s master, ` +
  `${(totalWords / audioEnd).toFixed(2)} w/s${signoffSwapped ? ' [canonical sign-off]' : ''}`);
