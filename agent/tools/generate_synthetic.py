"""Wraps Engine /generate."""
import os
import httpx

ENGINE_URL = os.environ["ENGINE_URL"]


def generate_synthetic(
    source_table: str,
    engine: str = "gaussian_copula",
    n: int = 50_000,
    run_id: str | None = None,
) -> dict:
    body = {"source_table": source_table, "engine": engine, "n": n}
    if run_id is not None:
        body["run_id"] = run_id
    resp = httpx.post(f"{ENGINE_URL}/generate", json=body, timeout=300)
    resp.raise_for_status()
    return resp.json()
