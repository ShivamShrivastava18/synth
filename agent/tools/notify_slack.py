"""POSTs a message to Slack via incoming webhook. If SLACK_WEBHOOK_URL is
unset, logs to stdout instead — useful for development before Slack is wired.
"""
from __future__ import annotations
import os
import httpx


def notify_slack(message: str) -> dict:
    url = os.environ.get("SLACK_WEBHOOK_URL", "")
    if not url:
        print(f"[SLACK STUB] {message}", flush=True)
        return {"ok": True, "delivered": False, "reason": "SLACK_WEBHOOK_URL unset"}
    resp = httpx.post(url, json={"text": message}, timeout=10)
    resp.raise_for_status()
    return {"ok": True, "delivered": True}
