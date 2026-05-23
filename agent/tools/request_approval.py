"""Long-poll Firestore for a human approval verdict, up to timeout_seconds.

The dashboard writes approval_verdict to runs/{run_id}. This function returns
{"verdict": "approved"|"rejected"} as soon as that field is set, else
{"verdict": "timeout"} after the deadline.
"""
from __future__ import annotations
import time
from google.cloud import firestore

_db = firestore.Client()


def request_human_approval(run_id: str, timeout_seconds: int = 1800, poll_interval: int = 5) -> dict:
    start = time.time()
    while time.time() - start < timeout_seconds:
        snap = _db.collection("runs").document(run_id).get()
        if snap.exists:
            data = snap.to_dict()
            verdict = data.get("approval_verdict")
            if verdict in ("approved", "rejected"):
                return {"verdict": verdict}
        time.sleep(poll_interval)
    return {"verdict": "timeout"}
