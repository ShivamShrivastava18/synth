"""End-to-end FastAPI tests using TestClient. The DB-dependent tests skip
unless PROD_DB_DSN is set (Cloud SQL proxy must be running)."""
import os
import pytest
from fastapi.testclient import TestClient
from synth_engine.api import app

client = TestClient(app)

needs_db = pytest.mark.skipif(
    not os.environ.get("PROD_DB_DSN"),
    reason="needs Cloud SQL proxy",
)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"ok": True}


@needs_db
def test_schema_endpoint():
    r = client.get("/schema/loan_applications")
    assert r.status_code == 200
    body = r.json()
    assert body["table"] == "loan_applications"
    assert any(c["name"] == "loan_status" for c in body["columns"])


def test_generate_rejects_unknown_engine():
    r = client.post(
        "/generate",
        json={"source_table": "loan_applications", "engine": "bogus", "n": 10},
    )
    assert r.status_code == 400


@needs_db
def test_generate_validate_push_flow():
    # 1) Generate a small synth (100 rows for speed)
    gen = client.post(
        "/generate",
        json={
            "source_table": "loan_applications",
            "engine": "conditional_histogram",
            "n": 200,
        },
    )
    assert gen.status_code == 200, gen.text
    body = gen.json()
    run_id = body["run_id"]
    assert body["rows"] == 200
    assert body["engine"] == "conditional_histogram"
    assert len(body["columns"]) > 20

    # 2) Validate fidelity
    val = client.post(
        "/validate",
        json={
            "run_id": run_id,
            "source_table": "loan_applications",
            "target_col": "loan_status",
        },
    )
    assert val.status_code == 200, val.text
    metrics = val.json()
    assert "TSTR" in metrics
    assert "KS_avg" in metrics
    assert "JS_avg" in metrics
    assert "DCR_min" in metrics

    # 3) Plot sample
    plot_cols = ",".join(body["columns"][:2])
    plot = client.get(
        f"/runs/{run_id}/plot_sample?source_table=loan_applications&columns={plot_cols}",
    )
    assert plot.status_code == 200, plot.text
    pj = plot.json()
    assert "real" in pj and "synth" in pj
    assert len(pj["real"]) > 0 and len(pj["synth"]) > 0


def test_validate_unknown_run_returns_404():
    r = client.post(
        "/validate",
        json={"run_id": "nope", "source_table": "loan_applications"},
    )
    assert r.status_code == 404


def test_push_unknown_run_returns_404():
    r = client.post(
        "/push",
        json={"run_id": "nope", "destination_table": "x"},
    )
    assert r.status_code == 404


def test_plot_sample_unknown_run_returns_404():
    r = client.get("/runs/nope/plot_sample?source_table=x&columns=a")
    assert r.status_code == 404
