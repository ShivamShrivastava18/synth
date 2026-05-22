# Phase 1 Task 1.2 — Fivetran MCP Findings

**Date:** 2026-05-22
**Status:** Architecture validated; minor pivot from original spec

## Summary

The original spec assumed the Fivetran MCP could push synthetic rows directly into a destination. **It cannot.** The Fivetran MCP is for managing the Fivetran control plane — connectors, destinations, syncs — not for direct data ingestion.

The better-fitting architecture is to use Fivetran for what it's actually built for: managed data movement. The agent writes synthetic data to GCS, then orchestrates Fivetran (via MCP) to sync GCS → destination.

## Tools we will use (all enabled by default; require `FIVETRAN_ALLOW_WRITES=true` for POST/PATCH/DELETE)

### One-time setup (manual via Fivetran console + MCP)
- `create_destination` — Postgres destination → Cloud SQL `synth-staging`
- `create_connection` — GCS source → Postgres destination
- `run_connection_setup_tests` — verify wiring

### Per-run (called by agent)
- `get_connection_schema_config` — read source schema (replaces direct Fivetran schema MCP we hypothesized)
- `sync_connection` — POST: trigger a data sync after we drop a new parquet in GCS
- `get_connection_details` — poll for sync completion / status

## Agent-Builder ↔ MCP bridging

Fivetran MCP speaks stdio; Agent Builder speaks HTTPS. Resolution: in-process import of the MCP server's Python tool functions from our agent's tool host service. We use the official MCP server's code without the IPC layer — the integration counts toward the "uses Fivetran MCP" requirement.

## Revised agent decision graph

1. `discover_source_schema()` — Fivetran MCP `get_connection_schema_config`
2. `sample_real_rows()` — Engine (direct Postgres) — unchanged
3. `generate_synthetic()` — Engine — unchanged
4. `validate_fidelity()` — Engine — unchanged
5. `write_run_to_firestore()` — Firestore — unchanged
6. `request_human_approval()` — Firestore polling — unchanged
7. **`upload_synthetic_to_gcs()`** — NEW
8. **`trigger_fivetran_sync()`** — Fivetran MCP `sync_connection` (was `push_destination`)
9. **`wait_for_sync_complete()`** — Fivetran MCP `get_connection_details` polling
10. `notify_slack()` — unchanged

## Sources

- Official repo: https://github.com/fivetran/fivetran-mcp
- Tool catalog: see README "Available Tools" section
- Fivetran blog post: https://www.fivetran.com/blog/integrate-data-faster-using-natural-language-fivetran-and-mcp

## Open questions to verify in Phase 2/3

- [ ] Does Fivetran free tier include the GCS connector? (will discover when calling `create_connection`)
- [ ] What's the minimum sync interval? (per-run sync needs to complete in ~minutes for the demo)
- [ ] Confirm the Postgres destination supports our schema choices
