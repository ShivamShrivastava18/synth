<div align="center">

# Synth

**Autonomous synthetic data for staging environments.**

An agent that turns "copying production data to staging is illegal" into a one-click decision.

[![Live demo](https://img.shields.io/badge/live-dashboard-34d399?style=flat-square)](https://synth-dashboard-983648391385.us-central1.run.app)
[![Built with Gemini 3.1 Pro](https://img.shields.io/badge/Gemini-3.1%20Pro-6b8eff?style=flat-square)](#)
[![Fivetran track](https://img.shields.io/badge/Fivetran-MCP-5ec4c4?style=flat-square)](https://github.com/fivetran/fivetran-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-737065?style=flat-square)](LICENSE)

</div>

## The problem

Every data engineer has the same problem: **copying production data into staging is illegal in half the world.** Most teams ship with broken fake data and find bugs at 3 a.m.

Existing synthetic-data tools (SDV, Gretel, MOSTLY AI) are one-shot scripts no one wants to maintain.

## The solution

**Synth is an autonomous agent** built on **Google Cloud Agent Builder**, **Gemini 3.1 Pro Preview**, and the **Fivetran MCP**. Point it at a source table and it:

1. Reads the schema
2. Generates synthetic rows with a Gaussian Copula
3. **Validates fidelity** across four metrics — TSTR (utility), KS (numeric similarity), JS (categorical similarity), DCR (privacy)
4. Asks a human to approve once
5. Uploads the parquet to a GCS bucket
6. Calls Fivetran's MCP to sync it into your warehouse

All on its own. No prod copies. No legal review. No 3 a.m. bugs.

## Architecture

```
┌───────────────────────────────────────────────────────────────┐
│  Gemini 3.1 Pro · Google Cloud Agent Builder                  │
│  (decision graph, function calling)                           │
└──────────────────────────────┬────────────────────────────────┘
                               │
       ┌───────────────────────┼───────────────────────────┐
       ▼                       ▼                           ▼
┌──────────────┐       ┌──────────────┐         ┌──────────────────┐
│ Fivetran MCP │       │ Engine API   │         │ Dashboard        │
│ • discover   │       │ (FastAPI on  │         │ (Next.js on      │
│ • sync       │       │  Cloud Run)  │         │  Cloud Run)      │
│ • wait       │       │ • generate   │         │ • approve gate   │
└──────┬───────┘       │ • validate   │         │ • fidelity plots │
       │               │ • upload GCS │         └────────┬─────────┘
       ▼               └──────┬───────┘                  │
┌──────────────┐              │                          ▼
│  BigQuery    │              ▼                   ┌──────────────┐
│  staging     │       ┌──────────────┐            │  Firestore   │
└──────────────┘       │ Cloud SQL    │            │  run state   │
                       │ (prod data)  │            └──────────────┘
                       └──────────────┘
```

Three Cloud Run services + the Gemini agent + Fivetran's managed pipeline.

## Demo

- **Live dashboard:** https://synth-dashboard-983648391385.us-central1.run.app
- **Demo video:** [`docs/synth-demo.mp4`](docs/synth-demo.mp4)
- **Demo script + shot list:** [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md)

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Agent runtime | **Google Cloud Agent Builder** with Gemini 3.1 Pro Preview | Hackathon requirement; best-in-class reasoning for agent workflows |
| Partner MCP | **Fivetran** via `sync_connection` + `get_connection_details` | Real managed data movement, not a fake adapter |
| Generation | Gaussian Copula + Conditional Histogram | Marginal-preserving + correlation-preserving; covers the trade-off space |
| Validation | TSTR (XGBoost AUC), KS, JS, DCR | Industry-standard fidelity + privacy |
| Storage | Cloud SQL (Postgres) prod + BigQuery staging | Real production-style stack |
| Object store | Google Cloud Storage (parquet via pyarrow) | Fivetran's first-class source format |
| State | Firestore | Real-time dashboard polling |
| Dashboard | Next.js 14 + Geist + Plotly | Linear/Vercel-class UI feel |
| Hosting | Cloud Run × 3 services | Scale-to-zero, fast deploys |

## What's in the repo

```
engine/        FastAPI service — generators + fidelity validators
agent/         Gemini agent + 9 tool host endpoints
dashboard/     Next.js dashboard with editorial→infrastructure aesthetic
infra/         Deploy scripts (engine, dashboard, tools), TTS gen, video build
docs/          Spec, design decisions, demo script, narration, video
```

## Run it

### Trigger a run via the dashboard

```bash
open https://synth-dashboard-983648391385.us-central1.run.app
# Click "New run" in the top right
```

### Trigger via HTTP

```bash
curl -X POST https://synth-agent-tools-983648391385.us-central1.run.app/agent/trigger \
  -H 'Content-Type: application/json' \
  -d '{"source_table":"loan_applications","target_col":"loan_status"}'
```

### Run the agent locally

```bash
source ~/.synth.env
python agent/gemini_agent.py --source loan_applications --target loan_status
```

## How it satisfies the Fivetran track

The agent uses Fivetran for what Fivetran is actually built for — **managed data movement** — and the MCP for what the MCP is built for: **orchestrating that movement programmatically.**

- `sync_connection` triggers the Fivetran job (REST equivalent of the MCP tool of the same name; the official `fivetran-mcp` server wraps this exact API)
- `get_connection_details` polls until `succeeded_at` advances
- Setup uses `create_destination` (BigQuery) + `create_connection` (GCS source) via the Fivetran UI

A pre-configured `gcs → bigquery` connection (id `bar_oat` in our setup) means each run is one `sync_connection` call.

## Acknowledgments

- Fivetran's [`fivetran-mcp`](https://github.com/fivetran/fivetran-mcp) for the connection-management tool surface
- The Kaggle [Lending Club](https://www.kaggle.com/datasets/wordsforthewise/lending-club) dataset (2.2M real loans) as the demo source
- Google Cloud's $100 hackathon credit covered every byte of egress

## License

MIT. See [LICENSE](LICENSE).
