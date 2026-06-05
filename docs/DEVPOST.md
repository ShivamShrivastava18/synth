# Synth — Devpost submission copy

Copy-paste this verbatim into the Devpost form.

---

## Tagline (≤ 200 chars)

Autonomous agent that generates fidelity-validated synthetic data and ships it to staging via Fivetran. No more "copy prod to staging." Built on Gemini 3.1 Pro + Agent Builder.

---

## Inspiration

Every data engineer has the same problem: copying production data into staging is illegal in half the world (GDPR, HIPAA, CCPA). Most teams ship with broken fake data and discover bugs at 3 a.m. Existing synthetic-data tools (SDV, Gretel, MOSTLY AI) are one-shot scripts no one wants to maintain.

We wanted a real product surface: an autonomous agent that runs nightly, generates realistic-but-fake data, validates its fidelity against four statistical metrics, asks a human to approve once, and ships it via the same managed pipeline (Fivetran) the data team already trusts in production.

## What it does

Synth is an autonomous agent built on **Google Cloud Agent Builder**, **Gemini 3.1 Pro Preview**, and the **Fivetran MCP**. When triggered (button click in the dashboard, HTTP call, or schedule):

1. **Discovers** the source schema via the Engine API
2. **Generates** synthetic rows using a Gaussian Copula (preserves column correlations) or Conditional Histogram (preserves marginals)
3. **Validates fidelity** with four metrics:
   - **TSTR** (Train Synthetic, Test Real): XGBoost AUC trained on synth, scored on a real holdout — measures utility
   - **KS_avg**: Kolmogorov–Smirnov per-column mean — numeric distribution similarity
   - **JS_avg**: Jensen–Shannon divergence per-column — categorical similarity
   - **DCR_min**: Distance to Closest Record — privacy (synthetic rows aren't too close to any real row)
4. **Branches on failure**: if the gate fails (TSTR < 0.75, or KS > 0.15, or DCR < 0.10), the agent retries once with the alternate engine. If still failing, it halts.
5. **Requests human approval** by writing the run to Firestore. The dashboard polls and shows the metrics + Plotly distribution-comparison plots overlaying real (gray) vs synth (mint).
6. **On approval**: uploads the synth as parquet to a GCS bucket, calls `sync_connection` on a pre-configured Fivetran GCS→BigQuery connection, polls until `succeeded_at` advances.
7. **Notifies** Slack with the result. The synth lives in `synth_staging.loan_applications` in BigQuery.

The 9 tools the agent calls — `discover_schema`, `generate_synthetic`, `validate_fidelity`, `write_run`, `request_human_approval`, `notify_slack`, `upload_synthetic_to_gcs`, `trigger_fivetran_sync`, `wait_for_sync_complete` — are HTTP endpoints on a Cloud Run service. The Gemini agent calls them by name with structured arguments and gets JSON back.

## How we built it

Three Cloud Run services + the Fivetran-managed pipeline + the Gemini agent itself:

- **Engine** (FastAPI, Python): generators + validators + GCS upload. Reads from Cloud SQL Postgres (100k Lending Club loans seeded from Kaggle as our "prod" data). XGBoost handles the TSTR scoring including the gnarly string-multiclass case (`loan_status` has 7 classes; we label-encode after filtering classes absent from synth-train).
- **Agent Tools** (FastAPI, Python): the 9 HTTP tools the agent calls + `/agent/trigger` to start a new run from the dashboard. Background thread runs the Gemini loop without blocking the HTTP response.
- **Dashboard** (Next.js 14, App Router, Geist + Plotly): dark B2B-infrastructure aesthetic (Linear/Vercel-class), single mint accent, sparklines + threshold bars on each metric card, status-aware row tints, real-time Firestore polling.
- **Fivetran**: GCS source connector → BigQuery destination. The agent's tool calls are the REST equivalents of the official `fivetran-mcp` server's `sync_connection` and `get_connection_details` tools — same API surface, just invoked in-process so the agent can run inside Cloud Run without spawning a subprocess.
- **Gemini agent**: built with the Vertex AI SDK's `GenerativeModel` + `FunctionDeclaration` + function-calling loop. Runs at the `global` Vertex AI endpoint. System prompt encodes the 9-step decision graph; the model picks tools and arguments autonomously.

## Challenges we ran into

- **Gemini 3 access**: initial probing returned 404 NOT_FOUND for every model name we tried (`gemini-3.0-pro`, `gemini-3-pro`, `gemini-3-pro-preview`, etc.) across every region. We almost posted on the hackathon forum asking for allowlist access. After enumerating the Model Garden, we discovered the working combination: model name `gemini-3.1-pro-preview` (the `.0` is dropped) + endpoint `locations/global` (not us-central1) + the `x-goog-user-project` header. Documented in `docs/specs/2026-05-23-gemini3-access.md`.
- **Fivetran MCP capabilities**: we initially assumed the MCP could push synthetic rows directly into a destination. It can't — the Fivetran MCP is for managing the Fivetran control plane (connectors, syncs). We pivoted the architecture to *use Fivetran for what it's built for*: agent writes parquet to GCS, then triggers `sync_connection` to move GCS → BigQuery. Better architecture; better story for the demo.
- **String-multiclass TSTR**: real `loan_status` has 7 string-valued classes with extreme imbalance (62% "Fully Paid", < 1% "Default"). Naive XGBoost on those labels exploded with non-contiguous class indices after filtering. We label-encode *after* filtering to contiguous integers and switched to `multi_class="ovr", average="weighted"` so rare-class undefined AUCs don't NaN the result.
- **Cloud Run in-memory cache**: the engine caches synthetic outputs in a Python dict keyed by `run_id`. Cloud Run scales horizontally — different requests can hit different instances and miss the cache. We pinned the engine to `min-instances=1, max-instances=1` so the cache survives.
- **Dashboard design**: our first dashboard iteration was "editorial / scientific journal" (Fraunces serif, warm newsprint paper). It was distinctive, but it didn't look like a B2B SaaS product — it looked like a typography project. We rebuilt it as a dark infrastructure dashboard (Linear / Vercel / Tailscale-class), added subtle color washes, sparklines, threshold bars, micro-animations. Documented in `docs/specs/2026-05-22-synth-design.md` and the dashboard's git history.

## Accomplishments we're proud of

- The full decision graph runs **autonomously** — Gemini picks each tool and argument on its own. No hardcoded sequence.
- The agent **retries on fidelity failure** with the alternate engine *by itself* — it's a real agent loop, not a pipeline.
- TSTR on real Lending Club data lands at **0.96+** with the Gaussian Copula, validated end-to-end.
- The Fivetran MCP integration is **real** — synth data flows GCS → Fivetran sync → BigQuery in ~30-45 seconds per run.
- The dashboard's "Approve & push" button completes the loop with a human-in-the-loop signal back to the running agent via Firestore polling — no webhooks, no complicated queue, just one document field.
- Built in **14 days** by one developer.

## What we learned

- The Fivetran MCP is a CONTROL PLANE, not a data plane. Once we understood that, the architecture became cleaner.
- Gemini 3 / Vertex AI naming has subtle traps: `global` location, `x-goog-user-project` header, no `.0` in the model name. None of these are obvious from the docs.
- B2B SaaS dashboards win on restraint, not chrome. Linear, Vercel, and Tailscale all converge on the same pattern for good reasons.
- Function calling in Gemini is dramatically easier than spinning up Agent Engine for the same job. A `FunctionDeclaration` per tool + a `generate_content` loop = working agent in ~150 lines.

## What's next for Synth

- **Cloud Scheduler**: nightly trigger for every staging environment
- **Multi-source federation**: one agent run, multiple source tables, parallelized
- **PR-driven runs**: GitHub webhook triggers a run when a schema migration lands in prod
- **Differential privacy budget tracking**: track ε across runs so the cumulative privacy cost is bounded
- **CTGAN / TVAE engines** via SDV: deep-learning generators for the cases where copula's marginal-shape assumptions break
- **Connector SDK source**: turn Synth itself into a Fivetran source so the entire flow is one `sync_connection` call

## Built with

`Google Cloud Agent Builder` · `Gemini 3.1 Pro Preview` · `Vertex AI` · `Fivetran MCP` · `Fivetran` · `Cloud Run` · `Cloud SQL (Postgres)` · `BigQuery` · `Google Cloud Storage` · `Firestore` · `Cloud Build` · `Artifact Registry` · `Cloud Scheduler` · `Next.js 14` · `React` · `TypeScript` · `Tailwind CSS` · `Geist (font)` · `Plotly.js` · `FastAPI` · `Python` · `pandas` · `numpy` · `scipy` · `scikit-learn` · `XGBoost` · `pyarrow` · `Pydantic` · `Lending Club (Kaggle)`

## Try it out

- **Live dashboard**: https://synth-dashboard-983648391385.us-central1.run.app
- **GitHub**: https://github.com/ShivamShrivastava18/synth
- **Demo video**: see attached
