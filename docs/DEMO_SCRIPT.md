# Synth — Demo Script & Shot List

**Length:** 3:00. **Voice:** TTS in a calm, male, professional cadence.
**Style:** Polished product demo, not "look ma I built this." Numbers spoken cleanly.

## How to use this doc

1. **Record screen** in the order listed under "Shots". 16:9, 1920×1080. ~3 min of B-roll total.
2. **Run TTS** via `infra/generate_tts.sh` to produce `docs/demo_narration.mp3`.
3. **Merge in your editor** (CapCut / DaVinci / Premiere): drop the MP3 underneath the screen recording. Use the timestamps in this script to line up shot transitions with narration beats.
4. **Add a title card** (0:00–0:02) with "Synth" wordmark and the subtitle "Autonomous synthetic data for staging" — optional, keeps things on-brand.

---

## Script

> **Convention:** `[VISUAL: …]` cues describe what's on screen during the narration line above it. Timestamps are start-of-line. Total ~248 words at a comfortable narration pace of ~135 words / min = 1:50 spoken, with 1:10 of pause / visual time across the 3 minutes.

### 0:00 — Hook *(15s)*

> **Copying production data into staging is illegal in half the world.**
> **Most teams ship with broken fake data and find bugs at three a.m.**

`[VISUAL: split screen — left, a real prod database with sensitive-looking columns; right, an empty staging table. Title card "Synth" fades in.]`

---

### 0:15 — What it is *(20s)*

> **This is Synth — an autonomous agent built on Google Cloud Agent Builder and Gemini 3.1 Pro, with the Fivetran MCP.**
> **It generates fidelity-validated synthetic data and ships it to staging — on its own.**

`[VISUAL: architecture diagram (one slide). Five boxes: prod database → Engine → Gemini agent → Fivetran → BigQuery. Lines animate in.]`

---

### 0:35 — The trigger *(25s)*

> **I point it at our production Lending Club table — one hundred thousand real loans.**
> **The dashboard's "New run" button calls the agent. Gemini reads the schema. Generates five thousand synthetic rows using a Gaussian Copula. Validates fidelity.**

`[VISUAL: dashboard. Click "New run" button (top right). New row appears in the runs table with status pulsing amber: "awaiting".]`

---

### 1:00 — Fidelity panel *(35s)*

> **Four metrics. T S T R — utility — zero point nine five.**
> **K S — distribution similarity — zero point zero three.**
> **D C R — privacy — zero point four five.**
> **The histograms show synthetic data overlaying real data, column by column.**
> **All three gates pass. I approve.**

`[VISUAL: zoom into the new run's detail panel. Sparklines and threshold bars on the four metric cards. Pan across the four histograms. Then cursor moves to the Approve button — click. Status pill flips from amber to mint "approved".]`

---

### 1:35 — Fivetran flow *(40s)*

> **The agent uploads the parquet to a Google Cloud Storage bucket. Calls Fivetran's MCP. Triggers a sync.**
> **Fivetran moves the data into BigQuery staging — the same managed pipeline your team already trusts for production.**
> **Forty seconds later — done. Five thousand synthetic rows live in staging.**

`[VISUAL: terminal showing agent log scrolling — "upload_synthetic_to_gcs", "trigger_fivetran_sync", "wait_for_sync_complete → succeeded". Then quick cut to Fivetran connection page showing the sync going green. Then BigQuery console with a query: SELECT COUNT(*) → 5000 (or whatever the live demo number is).]`

---

### 2:15 — Impact *(30s)*

> **Synth turns a recurring privacy nightmare into a one-click decision.**
> **Set it on a schedule. Every staging environment. Every night.**
> **No prod copies. No legal review. No three a.m. bugs.**

`[VISUAL: dashboard again, showing multiple runs in the table — varied timestamps to imply "this has been running". Status pills mostly mint.]`

---

### 2:45 — Close *(15s)*

> **Built in fourteen days, on Google Cloud Agent Builder, Gemini 3.1 Pro, and the Fivetran MCP.**
> **This is Synth.**

`[VISUAL: end card — "Synth" wordmark, GitHub URL, the three sponsor logos (Google Cloud, Gemini, Fivetran). Hold for 4 seconds.]`

---

## Shot list (record in this order — easier than chronologically)

| # | Shot | Capture method | Notes |
|---|---|---|---|
| 1 | Architecture diagram (Hook + What-it-is) | Slide / Keynote screen | Static slide, 30s total. Synth title fades in. |
| 2 | Dashboard front page (Runs table populated) | Screen recording of https://synth-dashboard-983648391385.us-central1.run.app | Ensure 3-5 runs visible. If needed, trigger 1-2 more by clicking "New run". |
| 3 | Run detail with green metrics + histograms | Continue same recording, click any run with `status=pushed` | Mouse should hover over the metric cards so sparklines highlight. Then pan across the histograms. |
| 4 | Click "New run" → row appears | Use the actual "New run" button in topbar | First-time recording: clear runs from yesterday if you want a clean slate (Firestore console). |
| 5 | Click "Approve & push" on a pending run | Trigger a fresh run, wait for it to land in awaiting state | Pre-record this. Approve button flips status to mint. |
| 6 | Terminal: agent log streaming | Run `python agent/gemini_agent.py --source loan_applications --target loan_status` from the project root | Set terminal font ~24pt for legibility. iTerm + dark theme. |
| 7 | Fivetran connection page showing green sync | https://fivetran.com/dashboard → connections → synth_staging.lending | Wait until "Last sync" shows under 1m ago. |
| 8 | BigQuery console with row count | https://console.cloud.google.com/bigquery → synth_staging.loan_applications → Query "SELECT COUNT(*) FROM …" | Show the result inline. |
| 9 | End card | Keynote / Canva | Logos lined up under Synth wordmark. |

**Tip:** Record each shot with 3-5 seconds of "tail" you can trim. Easier to cut than to extend.

---

## SSML hints for the TTS

Numbers in the script that need explicit pronunciation:

- "T S T R" — say each letter
- "K S" — each letter
- "D C R" — each letter
- "G C S" — each letter
- "M C P" — each letter
- "0.95", "0.03", "0.45" — say as "zero point nine five" etc.
- "3 AM" — say as "three a m"
- "100,000" → "one hundred thousand"
- "5,000" → "five thousand"
- "Fivetran" → "fivetran" (one word, like the brand)
- "BigQuery" → "big query" (two words)
- "Gemini" → "JEM-in-eye"
- "Synth" → as one syllable, ryhmes with "myth"

The `infra/generate_tts.sh` script handles all of these via SSML wrappers.
