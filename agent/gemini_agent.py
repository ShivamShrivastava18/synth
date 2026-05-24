"""Synth — the actual Gemini 3.1 Pro agent.

This is the Agent Builder agent: Vertex AI's GenerativeModel with function
calling, given the 9 Synth tools as FunctionDeclarations and a system prompt
that encodes the decision graph (generate → validate → branch on fidelity →
human approval → upload to GCS → trigger Fivetran sync → wait → notify).

When invoked, it runs a tool-call loop until the model returns plain text
(its final report). All side effects flow through the HTTP tool host at
$TOOLS_URL, so this module remains pure orchestration.

Run locally:
    source ~/.synth.env
    python agent/gemini_agent.py --source loan_applications --target loan_status
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import uuid
from typing import Any

import httpx
import vertexai
from vertexai.generative_models import (
    Content,
    FunctionDeclaration,
    GenerativeModel,
    Part,
    Tool,
)


# ─── Config ────────────────────────────────────────────────────────────────
PROJECT_ID = os.environ.get("PROJECT_ID", "synth-hackathon-2026")
VERTEX_LOCATION = os.environ.get("VERTEX_LOCATION", "global")
MODEL_NAME = os.environ.get("MODEL_PRIMARY", "gemini-3.1-pro-preview")
TOOLS_URL = os.environ["TOOLS_URL"]
TOOL_TIMEOUT = 900

SYSTEM_PROMPT = """You are Synth, an autonomous agent that produces fidelity-validated synthetic data and ships it into a staging warehouse via Fivetran.

When invoked, follow this decision graph EXACTLY:

1. Call discover_schema(source_table) to learn the source schema.
2. Call generate_synthetic(source_table=…, engine="gaussian_copula", n=5000, run_id=<a new UUID you mint and reuse for the rest of the run>).
3. Call validate_fidelity(run_id=…, source_table=…, target_col=…). Inspect the metrics:
   - TSTR ≥ 0.75 AND KS_avg ≤ 0.15 AND DCR_min ≥ 0.10 → fidelity passes, continue.
   - Otherwise → fidelity fails, retry generate_synthetic ONCE with engine="conditional_histogram" and the same run_id; re-validate.
   - If still failing after the retry → notify_slack with the failure summary; call write_run(status="failed"); HALT.
4. Once fidelity passes, call write_run with the full record:
     trigger="manual",
     source_table, destination_table,
     engine = whichever passed,
     retry_count = 0 or 1,
     status = "awaiting_approval",
     metrics = the metrics dict from validate_fidelity,
     plot_columns = the four most informative numeric columns from the schema (prefer: loan_amnt, int_rate, annual_inc, dti, fico_range_low — pick any four that exist).
5. Call notify_slack with a one-line summary of the run + metrics.
6. Call request_human_approval(run_id=…, timeout_seconds=1800). This blocks until the human approves or rejects via the dashboard.
   - If verdict="rejected": call write_run(status="rejected"); notify_slack the rejection; HALT.
   - If verdict="timeout": call notify_slack the timeout; HALT.
   - If verdict="approved": proceed.
7. Call upload_synthetic_to_gcs(run_id=…, destination_table=…).
8. Call trigger_fivetran_sync(). The default connection is used.
9. Call wait_for_sync_complete(timeout_seconds=900).
   - On status="succeeded": call write_run(status="pushed"); notify_slack the success; finish.
   - Otherwise: notify_slack with the sync failure; call write_run(status="failed"); HALT.

