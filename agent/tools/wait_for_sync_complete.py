"""Polls Fivetran connection status until the latest sync completes or
the timeout fires. A sync is "complete" when `status.sync_state` returns
to 'scheduled' AND `succeeded_at` advances past the time we started polling.
"""
from __future__ import annotations
import os
import time
import httpx

API = "https://api.fivetran.com/v1"


def wait_for_sync_complete(
    connection_id: str | None = None,
    timeout_seconds: int = 600,
    poll_interval: int = 8,
) -> dict:
    conn = connection_id or os.environ["FIVETRAN_CONNECTION_ID"]
    key = os.environ["FIVETRAN_API_KEY"]
    secret = os.environ["FIVETRAN_API_SECRET"]

    start_wall = time.time()
    # Capture the initial succeeded_at so we know when a fresh sync finishes.
    init = httpx.get(f"{API}/connections/{conn}", auth=(key, secret), timeout=15).json()
    start_marker_succeeded_at: str | None = init.get("data", {}).get("succeeded_at")

    while time.time() - start_wall < timeout_seconds:
        time.sleep(poll_interval)
        resp = httpx.get(f"{API}/connections/{conn}", auth=(key, secret), timeout=15)
        resp.raise_for_status()
        data = resp.json().get("data", {})
        sync_state = data.get("status", {}).get("sync_state")
        failed_at = data.get("failed_at")
        succeeded_at = data.get("succeeded_at")

        if failed_at and failed_at != init.get("data", {}).get("failed_at"):
            return {"status": "failed", "failed_at": failed_at}
        if sync_state == "scheduled" and succeeded_at and succeeded_at != start_marker_succeeded_at:
            return {"status": "succeeded", "succeeded_at": succeeded_at}

    return {"status": "timeout"}
