# Synth

> Autonomous synthetic-data agent for staging environments.
> Built for the Google Cloud Rapid Agent Hackathon (Fivetran track).

Synth watches a source database, generates fidelity-validated synthetic rows on demand or on a schedule, asks a human to approve once, then loads the data into a staging warehouse via Fivetran — replacing the "copy prod to staging" privacy nightmare.

## Status

**Under active development.** Submission deadline: 2026-06-11 14:00 PDT.

- Model: `gemini-3.0-pro` (or `gemini-2.5-pro` fallback)
- Region: `us-central1`
- License: [MIT](./LICENSE)

## Architecture

```
Agent Builder (Gemini 3)
       │
       ├── Fivetran MCP        — schema discovery + destination push
       ├── Engine API           — generate, validate (TSTR/KS/JS/DCR)
       ├── Dashboard            — human approval gate
       └── Firestore            — shared run state
```

See [docs/](./docs) for the design spec and demo script.

## Repository layout

- `agent/` — Agent Builder configuration + tool host service
- `engine/` — FastAPI service for generation + fidelity validation
- `dashboard/` — Next.js dashboard for human approval
- `infra/` — Provisioning + deployment scripts
- `docs/` — Spec, demo script, Devpost copy

## Run locally

Deployment instructions land here at the end of Phase 2.
