# Synth — Design Spec

**Status:** Approved 2026-05-22
**Owner:** Shivam Shrivastava (solo)
**Target:** Google Cloud Rapid Agent Hackathon — Fivetran track
**Submission deadline:** 2026-06-11, 14:00 PDT
**Build budget:** ~60-70 hours over 3 weeks, evenings + weekends

---

## 1. One-sentence pitch

Synth watches a source database, generates fidelity-validated synthetic rows on demand or on a schedule, asks a human to approve once, then loads the data into a staging warehouse via Fivetran — replacing the "copy prod to staging" privacy nightmare.

**Hackathon framing:** *"Copying prod data to staging is illegal in half the world. Synth is an agent that solves it once and never asks again."*

---

## 2. Why this wins the Fivetran track

- **Quality of idea:** No one in the agent space frames synthetic data as an autonomous workflow. Existing tools (Gretel, MOSTLY AI, SDV) are one-shot SDKs or SaaS UIs — none are agents.
- **Tech implementation:** Statistical fidelity validation (TSTR, KS, JS) + privacy validation (DCR) is non-trivial; reuses the production-grade engine already in `ShivamShrivastava18/AI-Agent-for-Synthetic-Data-Generation`.
- **Impact:** Every infra/data team has the "staging data is fake junk OR copied-from-prod-which-is-illegal" problem. Concrete savings: data-eng team hours + legal risk avoidance.
- **Design:** Single-screen dashboard, one job: approve the run. Tells a clean 3-minute story.
- **Track choice:** Fivetran is the least-sexy partner on paper; likely the least-crowded submission pool; perfect technical fit (schema discovery + destination push).

---

## 3. Scope

### In scope (v1, submission build)

- One configured source dataset (Lending Club loans, Kaggle)
- One destination warehouse (Postgres "staging" instance on Cloud SQL)
- Two synthesis engines: Gaussian Copula, Conditional Histogram
- Three fidelity metrics: TSTR (train-synthetic-test-real with XGBoost), KS (Kolmogorov-Smirnov per column), JS (Jensen-Shannon divergence per column)
- One privacy metric: DCR (Distance to Closest Record) — confirm no synthetic row is too close to any real row
- Agent decision loop with retry-on-failure branching (max 1 retry with alternate engine)
- Minimal Next.js dashboard: runs list + run detail + approve/reject buttons
- Manual trigger via dashboard button + scheduled trigger via Cloud Scheduler
- Slack notification on completion
- Public Cloud Run URL for the dashboard
- Public GitHub repo with OSS license

### Non-goals (v2 backlog — DO NOT BUILD)

- Multi-tenant authentication
- Multi-source schema federation
- PR/Git integration ("on PR open, generate test data")
- Auto-ML engine selection / Bayesian hyperparameter tuning
- Differential-privacy budget tracking
- Streaming / change-data-capture
- Email / PagerDuty notifications (Slack only)
- Cost monitoring dashboards
- Multi-dataset switcher
- Time-series-aware synthesis

---

## 4. Architecture

```
                          ┌──────────────────────────┐
                          │  Google Cloud Agent      │
                          │  Builder (Gemini 3)      │
                          │  • orchestrates tools    │
                          │  • decision branching    │
                          └──────┬───────────────────┘
                                 │  tool calls
                ┌────────────────┼──────────────────────────┐
                ▼                ▼                          ▼
        ┌──────────────┐   ┌──────────────┐         ┌──────────────────┐
        │ Fivetran MCP │   │ Engine API   │         │ Dashboard API    │
        │  • discover  │   │ (FastAPI on  │         │ (Next.js on      │
        │    schema    │   │  Cloud Run)  │         │  Cloud Run)      │
        │  • push to   │   │  • generate  │         │  • request human │
        │    dest      │   │  • validate  │         │    approval      │
        └──────────────┘   │  • DCR check │         │  • show fidelity │
                           └──────┬───────┘         │    plots         │
                                  │                 └────────┬─────────┘
                                  ▼                          │
                           ┌──────────────┐                  ▼
                           │  Firestore   │           ┌──────────────┐
                           │  • run state │◄──────────│ Human ✓ / ✗  │
                           │  • approvals │           └──────────────┘
                           └──────────────┘
```

### Component responsibilities

| Component | Responsibility | Owner repo path |
|---|---|---|
| **Agent (Agent Builder)** | Orchestrate the decision graph. Decide which engine to use. Branch on validation results. Wait for human approval. | `agent/` |
| **Engine API (FastAPI)** | `POST /sample` — return N rows from source. `POST /generate` — produce synthetic rows. `POST /validate` — compute TSTR/KS/JS/DCR. `GET /runs/{run_id}/plot_sample?columns=...` — return ~500 real + ~500 synthetic rows for client-side Plotly rendering. Stateless. | `engine/` |
| **Dashboard (Next.js)** | Render runs list, run detail with Plotly distribution-comparison plots, approval buttons that write to Firestore. | `dashboard/` |
| **Fivetran MCP integration** | Schema discovery from source; row push to destination. | (provided MCP; agent tools wrap it) |
| **Firestore** | Single source of truth for run state: `runs`, `approvals` collections. | (managed) |
| **Cloud SQL "prod"** | Lending Club data, treated as the regulated source. | (managed) |
| **Cloud SQL "staging"** | Empty destination; synthetic data lands here. | (managed) |
| **Cloud Scheduler** | Demo-only: hits an agent webhook on a 5-minute schedule for the "scheduled run" part of the demo. | (managed) |

