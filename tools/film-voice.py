"""Narration for a film: one consistent narrator, an expressive read per line.

    python ../tools/film-voice.py                 # anchor (if missing) + every line
    python ../tools/film-voice.py --lines 3 8     # re-roll just these scenes
    python ../tools/film-voice.py --takes 3       # more takes to choose from
    python ../tools/film-voice.py --pick 5:1      # override the choice for scene 5
    python ../tools/film-voice.py --skip-generate # re-score / re-master existing takes

Run from the film project directory (the one with film.json), inside the Python
environment that has VoxCPM (`pip install voxcpm`).

Why an anchor: voice-design models invent a new speaker on every call, so designing each
line separately gives you eleven different narrators. Instead the narrator is designed
ONCE into voice/reference/narrator.wav, and every line is a controllable clone of it --
same timbre, with the line's `emotion` steering delivery. Bring your own recording as
narrator.wav to narrate in your own voice.

Every take is scored, and the best one per line is kept:
  accuracy  -- words transcribed back vs the script (needs `mlx_whisper` or `whisper` on
               PATH; skipped if neither is installed)
  identity  -- speaker similarity to the anchor (needs `transformers`; skipped if absent).
               Catches a take that drifted into a different voice.
  pace      -- words per second; outside ~1.8-3.6 usually means dropped or garbled words
  range     -- pitch spread in semitones; more range = more expressive delivery
Takes that fail a gate are discarded; the most expressive survivor wins.
"""
import argparse, difflib, json, os, re, shutil, subprocess, sys

ap = argparse.ArgumentParser()
ap.add_argument('--lines', nargs='*', type=int, help='scene numbers to (re)generate')
ap.add_argument('--takes', type=int, default=2)
ap.add_argument('--pick', nargs='*', default=[], help='scene:take overrides, e.g. 5:1')
ap.add_argument('--skip-generate', action='store_true')
ap.add_argument('--cfg', type=float, default=2.0)
ap.add_argument('--steps', type=int, default=24)
args = ap.parse_args()

if not os.path.exists('film.json'):
    sys.exit('run this from the film project directory (no film.json here)')
film = json.load(open('film.json'))
scenes = [(i + 1, s['voice']) for i, s in enumerate(film['scenes']) if s.get('voice', {}).get('text')]
todo = [n for n, _ in scenes if not args.lines or n in args.lines]
ANCHOR = 'voice/reference/narrator.wav'
TAKES = 'audio/film-takes'
os.makedirs(TAKES, exist_ok=True); os.makedirs('public/voice', exist_ok=True); os.makedirs(os.path.dirname(ANCHOR), exist_ok=True)

ANCHOR_TEXT = ("You know that feeling when something finally just works? That's what we built. "
               "No more starting from zero. No more explaining the same thing twice. "
               "It remembers, so your whole team can move faster. Honestly? It's the thing I wish we'd had years ago.")

# ------------------------------------------------------------------ scoring helpers
def words(s):
    s = s.lower()
    for a, b in [('1', ' one '), ('2', ' two '), ('3', ' three '), ('8', ' eight '), ('12', ' twelve '), ('30', ' thirty ')]:
        s = re.sub(rf'\b{a}\b', b, s)
    return re.sub(r"[^a-z0-9' ]", ' ', s.replace('license', 'licence')).split()

WHISPER = shutil.which('mlx_whisper') or shutil.which('whisper')
def transcribe(wav):
    if not WHISPER: return None
    out = os.path.join(TAKES, '_tx'); os.makedirs(out, exist_ok=True)
    brand = f"{film.get('brandName', '')}, {film.get('wordmark', '')}."
    cmd = [WHISPER, wav, '--language', 'en', '-f', 'txt', '--output-dir', out, '--initial-prompt', brand]
    if 'mlx' in WHISPER: cmd += ['--model', 'mlx-community/whisper-small-mlx', '--verbose', 'False']
    subprocess.run(cmd, capture_output=True)
    f = os.path.join(out, os.path.basename(wav)[:-4] + '.txt')
    return open(f).read() if os.path.exists(f) else None

_spk = None
def identity(wav):
    global _spk
    try:
        import torch, librosa
        from transformers import AutoFeatureExtractor, WavLMForXVector
    except Exception:
        return None
    if _spk is None:
        fe = AutoFeatureExtractor.from_pretrained('microsoft/wavlm-base-plus-sv')
        m = WavLMForXVector.from_pretrained('microsoft/wavlm-base-plus-sv').eval()
        def emb(f):
            y, _ = librosa.load(f, sr=16000)
            with torch.no_grad():
                return torch.nn.functional.normalize(m(**fe(y, sampling_rate=16000, return_tensors='pt')).embeddings[0], dim=-1)
        _spk = (emb, emb(ANCHOR))
    emb, ref = _spk
    return float(ref @ emb(wav))

