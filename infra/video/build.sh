#!/usr/bin/env bash
# End-to-end demo video builder. Idempotent.
#
#   title (3s) + dashboard (recorded, ~70s) + end card (rest) = silent video
#   audio: 3s silence + TTS narration + 2s tail
#   muxed = docs/synth-demo.mp4
#
# The end card duration is computed so total_duration ≥ 3 + tts_duration + 2.

set -euo pipefail
cd "$(dirname "$0")"

OUT_FINAL="../../docs/synth-demo.mp4"
TTS_MP3="../../docs/demo_narration.mp3"
TMP="./build"
mkdir -p "$TMP"

TITLE_LEAD=3            # seconds of title card before TTS begins
AUDIO_TAIL=2            # seconds of silence after TTS ends

# ─── 1. Title + end PNGs ─────────────────────────────────────────────────
if [[ ! -f "$TMP/title.png" || ! -f "$TMP/end.png" ]]; then
  echo "→ render title.png + end.png"
  node -e '
  const { chromium } = require("playwright");
  const path = require("path");
  (async () => {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({
      viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1,
    });
    for (const name of ["title", "end"]) {
      const p = await ctx.newPage();
      await p.goto("file://" + path.resolve(`${name}.html`));
      await p.waitForTimeout(1700);
      await p.screenshot({ path: `${process.argv[1]}/${name}.png`, type: "png" });
      await p.close();
    }
    await ctx.close(); await browser.close();
  })();
  ' "$TMP"
fi

# ─── 2. Dashboard recording (skip if exists) ─────────────────────────────
if [[ ! -f "recordings/dashboard.webm" ]]; then
  echo "→ playwright dashboard recording"
  node record.mjs
fi
DASH_WEBM="recordings/dashboard.webm"
test -f "$DASH_WEBM"

# ─── 3. Re-encode dashboard webm → mp4 ───────────────────────────────────
echo "→ dashboard.mp4 (re-encode)"
ffmpeg -y -loglevel error -i "$DASH_WEBM" \
  -vf "fps=30,format=yuv420p,scale=1920:1080" \
  -c:v libx264 -preset veryfast -crf 20 "$TMP/dashboard.mp4"

DASH_DUR=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$TMP/dashboard.mp4")
TTS_DUR=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$TTS_MP3")
echo "  dashboard = ${DASH_DUR}s  tts = ${TTS_DUR}s"

# ─── 4. Compute end-card duration ────────────────────────────────────────
# Need total video ≥ TITLE_LEAD + TTS_DUR + AUDIO_TAIL.
TOTAL_TARGET=$(python3 -c "print(${TITLE_LEAD} + ${TTS_DUR} + ${AUDIO_TAIL})")
END_DUR=$(python3 -c "print(max(8, ${TOTAL_TARGET} - ${TITLE_LEAD} - ${DASH_DUR}))")
TOTAL_DUR=$(python3 -c "print(${TITLE_LEAD} + ${DASH_DUR} + ${END_DUR})")
echo "  end card = ${END_DUR}s  →  total video = ${TOTAL_DUR}s"

# ─── 5. Title + end mp4s ─────────────────────────────────────────────────
echo "→ title.mp4 (${TITLE_LEAD}s)"
ffmpeg -y -loglevel error -loop 1 -t ${TITLE_LEAD} -i "$TMP/title.png" \
  -vf "fps=30,format=yuv420p,scale=1920:1080" \
  -c:v libx264 -preset veryfast -crf 18 "$TMP/title.mp4"

echo "→ end.mp4 (${END_DUR}s)"
ffmpeg -y -loglevel error -loop 1 -t ${END_DUR} -i "$TMP/end.png" \
  -vf "fps=30,format=yuv420p,scale=1920:1080" \
  -c:v libx264 -preset veryfast -crf 18 "$TMP/end.mp4"

# ─── 6. Concat silent video ──────────────────────────────────────────────
echo "→ concat silent video"
{
  echo "file '$(realpath "$TMP/title.mp4")'"
  echo "file '$(realpath "$TMP/dashboard.mp4")'"
  echo "file '$(realpath "$TMP/end.mp4")'"
} > "$TMP/concat.txt"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$TMP/concat.txt" \
  -c copy "$TMP/silent.mp4"

# ─── 7. Build audio track using bounded inputs (FINITE silence) ──────────
echo "→ build audio track"
# leading silence
ffmpeg -y -loglevel error -f lavfi -t ${TITLE_LEAD} \
  -i "anullsrc=channel_layout=stereo:sample_rate=24000" \
  -c:a aac -b:a 192k "$TMP/lead.m4a"
# trailing silence
ffmpeg -y -loglevel error -f lavfi -t ${AUDIO_TAIL} \
  -i "anullsrc=channel_layout=stereo:sample_rate=24000" \
  -c:a aac -b:a 192k "$TMP/tail.m4a"
# convert TTS to aac
ffmpeg -y -loglevel error -i "$TTS_MP3" \
  -ar 24000 -ac 2 -c:a aac -b:a 192k "$TMP/tts.m4a"
# concat all audio
{
  echo "file '$(realpath "$TMP/lead.m4a")'"
  echo "file '$(realpath "$TMP/tts.m4a")'"
  echo "file '$(realpath "$TMP/tail.m4a")'"
} > "$TMP/audio_concat.txt"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$TMP/audio_concat.txt" \
  -c copy "$TMP/audio.m4a"

# ─── 8. Mux ──────────────────────────────────────────────────────────────
echo "→ mux final"
mkdir -p "$(dirname "$OUT_FINAL")"
ffmpeg -y -loglevel error -i "$TMP/silent.mp4" -i "$TMP/audio.m4a" \
  -c:v copy -c:a copy -shortest "$OUT_FINAL"

echo ""
echo "✓ wrote $OUT_FINAL"
ls -lh "$OUT_FINAL"
FINAL_DUR=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$OUT_FINAL")
echo "  duration: ${FINAL_DUR}s"
