"""Mock-based tests for the tool host. Live integration testing happens
post-deploy via curl, not here."""
from __future__ import annotations
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
import os

# Set env before import
os.environ.setdefault("ENGINE_URL", "https://example.invalid")

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from tool_server import app

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"ok": True}


def test_discover_schema_proxies_to_engine():
    with patch("tool_server.discover_schema") as mock:
        mock.return_value = {"table": "x", "columns": []}
        r = client.post("/tools/discover_schema", json={"source_table": "x"})
    assert r.status_code == 200
    assert r.json() == {"table": "x", "columns": []}


def test_generate_synthetic_proxies():
    with patch("tool_server.generate_synthetic") as mock:
        mock.return_value = {"run_id": "abc", "rows": 100, "engine": "gaussian_copula", "columns": []}
        r = client.post("/tools/generate_synthetic", json={"source_table": "x", "n": 100})
    assert r.status_code == 200
    assert r.json()["run_id"] == "abc"


def test_validate_fidelity_proxies():
    with patch("tool_server.validate_fidelity") as mock:
        mock.return_value = {"TSTR": 0.85, "KS_avg": 0.05, "JS_avg": 0.1, "DCR_min": 0.5}
        r = client.post("/tools/validate_fidelity", json={"run_id": "abc", "source_table": "x"})
    assert r.status_code == 200
    assert r.json()["TSTR"] == 0.85


def test_notify_slack_stub_works_without_webhook(monkeypatch):
    monkeypatch.delenv("SLACK_WEBHOOK_URL", raising=False)
    r = client.post("/tools/notify_slack", json={"message": "hello"})
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    assert body["delivered"] is False
