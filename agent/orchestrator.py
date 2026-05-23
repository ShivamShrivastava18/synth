"""End-to-end agent orchestrator (Python reference impl).

Mirrors the decision graph the Gemini Agent Builder agent will follow.
We keep this around for two reasons:
  1. Lets us validate the tool chain without the Agent Builder console.
  2. Acts as the canonical reference for the decision logic.

Run with:
    source ~/.synth.env
    python agent/orchestrator.py --source loan_applications --target loan_status
"""
from __future__ import annotations

import argparse
import os
import sys
import time
import uuid

import httpx

TOOLS_URL = os.environ["TOOLS_URL"]
TIMEOUT = 600

# Fidelity gate thresholds (from spec §5)
TSTR_MIN = 0.75
KS_MAX = 0.15
DCR_MIN = 0.10


def call_tool(name: str, body: dict) -> dict:
    resp = httpx.post(f"{TOOLS_URL}/tools/{name}", json=body, timeout=TIMEOUT)
    if resp.status_code != 200:
        raise RuntimeError(f"tool {name} failed: {resp.status_code} {resp.text}")
    return resp.json()


def passes_gate(m: dict) -> bool:
    tstr = m.get("TSTR")
    ks = m.get("KS_avg")
    dcr = m.get("DCR_min")
    if tstr is None or ks is None or dcr is None:
        return False
    return tstr >= TSTR_MIN and ks <= KS_MAX and dcr >= DCR_MIN


def run(source_table: str, destination_table: str, target_col: str | None) -> dict:
    run_id = str(uuid.uuid4())
    print(f"\n=== run_id={run_id} ===")

    # 1. discover_source_schema
    print("\n[1] discover_source_schema")
    schema = call_tool("discover_schema", {"source_table": source_table})
    print(f"    {len(schema['columns'])} columns")

    # 2. generate_synthetic (try copula first)
    engine = "gaussian_copula"
    retry_count = 0
    metrics = None

    for attempt in range(2):  # original + 1 retry
        print(f"\n[2.{attempt}] generate_synthetic engine={engine} run_id={run_id}")
        gen = call_tool(
            "generate_synthetic",
            {"source_table": source_table, "engine": engine, "n": 5000, "run_id": run_id},
        )
        print(f"    generated {gen['rows']} rows")

        # 3. validate_fidelity
        print(f"[3.{attempt}] validate_fidelity")
        metrics = call_tool(
            "validate_fidelity",
            {"run_id": run_id, "source_table": source_table, "target_col": target_col},
        )
        for k, v in metrics.items():
            print(f"    {k}: {v:.4f}" if v is not None else f"    {k}: None")

        if passes_gate(metrics):
            print("    ✓ fidelity gate passed")
            break
        else:
            print("    ✗ fidelity gate failed")
            if attempt == 0:
                engine = "conditional_histogram"
                retry_count = 1
                print(f"    → retrying with engine={engine}")
            else:
                print("    → both engines failed; halting")
                call_tool("notify_slack", {
                    "message": f"Synth run {run_id} failed fidelity on both engines. "
                               f"Final metrics: {metrics}"
                })
                # Still write the run so it's visible
                call_tool("write_run", {
                    "run_id": run_id,
                    "trigger": "manual",
                    "source_table": source_table,
                    "destination_table": destination_table,
                    "engine": engine,
                    "retry_count": retry_count,
                    "status": "failed",
                    "metrics": metrics,
                    "plot_columns": pick_plot_columns(schema),
                })
                return {"run_id": run_id, "status": "failed", "metrics": metrics}

    # 4. write_run as awaiting_approval
    plot_columns = pick_plot_columns(schema)
    print(f"\n[4] write_run status=awaiting_approval plot_columns={plot_columns[:3]}…")
    call_tool("write_run", {
        "run_id": run_id,
        "trigger": "manual",
        "source_table": source_table,
        "destination_table": destination_table,
        "engine": engine,
        "retry_count": retry_count,
        "status": "awaiting_approval",
        "metrics": metrics,
        "plot_columns": plot_columns,
    })

    # 5. notify_slack
    call_tool("notify_slack", {
        "message": f"Synth run {run_id} awaiting approval. "
                   f"TSTR={metrics['TSTR']:.3f} KS={metrics['KS_avg']:.3f} DCR={metrics['DCR_min']:.3f}"
    })

    # 6. request_human_approval (SKIPPED in this orchestrator run — would block 30 min)
    print("\n[6] request_human_approval — skipped in CLI orchestrator")
    print(f"    Dashboard will show run {run_id} as awaiting_approval")
    print(f"    To approve in Firestore manually: set runs/{run_id}.approval_verdict = 'approved'")

    return {"run_id": run_id, "status": "awaiting_approval", "metrics": metrics}


def pick_plot_columns(schema: dict, n: int = 4) -> list[str]:
    """Pick numeric columns with broad range — good for distribution plots."""
    numerics = [
        c["name"] for c in schema["columns"]
        if c["type"] in {"double precision", "numeric", "integer", "bigint", "real"}
    ]
    preferred = ["loan_amnt", "int_rate", "annual_inc", "dti", "fico_range_low",
                 "installment", "revol_util"]
    picks = [c for c in preferred if c in numerics][:n]
    if len(picks) < n:
        picks += [c for c in numerics if c not in picks][: n - len(picks)]
    return picks


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--source", required=True, help="Source table in prod DB")
    p.add_argument("--destination", default=None, help="Destination table (defaults to source name)")
    p.add_argument("--target", default=None, help="Target column for TSTR (optional)")
    args = p.parse_args()

    destination = args.destination or args.source
    result = run(args.source, destination, args.target)
    print(f"\n=== final: {result['status']} ===")
    return 0 if result["status"] != "failed" else 1


if __name__ == "__main__":
    sys.exit(main())
