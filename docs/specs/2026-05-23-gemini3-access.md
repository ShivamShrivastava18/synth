# Gemini 3 Access — Resolution

**Date:** 2026-05-23
**Status:** Resolved without hackathon support intervention

## What I almost got wrong

Initial Phase 1 testing of Gemini 3 returned 404 NOT_FOUND across all model names I tried (`gemini-3.0-pro`, `gemini-3-pro`, `gemini-3.0-flash`, `gemini-3-pro-preview`, etc.) and across multiple regions (`us-central1`, `us-east5`, `us-west1`, `europe-west4`, `asia-northeast1`, `global`).

I almost asked Devpost support for allowlist access. That would have been wrong.

## Three things had to align

1. **Endpoint location** — Gemini 3 family inference is served via `locations/global`, **not** `us-central1`. The model is *visible in the catalog* in `us-central1` (it shows up in Model Garden listings), but `generateContent` calls have to go to `global`.
2. **Quota header** — REST calls must include `x-goog-user-project: synth-hackathon-2026` to route quota correctly. Without it, ADC fails with `PERMISSION_DENIED: quota project not set`.
3. **Model naming convention** — the new Gemini 3 IDs drop the `.0`. It's `gemini-3-pro-preview`, not `gemini-3.0-pro`. And the newer `gemini-3.1-*` variants exist and are accessible.

## What works for us today

| Model | Status | Use for |
|---|---|---|
| `gemini-3.1-pro-preview` | ✅ Public Preview | **Primary** — agent decision-making, planning, final-demo runs |
| `gemini-3.5-flash` | ✅ GA | Dev iteration; faster + cheaper |
| `gemini-3-flash-preview` | ✅ Public Preview | Alternative dev workhorse |
| `gemini-3.1-flash-lite` | ✅ Public Preview | Cheap multi-call workhorse |
| `gemini-3-pro-preview` | ❌ 404 | Still gated — but 3.1 Pro is newer and better anyway |

## Canonical invocation pattern

```bash
ACCESS_TOKEN=$(gcloud auth print-access-token)
curl -X POST \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-goog-user-project: synth-hackathon-2026" \
  "https://aiplatform.googleapis.com/v1/projects/synth-hackathon-2026/locations/global/publishers/google/models/gemini-3.1-pro-preview:generateContent" \
  -d '{"contents":[{"role":"user","parts":[{"text":"hi"}]}]}'
```

## Env vars locked in (`~/.synth.env`)

```bash
export MODEL_PRIMARY="gemini-3.1-pro-preview"
export MODEL_DEV="gemini-3.5-flash"
export VERTEX_LOCATION="global"
export VERTEX_ENDPOINT="https://aiplatform.googleapis.com"
```

## Implication for the agent

The Agent Builder agent will use `gemini-3.1-pro-preview`. The hackathon requirement of "Gemini 3" is satisfied. No code change in the agent tool host is needed (it never touches Gemini directly — only Agent Builder does).
