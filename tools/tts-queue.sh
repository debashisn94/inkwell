#!/usr/bin/env bash
# Sequential TTS queue. ONE generation process at a time -- concurrent runs on the same
# GPU/ANE starve each other and can crash mid-batch, losing the whole run.
#
#   tools/tts-queue.sh r09 r10 r11
#
# Reads audio/<id>-chunks.json, writes audio/<id>-raw/output_NNN.wav.
# Skips any episode that already has a master, so re-running is safe.
#
# Written for VoxCPM's `voxcpm batch` CLI. To use another engine, replace the ENGINE
# block at the bottom -- everything above it is engine-agnostic.
#
# Choosing a reference clip (voice cloning): pick 20-30s of your own natural speech and
# A/B candidates on PITCH. A reference sitting even 1-2 semitones below your real
# speaking pitch is the usual reason a clone "nearly" sounds like you and never quite
# does. Lowest aperiodicity wins ties.
set -uo pipefail
cd "$(dirname "$0")/.."
ROOT=$(pwd)

# Optional: source a conda/venv activate line so non-interactive shells find the engine.
# Set INKWELL_ACTIVATE, or the `voice.activate` key in inkwell.config.json.
ACTIVATE="${INKWELL_ACTIVATE:-$(node -e "
  try { console.log(JSON.parse(require('fs').readFileSync('inkwell.config.json','utf8')).voice?.activate || '') }
  catch { console.log('') }" 2>/dev/null)}"
[ -n "$ACTIVATE" ] && eval "$ACTIVATE"

REF=${REF_WAV:-$ROOT/voice/reference/narrator.wav}
CONTROL="${CONTROL:-Warm and conversational, unhurried, with natural pauses. Speaking to one person, not an audience.}"
CFG=${CFG:-2.5}
STEPS=${STEPS:-24}
LOG=$ROOT/audio/queue.log

[ -f "$REF" ] || { echo "no reference clip at $REF (set REF_WAV=...)"; exit 1; }
mkdir -p "$ROOT/audio"
echo "=== queue start $(date) : $* ===" >> "$LOG"

for STEM in "$@"; do
  CH=$ROOT/audio/${STEM}-chunks.json
  OUT=$ROOT/audio/${STEM}-raw
  [ -f "$CH" ] || { echo "SKIP $STEM: no chunks" >> "$LOG"; continue; }
  if [ -f "$ROOT/audio/${STEM}-master.wav" ]; then echo "SKIP $STEM: master exists" >> "$LOG"; continue; fi

  mkdir -p "$OUT"
  # one tts_text per line, in chunk order
  node -e "
    const cs=require('$CH');
    process.stdout.write(cs.map(c=>c.tts_text.replace(/\s+/g,' ').trim()).join('\n')+'\n');
  " > "$OUT/in.txt"

  N=$(wc -l < "$OUT/in.txt")
  echo "--- $STEM: $N chunks  start $(date +%H:%M:%S)" >> "$LOG"
  T0=$(date +%s)

  # ---- ENGINE (swap this block for another TTS CLI) ----
  voxcpm batch -i "$OUT/in.txt" -od "$OUT" \
    -ra "$REF" --control "$CONTROL" \
    --cfg-value "$CFG" --inference-timesteps "$STEPS" --normalize >> "$LOG" 2>&1
  RC=$?
  # ------------------------------------------------------

  T1=$(date +%s)
  echo "--- $STEM: rc=$RC  ${N} chunks in $((T1-T0))s  ($(( (T1-T0) / (N>0?N:1) ))s/chunk)  $(date +%H:%M:%S)" >> "$LOG"
done

echo "=== queue done $(date) ===" >> "$LOG"
