"""Load Lending Club CSV into Cloud SQL 'prod' Postgres.

Samples 100k rows, drops sparse / free-text columns, writes one table:
  - public.loan_applications

Run with:
  source ~/.synth.env
  cloud-sql-proxy synth-hackathon-2026:us-central1:synth-prod &
  python infra/seed_prod.py
"""
from __future__ import annotations

import os
import sys
import time
from pathlib import Path

import pandas as pd
from sqlalchemy import create_engine, text

CSV_PATH = (
    Path.home() / "Downloads" / "lending-club"
    / "accepted_2007_to_2018q4.csv" / "accepted_2007_to_2018Q4.csv"
)
TABLE = "loan_applications"
N_ROWS = 100_000
DROP_TEXT_COLS = {"desc", "title", "emp_title", "url", "zip_code", "addr_state"}


def load_and_sample(csv_path: Path) -> pd.DataFrame:
    print(f"Reading first 500k rows from {csv_path} (full file is ~2.2M rows)…")
    t0 = time.time()
    df = pd.read_csv(csv_path, low_memory=False, nrows=500_000)
    print(f"  read {len(df):,} rows in {time.time()-t0:.1f}s")

    # Drop columns with > 50% nulls
    sparse = df.columns[df.isnull().mean() > 0.5]
    df = df.drop(columns=sparse)
    print(f"  dropped {len(sparse)} sparse columns; {len(df.columns)} remain")

    # Drop free-text columns
    to_drop = [c for c in DROP_TEXT_COLS if c in df.columns]
    df = df.drop(columns=to_drop)
    print(f"  dropped {len(to_drop)} free-text columns; {len(df.columns)} remain")

    # Sample
    df = df.sample(n=min(N_ROWS, len(df)), random_state=42).reset_index(drop=True)
    print(f"  sampled to {len(df):,} rows")
    return df


def write_to_postgres(df: pd.DataFrame, dsn: str) -> None:
    engine = create_engine(dsn)
    with engine.connect() as conn:
        conn.execute(text(f"DROP TABLE IF EXISTS {TABLE}"))
        conn.commit()
    print(f"Writing {len(df):,} rows to {TABLE}…")
    t0 = time.time()
    df.to_sql(TABLE, engine, if_exists="replace", index=False, chunksize=5_000, method="multi")
    print(f"  wrote in {time.time()-t0:.1f}s")

    with engine.connect() as conn:
        n = conn.execute(text(f"SELECT COUNT(*) FROM {TABLE}")).scalar()
        cols = conn.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name = :t ORDER BY ordinal_position"
        ), {"t": TABLE}).fetchall()
    print(f"  verified: {n:,} rows, {len(cols)} columns")


def main() -> int:
    if not CSV_PATH.exists():
        print(f"ERROR: {CSV_PATH} not found. Download with:", file=sys.stderr)
        print("  kaggle datasets download wordsforthewise/lending-club "
              f"-p {CSV_PATH.parent} --unzip", file=sys.stderr)
        return 1

    dsn = os.environ.get("PROD_DB_DSN")
    if not dsn:
        print("ERROR: PROD_DB_DSN not set. Source ~/.synth.env first.", file=sys.stderr)
        return 1

    df = load_and_sample(CSV_PATH)
    write_to_postgres(df, dsn)
    print("done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