### Tech stack decisions (locked, with rationale)

| Decision | Choice | Why |
|---|---|---|
| Agent runtime | Google Cloud Agent Builder + Gemini 3 | Mandatory per hackathon rules |
| Partner MCP | Fivetran | Strong technical fit; less-crowded track |
| Engine language | Python 3.11 (FastAPI) | Reuses existing repo verbatim |
| Dashboard | Next.js 14 + shadcn/ui + Plotly.js | Better demo aesthetics than Streamlit |
| State store | Firestore | Zero ops, JSON-native, free-tier sufficient |
| Source/dest DB | Cloud SQL Postgres | Cheapest managed option; familiar |
| Hosting | Cloud Run (engine + dashboard) | Scale-to-zero, easiest deploy |
| Notifications | Slack incoming webhook | Single-step setup |
| Demo dataset | Kaggle Lending Club loans | Privacy story, large, mixed types |

---

## 5. The agent's decision graph

```
START
  │
  ▼
discover_source_schema()              # Fivetran MCP
  │
  ▼
sample_real_rows(n=5000)              # Engine API → holdout for validation
  │
  ▼
generate_synthetic(                   # Engine API
    n=50000,
    engine="gaussian_copula"
)
  │
  ▼
validate(synthetic, real_holdout)     # Engine API
  └─ returns {TSTR, KS_avg, JS_avg, DCR_min}
  │
  ├── if TSTR < 0.75 OR KS_avg > 0.15 OR DCR_min < 0.1:
  │       │
  │       ▼
  │   generate_synthetic(             # retry with alternate engine
  │       n=50000,
  │       engine="conditional_histogram"
  │   )
  │       │
  │       ▼
  │   validate(...)
  │       │
  │       └── if still failing:
  │              notify_slack("fidelity failed twice; halting")
  │              halt
  │
  ▼
write_run_to_firestore(status="awaiting_approval", metrics=..., plot_columns=...)
  │
  ▼  (poll Firestore every 5s for verdict; max 30 min wait)
  │
  ├── if rejected: notify_slack("rejected") ; halt
  │
  ▼
push_to_destination(synthetic, target="staging")   # Fivetran MCP
  │
  ▼
notify_slack(success_summary)
  │
  ▼
DONE
```

**Fidelity thresholds (locked for v1):**
- TSTR (XGBoost AUC on a binary target) ≥ 0.75
- KS average across numeric columns ≤ 0.15
- JS average across categorical columns ≤ 0.20 (not gating; reported only)
- DCR min (nearest-neighbor distance normalized) ≥ 0.10

---

## 6. The dashboard

Single screen. No navigation. Sections stack vertically:

```
┌──────────────────────────────────────────────────────────────┐
│ Synth                                            [⚙ Settings] │
├──────────────────────────────────────────────────────────────┤
│  Recent runs                                                 │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ #18  loan_applications   ✓ approved   2m ago         │    │
│  │ #17  loan_applications   ⏳ awaiting    just now     │ ←  │
│  │ #16  loan_applications   ✓ approved   yesterday      │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ─── Run #17 ─────────────────────────────────────────────   │
│  Source: lending_club.loan_applications  (1.2M rows)         │
│  Generated: 50,000 rows  via Gaussian Copula                 │
│                                                              │
│  Fidelity                                                    │
│  ┌────────────────┬──────────────────────────────────┐       │
│  │ TSTR (XGBoost) │ 0.84    ✓ above 0.75 threshold   │       │
│  │ KS (avg)       │ 0.08    ✓ below 0.15 threshold   │       │
│  │ JS (avg)       │ 0.11    ✓                        │       │
│  │ DCR (privacy)  │ 0.42    ✓ no row too close       │       │
│  └────────────────┴──────────────────────────────────┘       │
│                                                              │
│  [ Distribution comparison plots — 4 columns side-by-side ]  │
│       [ ✓ Approve & push to staging ]   [ ✗ Reject ]         │
└──────────────────────────────────────────────────────────────┘
```

**Components (v1):**
1. **Runs list** — `RunListItem` × N from Firestore
2. **Run detail** — `MetricsTable` + `DistributionPlots` (4 Plotly histograms side-by-side)
3. **Approval buttons** — POST to `/api/approve` or `/api/reject` → writes to Firestore

**Excluded from v1:** settings page (use `.env`), auth, multi-user, run history beyond ~20 items, dataset switcher.

---

## 7. Data model (Firestore)