Rules:
- NEVER skip a step.
- NEVER fabricate metric values — always read them from validate_fidelity's response.
- NEVER push to staging without a verdict="approved" from request_human_approval.
- ALWAYS reuse the same run_id across the whole run.
- When you mint a run_id, use a normal UUID4 (e.g. "8d31e840-...").
- When you finish, your final reply should be a short plain-text summary: which engine won, what the metrics were, whether it was approved, and whether it landed in staging.
""".strip()


# ─── Tool definitions (Vertex AI function-calling schemas) ────────────────

def _tool_decls() -> list[FunctionDeclaration]:
    return [
        FunctionDeclaration(
            name="discover_schema",
            description="Read the schema of a source table — column names and types.",
            parameters={
                "type": "object",
                "properties": {
                    "source_table": {"type": "string", "description": "Source table name in the prod database, e.g. 'loan_applications'."},
                },
                "required": ["source_table"],
            },
        ),
        FunctionDeclaration(
            name="generate_synthetic",
            description="Generate N synthetic rows for the source table using the requested engine. Caches the synthetic data under run_id for later steps.",
            parameters={
                "type": "object",
                "properties": {
                    "source_table": {"type": "string"},
                    "engine": {"type": "string", "enum": ["gaussian_copula", "conditional_histogram"]},
                    "n": {"type": "integer", "description": "Number of synthetic rows."},
                    "run_id": {"type": "string", "description": "Stable UUID used to identify this run across all steps."},
                },
                "required": ["source_table", "engine", "n", "run_id"],
            },
        ),
        FunctionDeclaration(
            name="validate_fidelity",
            description="Compute TSTR (utility), KS_avg (numeric distribution similarity), JS_avg (categorical distribution similarity), DCR_min (privacy) for a cached run.",
            parameters={
                "type": "object",
                "properties": {
                    "run_id": {"type": "string"},
                    "source_table": {"type": "string"},
                    "target_col": {"type": "string", "description": "Target column for TSTR — typically 'loan_status' for the Lending Club demo."},
                },
                "required": ["run_id", "source_table"],
            },
        ),
        FunctionDeclaration(
            name="write_run",
            description="Upsert the run document in Firestore. Partial — only fields you pass are set, others preserved. Use this to record state transitions (awaiting_approval → approved → pushed) and metrics.",
            parameters={
                "type": "object",
                "properties": {
                    "run_id":          {"type": "string"},
                    "trigger":         {"type": "string", "enum": ["manual", "scheduled"]},
                    "source_table":    {"type": "string"},
                    "destination_table": {"type": "string"},
                    "engine":          {"type": "string", "enum": ["gaussian_copula", "conditional_histogram"]},
                    "retry_count":     {"type": "integer"},
                    "status":          {"type": "string", "enum": ["running", "awaiting_approval", "approved", "rejected", "pushed", "failed"]},
                    "metrics":         {"type": "object", "description": "The metrics dict returned by validate_fidelity. Pass null or omit for state-only updates."},
                    "plot_columns":    {"type": "array", "items": {"type": "string"}, "description": "Up to 4 column names to show in the dashboard's distribution plots."},
                },
                "required": ["run_id"],
            },
        ),
        FunctionDeclaration(
            name="request_human_approval",
            description="Long-poll Firestore until a human approves or rejects the run via the dashboard, or until the timeout fires. Returns {verdict: 'approved'|'rejected'|'timeout'}.",
            parameters={
                "type": "object",
                "properties": {
                    "run_id":          {"type": "string"},
                    "timeout_seconds": {"type": "integer", "description": "Max time to wait. Use 1800 (30 min) for production runs."},
                    "poll_interval":   {"type": "integer", "description": "Seconds between polls. Default 5."},
                },
                "required": ["run_id"],
            },
        ),
        FunctionDeclaration(
            name="notify_slack",
            description="Send a one-line status message to the Slack channel. Use for: awaiting-approval pings, success confirmation, failure alerts. Idempotent.",
            parameters={
                "type": "object",
                "properties": {"message": {"type": "string"}},
                "required": ["message"],
            },
        ),
        FunctionDeclaration(
            name="upload_synthetic_to_gcs",
            description="Upload the cached synthetic data for this run_id to GCS as parquet, at gs://synth-staging-data/{destination_table}/{run_id}.parquet. Returns the URI.",
            parameters={
                "type": "object",
                "properties": {
                    "run_id":            {"type": "string"},
                    "destination_table": {"type": "string"},
                },
                "required": ["run_id", "destination_table"],
            },
        ),
        FunctionDeclaration(
            name="trigger_fivetran_sync",
            description="Trigger the Fivetran connection (default: GCS → BigQuery synth_staging) to ingest any new parquet files. Returns Fivetran's job acknowledgement.",
            parameters={
                "type": "object",
                "properties": {
                    "connection_id": {"type": "string", "description": "Optional. Defaults to the configured FIVETRAN_CONNECTION_ID."},
                    "force":         {"type": "boolean", "description": "Optional. Force a full historical re-sync. Default false."},
                },
            },
        ),
        FunctionDeclaration(
            name="wait_for_sync_complete",
            description="Poll the Fivetran connection until the just-triggered sync completes. Returns {status: 'succeeded'|'failed'|'timeout', succeeded_at?: timestamp}.",
            parameters={
                "type": "object",
                "properties": {
                    "connection_id":   {"type": "string"},
                    "timeout_seconds": {"type": "integer", "description": "Max time to wait. Default 600."},
                    "poll_interval":   {"type": "integer", "description": "Seconds between polls. Default 8."},
                },
            },
        ),
    ]


# ─── HTTP tool dispatcher ─────────────────────────────────────────────────

def _call_tool(name: str, args: dict[str, Any]) -> Any:
    """Execute a tool by POSTing to the tool host."""
    url = f"{TOOLS_URL}/tools/{name}"
    resp = httpx.post(url, json=args, timeout=TOOL_TIMEOUT)
    if resp.status_code != 200:
        return {"error": f"HTTP {resp.status_code}", "body": resp.text[:500]}
    return resp.json()


# ─── Agent loop ────────────────────────────────────────────────────────────

def run_agent(source_table: str, destination_table: str, target_col: str | None) -> dict:
    vertexai.init(project=PROJECT_ID, location=VERTEX_LOCATION)
    model = GenerativeModel(
        model_name=MODEL_NAME,
        system_instruction=SYSTEM_PROMPT,
        tools=[Tool(function_declarations=_tool_decls())],
    )

    seed_msg = (
        f"Run synth for source_table='{source_table}', "
        f"destination_table='{destination_table}'"
        + (f", target_col='{target_col}'" if target_col else "")
        + ". Mint a fresh run_id and proceed through the decision graph."
    )

    history: list[Content] = [Content(role="user", parts=[Part.from_text(seed_msg)])]
    chat_log: list[dict] = []
    final_text: str | None = None
    max_turns = 30

    for turn in range(max_turns):
        print(f"\n--- turn {turn+1} ---", flush=True)
        resp = model.generate_content(history)

        # Collect function calls and any text in this assistant turn
        cand = resp.candidates[0]
        model_content = cand.content
        history.append(model_content)

        fn_calls: list[Part] = []
        text_parts: list[str] = []
        for p in model_content.parts:
            # Each part is exclusively a function_call OR text; accessing the
            # wrong one raises. Use the raw proto to detect which.
            raw = getattr(p, "_raw_part", None) or p
            try:
                if raw.function_call and raw.function_call.name:
                    fn_calls.append(p)
                    continue
            except Exception:
                pass
            try:
                if p.text:
                    text_parts.append(p.text)
            except Exception:
                pass
        if text_parts:
            print("    model says:", " ".join(text_parts)[:300], flush=True)

        if not fn_calls:
            final_text = " ".join(text_parts).strip()
            break

        # Execute each function call and append its response
        tool_responses: list[Part] = []
        for fc_part in fn_calls:
            fc = fc_part.function_call
            args = dict(fc.args) if fc.args else {}
            print(f"    → {fc.name}({json.dumps(args, default=str)[:200]})", flush=True)
            result = _call_tool(fc.name, args)
            print(f"    ← {json.dumps(result, default=str)[:200]}", flush=True)
            chat_log.append({"tool": fc.name, "args": args, "result": result})
            tool_responses.append(Part.from_function_response(name=fc.name, response={"content": result}))

        history.append(Content(role="user", parts=tool_responses))

    return {
        "final_text": final_text,
        "turns": turn + 1,
        "tool_calls": chat_log,
    }


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--source", required=True)
    p.add_argument("--destination", default=None)
    p.add_argument("--target", default=None)
    args = p.parse_args()
    destination = args.destination or args.source

    result = run_agent(args.source, destination, args.target)
    print("\n=== FINAL ===")
    print(result.get("final_text") or "(no final text)")
    print(f"\n{result['turns']} turns, {len(result['tool_calls'])} tool calls")
    return 0


if __name__ == "__main__":
    sys.exit(main())
