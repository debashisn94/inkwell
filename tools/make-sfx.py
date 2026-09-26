# Synthesize the film sound-design kit: short, dry, brand-neutral one-shots.
#   python tools/make-sfx.py [out_dir]      (default: film-template/public/sfx)
#
# Everything is generated from noise and sine partials, so the kit carries no licence
# baggage and can be regenerated or re-tuned in one place. Needs numpy, scipy, soundfile.
#
# Kept deliberately dry and quiet-peaked: these sit ~10 dB under narration, and anything
# with a long tail or a bright transient competes with speech consonants.
import sys, os, numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, stft, istft

SR = 48000
rng = np.random.default_rng(7)
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', 'film-template', 'public', 'sfx')
os.makedirs(OUT, exist_ok=True)

def env(n, a=0.002, d=0.1):
    t = np.arange(n) / SR
    return np.minimum(t / a, 1) * np.exp(-t / d)
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], 'bandpass', fs=SR, output='sos'), x)
def lp(x, f): return sosfilt(butter(2, f, 'lowpass', fs=SR, output='sos'), x)

def click():
    n = int(.03 * SR)
    return bp(rng.standard_normal(n), 1800, 6500) * env(n, .0005, .006) * rng.uniform(.6, 1)

def typing(seconds, cps):
    # Loopable: clicks never straddle the loop point.
    n = int(seconds * SR); y = np.zeros(n)
    for k in range(int(seconds * cps)):
        c = click(); i = int((k / cps + rng.uniform(0, .008)) * SR)
        if i + len(c) < n: y[i:i+len(c)] += c
    return y

def pop(f0=900, f1=620, dur=.09):
    n = int(dur * SR); f = np.linspace(f0, f1, n)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, .002, dur / 3)

def whoosh(dur=.7, f_lo=300, f_hi=4000):
    n = int(dur * SR); x = rng.standard_normal(n)
    f, _, Z = stft(x, SR, nperseg=1024)
    prog = np.linspace(0, 1, Z.shape[1]); c = f_lo * (f_hi / f_lo) ** prog
    mask = np.exp(-((np.log(f[:, None] + 1) - np.log(c[None, :])) ** 2) / .35)
    _, y = istft(Z * mask, SR, nperseg=1024); y = y[:n]
    return y / (np.max(np.abs(y)) + 1e-9) * np.sin(np.pi * np.linspace(0, 1, n)) ** 2

def impact(f0=95, f1=42, dur=1.6):
    n = int(dur * SR); f = np.geomspace(f0, f1, n)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, .003, .45)
    return sub * .9 + lp(rng.standard_normal(n), 1400) * env(n, .001, .05) * .5

def riser(dur=1.4):
    n = int(dur * SR); t = np.linspace(0, 1, n)
    tone = np.sin(2 * np.pi * np.cumsum(np.geomspace(180, 720, n)) / SR) * .25
    return (whoosh(dur, 200, 6000) * .8 + tone) * t ** 2.2

def lock():
    n = int(.5 * SR); t = np.arange(n) / SR
    thud = np.sin(2 * np.pi * 70 * t) * env(n, .001, .09)
    metal = sum(np.sin(2 * np.pi * f * t) * a for f, a in [(2150, .5), (3420, .35), (5230, .2)]) * env(n, .0005, .05)
    return thud * .9 + metal * .5 + lp(rng.standard_normal(n), 3000) * env(n, .0005, .02) * .6

def tick(f=1500):
    n = int(.02 * SR); return np.sin(2 * np.pi * f * np.arange(n) / SR) * env(n, .0005, .005)

def ticks(seconds=1.2, every=.12, f0=900, f1=1600):
    n = int(seconds * SR); y = np.zeros(n); k = 0
    while k * every < seconds - .03:
        c = tick(f0 + (f1 - f0) * k * every / seconds); i = int(k * every * SR); y[i:i+len(c)] += c; k += 1
    return y

def shimmer(dur=1.4):
    n = int(dur * SR); y = np.zeros(n)
    for f in [2637, 3136, 3951, 5274]:
        i = int(rng.uniform(0, .4) * SR); m = n - i
        y[i:] += np.sin(2 * np.pi * f * np.arange(m) / SR) * env(m, .01, .35) * .25
    return y

KIT = {
    'whoosh':       (whoosh(.8, 400, 5000), .5),
    'whoosh-soft':  (whoosh(1.1, 150, 1500), .4),
    'wipe':         (whoosh(.5, 3000, 300), .6),
    'dissolve':     (whoosh(1.6, 4000, 600), .5),
    'pop':          (pop(), .6),
    'pop-hi':       (pop(1200, 1000, .07), .5),
    'tick':         (tick(2200), .6),
    'ticks':        (ticks(), .35),
    'lock':         (lock(), .9),
    'impact':       (impact(), .95),
    'impact-soft':  (impact(110, 60, .8), .6),
    'riser':        (riser(1.3), .7),
    'shimmer':      (shimmer(), .5),
    'typing':       (typing(2.0, 44), .45),
    'typing-slow':  (typing(1.0, 14), .55),
}
for name, (y, peak) in KIT.items():
    y = y / (np.max(np.abs(y)) + 1e-9) * peak
    sf.write(os.path.join(OUT, f'{name}.wav'), y.astype(np.float32), SR, subtype='PCM_16')
print(f'wrote {len(KIT)} sounds to {os.path.abspath(OUT)}')
