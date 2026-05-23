"""Cloud SQL Postgres accessor.

DSNs are read from env vars `PROD_DB_DSN` and `STAGING_DB_DSN`. Locally these
point through the Cloud SQL Auth Proxy (127.0.0.1:5435 / :5436); in Cloud Run
they point at the Cloud SQL instance over its socket path.
"""
from __future__ import annotations

import os

import pandas as pd
from sqlalchemy import create_engine, text


def _engine(db: str):
    key = f"{db.upper()}_DB_DSN"
    dsn = os.environ.get(key)
    if not dsn:
        raise RuntimeError(f"{key} is not set")
    return create_engine(dsn, pool_pre_ping=True)


def sample_rows(table: str, n: int = 5000, *, db: str = "prod") -> pd.DataFrame:
    engine = _engine(db)
    with engine.connect() as conn:
        return pd.read_sql(
            text(f"SELECT * FROM {table} ORDER BY random() LIMIT :n"),
            conn,
            params={"n": n},
        )


def describe_schema(table: str, *, db: str = "prod") -> dict:
    engine = _engine(db)
    with engine.connect() as conn:
        rows = conn.execute(
            text(
                "SELECT column_name, data_type "
                "FROM information_schema.columns "
                "WHERE table_name = :t "
                "ORDER BY ordinal_position"
            ),
            {"t": table},
        ).fetchall()
    return {"table": table, "columns": [{"name": r[0], "type": r[1]} for r in rows]}


def write_rows(table: str, df: pd.DataFrame, *, db: str = "staging") -> int:
    engine = _engine(db)
    df.to_sql(table, engine, if_exists="replace", index=False, chunksize=5_000, method="multi")
    return len(df)
