"""Triggers Fivetran's sync_connection via the Fivetran REST API (the same
endpoint the Fivetran MCP's sync_connection tool wraps).

We call the REST API directly so the agent tool can run in Cloud Run
without spawning a subprocess. This is functionally equivalent to invoking
the MCP — same API, same behavior — just without the stdio layer.

If the connection is currently paused we unpause it first so the sync
actually executes (Fivetran returns "Success" on /sync even for a paused
connection, but the sync never runs until the connection is live).
"""
import os
import httpx

API = "https://api.fivetran.com/v1"


def trigger_fivetran_sync(connection_id: str | None = None, force: bool = False) -> dict:
    conn = connection_id or os.environ["FIVETRAN_CONNECTION_ID"]
    key = os.environ["FIVETRAN_API_KEY"]
    secret = os.environ["FIVETRAN_API_SECRET"]
    auth = (key, secret)

    # Check if the connection is paused — if so, unpause it first so the sync
    # actually executes. (Fivetran's /sync endpoint returns "Success" even for
    # paused connections but the job never runs until the connection is live.)
    status_resp = httpx.get(f"{API}/connections/{conn}", auth=auth, timeout=15)
    status_resp.raise_for_status()
    conn_data = status_resp.json().get("data", {})
    if conn_data.get("paused"):
        unpause_resp = httpx.patch(
            f"{API}/connections/{conn}",
            auth=auth,
            json={"paused": False},
            timeout=15,
        )
        unpause_resp.raise_for_status()

    resp = httpx.post(
        f"{API}/connections/{conn}/sync",
        auth=auth,
        json={"force": force},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()
