# Holt Teams: a narrated launch film

A 1:51 launch film for [Holt Teams](https://productsdecoded.com/holt), built entirely by
inkwell's film pipeline. The picture, narration and sound design all come from
[`film.json`](film.json).

**[Watch it: `holt-teams-film.mp4`](holt-teams-film.mp4)**

- 11 scenes, using 10 of the 12 scene types
- One designed narrator, cloned for every line, with a separate emotion per line
- Synthesized sound design (typing, whooshes, the lock slam, the logo impact) fired by each scene's own cues

## Render it yourself

The mastered narration is committed in `public/voice/`, so this renders without a TTS
setup:

```bash
cd examples/holt-teams-film
npm install
node ../../tools/render-film.mjs --stems
```

To re-voice it, you need VoxCPM plus a narrator reference at
`voice/reference/narrator.wav` (not committed). Without one, `film-voice.py` designs a
new narrator from the `narrator` description in `film.json`:

```bash
python ../../tools/film-voice.py --takes 2
```

## What to look at

- **Scene 3 (`blocked`)**: two beats in one scene. The lock slams on the obvious fix, then
  a real quote takes over. The narration starts 2.2s in, so "security won't sign that"
  lands with the lock.
- **Scene 5 (`flow`)**: cyan particles carry writes into the hub, then amber particles
  carry recall back out to every source.
- **Scene 9 (`split`)**: the honest part. Shipped features on the left, planned ones on
  the right. A launch film that blurs the two is a liability.