def pitch_range(wav):
    import librosa, numpy as np
    y, sr = librosa.load(wav, sr=16000)
    f0 = librosa.yin(y, fmin=65, fmax=320, sr=sr)
    rms = librosa.feature.rms(y=y)[0][:len(f0)]
    f = f0[rms > np.percentile(rms, 60)]
    st = 12 * np.log2(f / np.median(f))
    return float(np.percentile(st, 90) - np.percentile(st, 10))

def seconds(wav):
    return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', wav]))

# ------------------------------------------------------------------ generate
if not args.skip_generate:
    import numpy as np, soundfile as sf
    from voxcpm import VoxCPM
    model = VoxCPM.from_pretrained('openbmb/VoxCPM2')
    sr = model.tts_model.sample_rate
    def gen(text, ref=None):
        w = model.generate(text=text, reference_wav_path=ref, cfg_value=args.cfg, inference_timesteps=args.steps)
        return w * (0.95 / (np.max(np.abs(w)) + 1e-9))

    if not os.path.exists(ANCHOR):
        desc = film.get('narrator')
        if not desc: sys.exit(f'no {ANCHOR} and no "narrator" description in film.json')
        print('-> designing the narrator (3 candidates)')
        best = None
        for k in range(3):
            f = f'voice/reference/candidate{k}.wav'
            sf.write(f, gen(f'({desc}){ANCHOR_TEXT}'), sr)
            tx = transcribe(f)
            acc = difflib.SequenceMatcher(None, words(ANCHOR_TEXT), words(tx)).ratio() if tx else 1.0
            rng = pitch_range(f)
            print(f'   candidate{k}  accuracy {acc:.2f}  range {rng:.1f}st')
            if acc >= 0.9 and (best is None or rng > best[0]): best = (rng, f)
        if not best: sys.exit('no narrator candidate transcribed cleanly; re-run or supply narrator.wav')
        shutil.copy(best[1], ANCHOR)
        print(f'   narrator = {best[1]}  (listen to the others; copy one over narrator.wav to switch)')

    for n, v in scenes:
        if n not in todo: continue
        for k in range(args.takes):
            f = f'{TAKES}/s{n:02d}_{k}.wav'
            text = f"({v['emotion']}){v['text']}" if v.get('emotion') else v['text']
            sf.write(f, gen(text, ANCHOR), sr)
            print(f'   scene {n} take {k}  {seconds(f):.2f}s', flush=True)

# ------------------------------------------------------------------ score + pick
prev = json.load(open('voice.generated.json')) if os.path.exists('voice.generated.json') else {}
keep = {l['scene']: l for l in prev.get('lines', [])}
picks = {int(a): int(b) for a, b in (x.split(':') for x in args.pick)}
print('\n scene take   sec   w/s   acc   id    range')
for n, v in scenes:
    if n not in todo and n not in picks and n in keep: continue
    takes = sorted(f for f in os.listdir(TAKES) if re.match(rf's{n:02d}_\d+\.wav$', f))
    if not takes: print(f'  {n:>3}  (no takes)'); continue
    rows = []
    for f in takes:
        path = f'{TAKES}/{f}'; k = int(f[4:-4]); d = seconds(path)
        wps = len(words(v['text'])) / d
        tx = transcribe(path)
        acc = difflib.SequenceMatcher(None, words(v['text']), words(tx)).ratio() if tx else None
        sim = identity(path); rng = pitch_range(path)
        ok = (acc is None or acc >= 0.9) and (sim is None or sim >= 0.93) and 1.8 <= wps <= 3.6
        rows.append(dict(k=k, path=path, d=d, wps=wps, acc=acc, sim=sim, rng=rng, ok=ok))
    good = [r for r in rows if r['ok']] or rows
    best = next((r for r in rows if r['k'] == picks[n]), None) if n in picks else max(good, key=lambda r: r['rng'])
    for r in rows:
        mark = '*' if r is best else ' ' if r['ok'] else 'x'
        fmt = lambda x, s: f'{x:{s}}' if x is not None else '  -  '
        print(f' {mark}{n:>3}  {r["k"]:>3}  {r["d"]:5.2f}  {r["wps"]:4.2f}  {fmt(r["acc"], ".2f")}  {fmt(r["sim"], ".2f")}  {r["rng"]:4.1f}st')
    # master: each line to the same loudness so no line jumps out of the mix
    out = f'public/voice/s{n:02d}.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', best['path'], '-af',
                    'highpass=f=70,loudnorm=I=-18:TP=-2:LRA=7,aresample=48000', '-ac', '1', '-c:a', 'pcm_s16le', out], check=True)
    keep[n] = {'scene': n, 'file': f'voice/s{n:02d}.wav', 'seconds': round(seconds(out), 3), 'take': best['k'],
               'text': v['text'], 'wps': round(best['wps'], 2), 'accuracy': best['acc'], 'identity': best['sim']}

json.dump({'narrator': ANCHOR, 'lines': [keep[k] for k in sorted(keep)]}, open('voice.generated.json', 'w'), indent=1)
print(f'\n-> voice.generated.json  ({len(keep)} lines).  * = picked, x = failed a gate. Listen before you ship.')