```
runs/{run_id}
  trigger: "manual" | "scheduled"
  source_table: string
  destination_table: string
  engine: "gaussian_copula" | "conditional_histogram"
  retry_count: 0 | 1
  status: "running" | "awaiting_approval" | "approved" | "rejected" | "pushed" | "failed"
  metrics: { TSTR: float, KS_avg: float, JS_avg: float, DCR_min: float }
  plot_columns: [string]         # 4-6 columns the dashboard should plot
  synthetic_data_uri: string     # gs:// path to the parquet file
  created_at: timestamp
  approved_at: timestamp | null
  approval_verdict: "approved" | "rejected" | null
  pushed_at: timestamp | null
```

The dashboard fetches plot data lazily via `GET /runs/{run_id}/plot_sample?columns=...` on the Engine API; no PNG storage in v1.

---

## 8. Demo dataset

**Pick:** Kaggle Lending Club loans (2.2M rows, ~150 columns).

**Why:** Strong privacy story (real loan PII), large, mixed numeric/categorical/datetime, well-known.

**Preprocessing:**
- Sample 100,000 rows into Cloud SQL "prod" (demo-sized, generation < 30s)
- Drop columns with > 50% nulls
- Drop free-text columns (description, title)
- Keep ~40 columns of mixed types

**Why not the alternatives:**
- UCI Adult Income — too small, already in existing repo, no narrative
- MIMIC-III — needs credentialed access, blocker
- NYC Taxi — geographic data hard to synthesize in 3 weeks
- HuggingFace tabular benchmarks — no story behind them

---

## 9. Milestone plan (concrete dates)

| Phase | Window | Hours | Deliverable |
|---|---|---|---|
| **De-risk** | Fri May 22 evening + Sat May 23 | ~11h | GCP project up; Agent Builder + Gemini 3 access confirmed; Fivetran MCP "hello world" returns a schema; Lending Club in Cloud SQL "prod" |
| **Engine on Cloud Run** | Sun May 24 | ~8h | Existing FastAPI engine lifted, deployed; `curl /generate` returns 1000 synthetic rows |
| **Agent v0** | Mon-Thu May 25-28 | ~12h | Agent with `discover_schema` + `generate_synthetic` + `validate_fidelity` tools; end-to-end manual run produces JSON verdict |
| **Dashboard + approval gate** | Sat-Sun May 30-31 | ~16h | Next.js dashboard live on Cloud Run; runs list + run detail with Plotly; approve/reject buttons writing to Firestore; agent polls and proceeds |
| **Fivetran push + branching** | Mon-Thu Jun 1-4 | ~12h | Fivetran destination push working; agent retry-on-failure branch implemented; Cloud Scheduler trigger demoed |
| **Polish + demo + submit** | Sat-Wed Jun 6-10 | ~16h | 3-min demo video recorded and edited; Devpost copy written; README + license; hosted URL public |
| **Submission day** | Thu Jun 11 | ~3h | Final smoke test; submit by 14:00 PDT |

**Slack budget:** ~7-10 hours spread across all phases for unexpected integration friction.

---

## 10. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Fivetran MCP doesn't support synthetic-row push (read-only) | **High** | De-risk on Day 1. Fallback: use Fivetran MCP for schema discovery only; write synthetic rows via direct Postgres connection. Still qualifies for the track. |
| Gemini 3 not yet enabled in GCP project | Medium | Check first; request access tonight if waitlisted. Confirm with rules whether Gemini 2.5 Pro is allowed as fallback. |
| Cloud Run cold starts make demo feel laggy | Medium | `min-instances=1` for demo day. ~$0.50/day cost. |
| 50k rows takes > 30s to generate | Medium | Pre-sample source to 100k rows; demo with 10k synthetic rows if needed |
| Video production blows the buffer | **High** | Pre-write script. Use Loom. Don't perfect — judges prefer real over polished. |
| Solo scope creep | **Very high** | The v2 backlog in §3 is a contract. New ideas go there, not in v1. |

---

## 11. Submission checklist

- [ ] Hosted dashboard URL (Cloud Run, public)
- [ ] Public GitHub repo with `MIT` or `Apache-2.0` license
- [ ] ~3-minute demo video (YouTube unlisted is acceptable)
- [ ] Fivetran track selected on Devpost
- [ ] Devpost submission form complete
- [ ] README explains: problem, solution, architecture, how to run locally, Fivetran integration

---

## 12. Glossary

- **TSTR** — Train Synthetic, Test Real. Train an XGBoost on synthetic data, eval on a real holdout. AUC ≥ 0.75 means synthetic data preserves predictive utility.
- **KS** — Kolmogorov-Smirnov statistic. Per-column distance between real and synthetic distributions. Lower is better.
- **JS** — Jensen-Shannon divergence. Distributional similarity for categoricals. Lower is better.
- **DCR** — Distance to Closest Record. For each synthetic row, compute its Euclidean distance (in scaled feature space, numerics standardized + one-hot categoricals) to the nearest real row. Divide by the median pairwise distance between real rows. `DCR_min` is the smallest such ratio across all synthetic rows. Higher = synthetic is not memorizing any real row. Threshold ≥ 0.10 means no synthetic row is closer than 10% of the typical real-to-real distance.
- **MCP** — Model Context Protocol. Anthropic-originated protocol for exposing tools to LLM agents. Fivetran provides an MCP server for this hackathon.
