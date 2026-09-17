// Every tool reads its knobs from here so nothing is hardcoded to one project layout.
// Drop an inkwell.config.json next to your package.json to override any of it.
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const DEFAULTS = {
  paths: {
    audio: 'audio',       // chunks.json, raw TTS output, mastered wavs
    src: 'src',           // Remotion sources; generated timing lands in src/videos
    generated: 'src/videos',
    out: 'out',           // rendered mp4s
    public: 'public',     // what Remotion serves at runtime
    entry: 'src/index.ts',
  },
  voice: {
    reference: 'voice/reference/narrator.wav',
    control: 'Warm and conversational, unhurried, with natural pauses. Speaking to one person, not an audience.',
    cfg: 2.5,
    steps: 24,
    // Shell snippet sourced before python/voxcpm run — set this if your TTS and
    // whisper live in a conda/venv that a non-interactive shell will not find.
    activate: '',
  },
  pace: {
    targetWps: 2.65,   // words per second the whole series should sit at
    tolerance: 0.12,   // leave any chunk within this fraction of target alone
    minFactor: 0.70,
    maxFactor: 1.35,
  },
  audio: {
    lead: 0.45,        // silence before the first word
    tail: 1.2,         // silence after the last
    gapSection: 0.80,
    gapPara: 0.34,
    gapLine: 0.16,
    sampleRate: 48000,
    master: 'highpass=f=75,deesser=i=0.35,acompressor=threshold=-18dB:ratio=2.6:attack=12:release=220,loudnorm=I=-16:TP=-1.5:LRA=11',
  },
  // A sign-off spoken at the end of every episode re-rolls the TTS dice each build,
  // so a bad take lands at random. Point these at one vetted recording to stop that.
  signoff: { text: null, wav: null },
  whisper: { model: 'mlx-community/whisper-large-v3-turbo' },
  qa: {
    blankYmin: 180,    // luma below this means real ink is on the frame
    probeAt: 0.6,      // sample this far into each beat
  },
  render: {
    browser: process.env.CHROME_PATH || '',
    concurrency: 4,
    port: 3333,
  },
  captions: {
    minTail: 0.45,     // a word needs this long on screen for its reveal to finish
    minStep: 0.10,     // ...without stacking two words onto one frame
  },
  chunk: { maxWords: 30 },
};

const merge = (a, b) => {
  const out = { ...a };
  for (const [k, v] of Object.entries(b || {})) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) ? merge(a[k] || {}, v) : v;
  }
  return out;
};

export function loadConfig(root = process.cwd()) {
  const file = join(root, 'inkwell.config.json');
  const user = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  const cfg = merge(DEFAULTS, user);
  cfg.root = resolve(root);
  cfg.at = (...p) => join(cfg.root, ...p);
  return cfg;
}

// Episode ids are free-form ("r09", "yt02", "ep-intro"); tools only ever use them
// as a filename stem, so nothing here assumes a numbering scheme.
export function stemOf(arg) {
  if (!arg) {
    console.error('missing episode id');
    process.exit(1);
  }
  return String(arg);
}
