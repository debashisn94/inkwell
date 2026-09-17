#!/usr/bin/env python3
"""Bake a BVH mocap clip down to 2D sagittal joint angles for a flat character rig.

  python3 tools/bake-bvh.py walk.bvh src/rig/walk-cycle.generated.json

Full 3D forward kinematics -> world joint positions -> project onto the plane the
subject is travelling along -> read 2D angles straight off the bone vectors. Reading
angles from POSITIONS rather than unpicking Euler channel orders is what keeps this
robust across skeletons; only the joint NAME map below is rig-specific.

Output is one normalised stride: `cycle` (24 samples of joint angles, degrees),
`bob` (hip rise and fall per sample), and `strideSeconds`. Loop it and lerp between
samples -- see references/mocap-rigs.md for how the angles map onto SVG transforms.

Free BVH clips: the CMU Graphics Lab Motion Capture Database (mocap.cs.cmu.edu),
which is free for all uses; the cgspeed BVH conversions use the joint names below.
"""
import sys, json, math

# Joint name map. These are the CMU / cgspeed names; retarget by editing
# the right-hand side to match your own skeleton's joint names.
NAMES = {
    'hips': 'Hips', 'neck': 'Neck', 'head': 'Head',
    'thighL': 'LeftUpLeg', 'shinL': 'LeftLeg', 'footL': 'LeftFoot', 'toeL': 'LeftToeBase',
    'thighR': 'RightUpLeg', 'shinR': 'RightLeg', 'footR': 'RightFoot', 'toeR': 'RightToeBase',
    'armL': 'LeftArm', 'foreL': 'LeftForeArm', 'handL': 'LeftHand',
    'armR': 'RightArm', 'foreR': 'RightForeArm', 'handR': 'RightHand',
}

def parse(path):
    toks = open(path).read().split('\n')
    i, joints, stack, order = 0, {}, [], []
    while i < len(toks):
        t = toks[i].strip().split()
        if not t: i += 1; continue
        if t[0] in ('ROOT', 'JOINT'):
            name = t[1]; parent = stack[-1] if stack else None
            joints[name] = {'parent': parent, 'offset': (0,0,0), 'channels': []}
            order.append(name); stack.append(name)
        elif t[0] == 'End': stack.append(None)
        elif t[0] == 'OFFSET' and stack and stack[-1]:
            joints[stack[-1]]['offset'] = tuple(float(x) for x in t[1:4])
        elif t[0] == 'CHANNELS' and stack and stack[-1]:
            joints[stack[-1]]['channels'] = t[2:]
        elif t[0] == '}':
            if stack: stack.pop()
        elif t[0] == 'MOTION':
            n = int(toks[i+1].split()[-1]); dt = float(toks[i+2].split()[-1])
            frames = [[float(x) for x in l.split()] for l in toks[i+3:i+3+n] if l.strip()]
            return joints, order, frames, dt
        i += 1
    raise SystemExit('no MOTION block')

def mul(a, b):
    return [[sum(a[r][k]*b[k][c] for k in range(3)) for c in range(3)] for r in range(3)]
def apply(m, v):
    return tuple(sum(m[r][k]*v[k] for k in range(3)) for r in range(3))
def rot(axis, deg):
    a = math.radians(deg); c, s = math.cos(a), math.sin(a)
    if axis == 'X': return [[1,0,0],[0,c,-s],[0,s,c]]
    if axis == 'Y': return [[c,0,s],[0,1,0],[-s,0,c]]
    return [[c,-s,0],[s,c,0],[0,0,1]]

def fk(joints, order, row):
    """Walk the hierarchy once, return world position of every joint."""
    pos, rmat, ci = {}, {}, 0
    for name in order:
        j = joints[name]; R = [[1,0,0],[0,1,0],[0,0,1]]; tr = (0,0,0)
        for ch in j['channels']:
            v = row[ci]; ci += 1
            if ch.endswith('position'):
                axis = ch[0]; tr = (v if axis=='X' else tr[0], v if axis=='Y' else tr[1], v if axis=='Z' else tr[2])
            else:
                R = mul(R, rot(ch[0], v))
        p = j['parent']
        if p is None:
            pos[name] = tr; rmat[name] = R
        else:
            off = apply(rmat[p], j['offset'])
            pos[name] = tuple(pos[p][k] + off[k] for k in range(3))
            rmat[name] = mul(rmat[p], R)
    return pos

