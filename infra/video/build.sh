#!/usr/bin/env bash
# End-to-end demo video builder. Idempotent.
#
# Sequence (silent):
#   title (3s)
#   architecture.webm (25s)
#   dashboard.webm   (~85s)
#   terminal.webm    (16s)
#   fivetran.webm    (14s)
#   bigquery.webm    (10s)
#   end card         (computed: total ≥ TITLE_LEAD + TTS + AUDIO_TAIL)
#
# Audio:
#   TITLE_LEAD seconds of silence + TTS narration + AUDIO_TAIL seconds of silence
#
# Output: docs/synth-demo.mp4

set -euo pipefail
cd "$(dirname "$0")"

OUT_FINAL="../../docs/synth-demo.mp4"
TTS_MP3="../../docs/demo_narration.mp3"
TMP="./build"
mkdir -p "$TMP"

TITLE_LEAD=3
AUDIO_TAIL=2

# ─── 1. Title + end PNGs (re-render if missing) ──────────────────────────
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

# ─── 2. Animated scene webms ─────────────────────────────────────────────
if [[ ! -f recordings/architecture.webm \
   || ! -f recordings/terminal.webm \
   || ! -f recordings/fivetran.webm \
   || ! -f recordings/bigquery.webm ]]; then
  echo "→ record scenes (architecture, terminal, fivetran, bigquery)"
  node record_scenes.mjs
fi

# ─── 3. Dashboard recording ──────────────────────────────────────────────
if [[ ! -f recordings/dashboard.webm ]]; then
  echo "→ record dashboard"
  node record.mjs
fi
test -f recordings/dashboard.webm

# ─── 4. Re-encode each webm → mp4 (keeps concat clean) ───────────────────
encode() {
  local src="$1" dst="$2"
  ffmpeg -y -loglevel error -i "$src" \
    -vf "fps=30,format=yuv420p,scale=1920:1080" \
    -c:v libx264 -preset veryfast -crf 20 "$dst"
}

echo "→ re-encode scene clips"
encode recordings/architecture.webm "$TMP/architecture.mp4"
encode recordings/dashboard.webm    "$TMP/dashboard.mp4"
encode recordings/terminal.webm     "$TMP/terminal.mp4"
encode recordings/fivetran.webm     "$TMP/fivetran.mp4"
encode recordings/bigquery.webm     "$TMP/bigquery.mp4"

# Print durations to plan end-card length
ARCH_DUR=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$TMP/architecture.mp4")
DASH_DUR=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$TMP/dashboard.mp4")
TERM_DUR=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$TMP/terminal.mp4")
FT_DUR=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$TMP/fivetran.mp4")
BQ_DUR=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$TMP/bigquery.mp4")
TTS_DUR=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$TTS_MP3")
echo "  arch=${ARCH_DUR}s  dash=${DASH_DUR}s  term=${TERM_DUR}s  ft=${FT_DUR}s  bq=${BQ_DUR}s  tts=${TTS_DUR}s"

# ─── 5. Compute end-card duration ────────────────────────────────────────
TOTAL_TARGET=$(python3 -c "print(${TITLE_LEAD} + ${TTS_DUR} + ${AUDIO_TAIL})")
SCENES_DUR=$(python3 -c "print(${ARCH_DUR} + ${DASH_DUR} + ${TERM_DUR} + ${FT_DUR} + ${BQ_DUR})")
END_DUR=$(python3 -c "print(max(5, ${TOTAL_TARGET} - ${TITLE_LEAD} - ${SCENES_DUR}))")
TOTAL_DUR=$(python3 -c "print(${TITLE_LEAD} + ${SCENES_DUR} + ${END_DUR})")
echo "  end=${END_DUR}s  →  total=${TOTAL_DUR}s"

# ─── 6. Title + end mp4s ─────────────────────────────────────────────────
ffmpeg -y -loglevel error -loop 1 -t ${TITLE_LEAD} -i "$TMP/title.png" \
  -vf "fps=30,format=yuv420p,scale=1920:1080" \
  -c:v libx264 -preset veryfast -crf 18 "$TMP/title.mp4"
ffmpeg -y -loglevel error -loop 1 -t ${END_DUR} -i "$TMP/end.png" \
  -vf "fps=30,format=yuv420p,scale=1920:1080" \
  -c:v libx264 -preset veryfast -crf 18 "$TMP/end.mp4"

# ─── 7. Concat silent video ──────────────────────────────────────────────
{
  echo "file '$(realpath "$TMP/title.mp4")'"
  echo "file '$(realpath "$TMP/architecture.mp4")'"
  echo "file '$(realpath "$TMP/dashboard.mp4")'"
  echo "file '$(realpath "$TMP/terminal.mp4")'"
  echo "file '$(realpath "$TMP/fivetran.mp4")'"
  echo "file '$(realpath "$TMP/bigquery.mp4")'"
  echo "file '$(realpath "$TMP/end.mp4")'"
} > "$TMP/concat.txt"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$TMP/concat.txt" \
  -c copy "$TMP/silent.mp4"

# ─── 8. Audio: lead silence + TTS + tail silence (bounded inputs) ────────
ffmpeg -y -loglevel error -f lavfi -t ${TITLE_LEAD} \
  -i "anullsrc=channel_layout=stereo:sample_rate=24000" \
  -c:a aac -b:a 192k "$TMP/lead.m4a"
ffmpeg -y -loglevel error -f lavfi -t ${AUDIO_TAIL} \
  -i "anullsrc=channel_layout=stereo:sample_rate=24000" \
  -c:a aac -b:a 192k "$TMP/tail.m4a"
ffmpeg -y -loglevel error -i "$TTS_MP3" \
  -ar 24000 -ac 2 -c:a aac -b:a 192k "$TMP/tts.m4a"
{
  echo "file '$(realpath "$TMP/lead.m4a")'"
  echo "file '$(realpath "$TMP/tts.m4a")'"
  echo "file '$(realpath "$TMP/tail.m4a")'"
} > "$TMP/audio_concat.txt"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$TMP/audio_concat.txt" \
  -c copy "$TMP/audio.m4a"

# ─── 9. Mux final ────────────────────────────────────────────────────────
mkdir -p "$(dirname "$OUT_FINAL")"
ffmpeg -y -loglevel error -i "$TMP/silent.mp4" -i "$TMP/audio.m4a" \
  -c:v copy -c:a copy -shortest "$OUT_FINAL"

echo ""
echo "✓ wrote $OUT_FINAL"
ls -lh "$OUT_FINAL"
FINAL_DUR=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$OUT_FINAL")
echo "  duration: ${FINAL_DUR}s"
