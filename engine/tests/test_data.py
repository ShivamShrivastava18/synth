"""Cloud SQL accessor tests — skipped unless PROD_DB_DSN is set."""
from __future__ import annotations

import os

import pytest

from synth_engine.data import describe_schema, sample_rows


needs_db = pytest.mark.skipif(
    not os.environ.get("PROD_DB_DSN"),
    reason="needs Cloud SQL proxy (source ~/.synth.env, run infra/start_proxies.sh)",
)


@needs_db
def test_sample_rows_returns_requested_count() -> None:
    df = sample_rows("loan_applications", n=100)
    assert len(df) == 100
    assert "loan_status" in df.columns


@needs_db
def test_describe_schema_returns_columns() -> None:
    s = describe_schema("loan_applications")
    assert s["table"] == "loan_applications"
    assert len(s["columns"]) > 20
    names = {c["name"] for c in s["columns"]}
    assert "loan_status" in names