def main():
    if len(sys.argv) < 3:
        raise SystemExit('usage: bake-bvh.py <in.bvh> <out.json>')
    src, dst = sys.argv[1], sys.argv[2]
    joints, order, frames, dt = parse(src)
    miss = [v for v in NAMES.values() if v not in joints]
    if miss: raise SystemExit(f'skeleton missing joints: {miss}')

    world = [fk(joints, order, r) for r in frames]

    # Forward = the horizontal direction the hips actually travelled over the clip.
    h0, h1 = world[0][NAMES['hips']], world[-1][NAMES['hips']]
    fx, fz = h1[0]-h0[0], h1[2]-h0[2]
    n = math.hypot(fx, fz) or 1.0
    fx, fz = fx/n, fz/n

    def to2d(p):
        # x = distance along travel direction; y = screen-down, so world-up is negated
        return (p[0]*fx + p[2]*fz, -p[1])
    def ang(a, b):
        A, B = to2d(a), to2d(b)
        return math.degrees(math.atan2(B[1]-A[1], B[0]-A[0]))

    raw = []
    for w in world:
        g = lambda k: w[NAMES[k]]
        hipR = ang(g('thighR'), g('shinR')); knR = ang(g('shinR'), g('footR')) - hipR
        hipL = ang(g('thighL'), g('shinL')); knL = ang(g('shinL'), g('footL')) - hipL
        shR  = ang(g('armR'),  g('foreR')); elR = ang(g('foreR'), g('handR')) - shR
        shL  = ang(g('armL'),  g('foreL')); elL = ang(g('foreL'), g('handL')) - shL
        spine = ang(g('hips'), g('neck'))
        raw.append({
            'hipR': hipR, 'knR': knR, 'ankR': ang(g('footR'), g('toeR')) - (hipR+knR),
            'hipL': hipL, 'knL': knL, 'ankL': ang(g('footL'), g('toeL')) - (hipL+knL),
            'shR': shR, 'elR': elR, 'shL': shL, 'elL': elL,
            'lean': spine + 90.0,
            'headTilt': ang(g('neck'), g('head')) - spine,
            '_hipY': to2d(g('hips'))[1],
        })

    def wrap(d):  # keep every angle in (-180,180] so lerping never takes the long way
        while d > 180: d -= 360
        while d <= -180: d += 360
        return d
    for f in raw:
        for k in f:
            if not k.startswith('_'): f[k] = wrap(f[k])

    # Find one stride by autocorrelating the thigh-swing signal.
    sig = [f['hipR'] for f in raw]
    mean = sum(sig)/len(sig); sig = [s-mean for s in sig]
    best, bestScore = None, -1e18
    for lag in range(int(0.35/dt), min(int(2.0/dt), len(sig)-2)):
        pairs = len(sig)-lag
        if pairs < 20: break
        score = sum(sig[i]*sig[i+lag] for i in range(pairs))/pairs
        if score > bestScore: bestScore, best = score, lag
    period = best
    start = max(range(len(raw)-period), key=lambda i: raw[i]['hipR'])  # begin at full forward reach

    OUT = 24  # samples per stride — plenty at 30fps, and cheap to lerp
    cycle = []
    for i in range(OUT):
        src_i = start + (i * period / OUT)
        a, b = int(src_i), min(int(src_i)+1, len(raw)-1)
        t = src_i - a
        cycle.append({k: round(raw[a][k] + (wrap(raw[b][k]-raw[a][k]))*t, 3)
                      for k in raw[a] if not k.startswith('_')})

    hipYs = [raw[start + int(i*period/OUT)]['_hipY'] for i in range(OUT)]
    base = min(hipYs)
    bob = [round(y - base, 3) for y in hipYs]

    json.dump({'source': src.split('/')[-1], 'samples': OUT,
               'strideSeconds': round(period*dt, 4), 'bob': bob, 'cycle': cycle},
              open(dst, 'w'), indent=1)
    print(f'{len(frames)} frames @ {1/dt:.0f}fps -> stride {period} frames ({period*dt:.3f}s) -> {OUT} samples')
    print(f'hipR range {min(c["hipR"] for c in cycle):.1f}..{max(c["hipR"] for c in cycle):.1f}  '
          f'knR range {min(c["knR"] for c in cycle):.1f}..{max(c["knR"] for c in cycle):.1f}')
    print(f'wrote {dst}')

main()
