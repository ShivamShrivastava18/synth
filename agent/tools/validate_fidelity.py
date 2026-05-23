"""Wraps Engine /validate."""
import os
import httpx

ENGINE_URL = os.environ["ENGINE_URL"]


def validate_fidelity(run_id: str, source_table: str, target_col: str | None = None) -> dict:
    body = {"run_id": run_id, "source_table": source_table}
    if target_col is not None:
        body["target_col"] = target_col
    resp = httpx.post(f"{ENGINE_URL}/validate", json=body, timeout=300)
    resp.raise_for_status()
    return resp.json()
