"""Calls Engine /upload_gcs to write the cached synthetic DataFrame to GCS as parquet."""
import os
import httpx

ENGINE_URL = os.environ["ENGINE_URL"]


def upload_synthetic_to_gcs(
    run_id: str,
    destination_table: str,
    bucket: str = "synth-staging-data",
) -> dict:
    resp = httpx.post(
        f"{ENGINE_URL}/upload_gcs",
        json={"run_id": run_id, "destination_table": destination_table, "bucket": bucket},
        timeout=300,
    )
    resp.raise_for_status()
    return resp.json()
