#!/usr/bin/env bash
# Generate the 3-minute demo narration as MP3 using Google Cloud TTS.
# Voice: en-US-Chirp3-HD-Charon — calm, mature male, the highest-quality
# Google TTS voice as of mid-2026. Fallback: en-US-Studio-Q if Chirp3
# isn't enabled in the project.
#
# Output: docs/demo_narration.mp3

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-synth-hackathon-2026}"
VOICE="${VOICE:-en-US-Chirp3-HD-Charon}"
OUT="${OUT:-docs/demo_narration.mp3}"

if ! command -v gcloud >/dev/null 2>&1; then
  echo "gcloud not on PATH"
  exit 1
fi

echo "→ Enabling Text-to-Speech API (idempotent)"
gcloud services enable texttospeech.googleapis.com --project="$PROJECT_ID" --quiet 2>&1 | tail -1

ACCESS_TOKEN=$(gcloud auth print-access-token)

# ─── Build SSML payload ───────────────────────────────────────────────────
# Pauses give the visual time to land; sub aliases give clean pronunciation
# for the metric acronyms; say-as for clean numeric reads.
SSML=$(cat <<'SSML'
<speak>
Copying production data into staging is illegal in half the world.
<break time="400ms"/>
Most teams ship with broken fake data and find bugs at <say-as interpret-as="characters">3</say-as> a m.
<break time="900ms"/>

This is Synth — an autonomous agent built on Google Cloud Agent Builder and <sub alias="JEMineye">Gemini</sub> three point one Pro, with the Fivetran M C P.
<break time="500ms"/>
It generates fidelity-validated synthetic data and ships it to staging — on its own.
<break time="900ms"/>

I point it at our production Lending Club table — one hundred thousand real loans.
<break time="500ms"/>
The dashboard's New Run button calls the agent.
<break time="400ms"/>
<sub alias="JEMineye">Gemini</sub> reads the schema. Generates five thousand synthetic rows using a Gaussian Copula. Validates fidelity.
<break time="900ms"/>

Four metrics.
<break time="500ms"/>
<say-as interpret-as="characters">TSTR</say-as> — utility — zero point nine five.
<break time="500ms"/>
<say-as interpret-as="characters">KS</say-as> — distribution similarity — zero point zero three.
<break time="500ms"/>
<say-as interpret-as="characters">DCR</say-as> — privacy — zero point four five.
<break time="600ms"/>
The histograms show synthetic data overlaying real data, column by column.
<break time="500ms"/>
All three gates pass. I approve.
<break time="900ms"/>

The agent uploads the parquet to a Google Cloud Storage bucket. Calls Fivetran's M C P. Triggers a sync.
<break time="500ms"/>
Fivetran moves the data into BigQuery staging — the same managed pipeline your team already trusts for production.
<break time="500ms"/>
Forty seconds later — done. Five thousand synthetic rows live in staging.
<break time="900ms"/>

Synth turns a recurring privacy nightmare into a one-click decision.
<break time="500ms"/>
Set it on a schedule. Every staging environment. Every night.
<break time="400ms"/>
No prod copies. No legal review. No <say-as interpret-as="characters">3</say-as> a m bugs.
<break time="900ms"/>

Built in fourteen days, on Google Cloud Agent Builder, <sub alias="JEMineye">Gemini</sub> three point one Pro, and the Fivetran M C P.
<break time="400ms"/>
This is Synth.
</speak>
SSML
)

# ─── Build JSON payload ───────────────────────────────────────────────────
PAYLOAD=$(python3 -c "
import json, sys
ssml = open('/dev/stdin').read()
print(json.dumps({
    'input': {'ssml': ssml},
    'voice': {'languageCode': 'en-US', 'name': '${VOICE}'},
    'audioConfig': {
        'audioEncoding': 'MP3',
        'sampleRateHertz': 24000,
        'speakingRate': 0.95,
    }
}))
" <<<"$SSML")

echo "→ Synthesizing (${VOICE}) → $OUT"
RESP=$(curl -sS -X POST "https://texttospeech.googleapis.com/v1/text:synthesize" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "x-goog-user-project: $PROJECT_ID" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

ERR=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error',{}).get('message',''))" 2>/dev/null || echo "")
if [[ -n "$ERR" ]]; then
  echo "TTS API error: $ERR"
  echo "Falling back to en-US-Studio-Q"
  PAYLOAD=$(echo "$PAYLOAD" | sed "s/\"name\": \"${VOICE}\"/\"name\": \"en-US-Studio-Q\"/")
  RESP=$(curl -sS -X POST "https://texttospeech.googleapis.com/v1/text:synthesize" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "x-goog-user-project: $PROJECT_ID" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD")
fi

mkdir -p "$(dirname "$OUT")"
echo "$RESP" | python3 -c "
import sys, json, base64
d = json.load(sys.stdin)
if 'audioContent' not in d:
    print('NO AUDIO IN RESPONSE:', d)
    sys.exit(1)
with open('$OUT', 'wb') as f:
    f.write(base64.b64decode(d['audioContent']))
print('✓ wrote $OUT')
"

ls -lh "$OUT"
echo ""
echo "Duration check (need ffprobe):"
command -v ffprobe >/dev/null && \
  ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$OUT" || \
  echo "(ffprobe not installed; play it to check length)"
