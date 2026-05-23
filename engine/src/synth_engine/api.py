"""FastAPI app for the Synth engine. Stateless except for an in-memory
cache of synthetic outputs keyed by run_id."""
from __future__ import annotations

import uuid
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
import pandas as pd

from .data import sample_rows, describe_schema, write_rows
from .generators import generate, _REGISTRY as _ENGINE_REGISTRY
from .schema import Schema
from .validators.dcr import compute_dcr_min
from .validators.tstr import compute_tstr_auc
from .validators.ks_js import compute_ks_avg, compute_js_avg

app = FastAPI(title="Synth Engine")


class GenerateReq(BaseModel):
    source_table: str
    engine: str = "gaussian_copula"
    n: int = 50_000
    run_id: Optional[str] = None


class ValidateReq(BaseModel):
    run_id: str
    source_table: str
    target_col: Optional[str] = None


class PushReq(BaseModel):
    run_id: str
    destination_table: str


_SYNTH_CACHE: dict[str, pd.DataFrame] = {}


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/schema/{table}")
def schema_endpoint(table: str):
    try:
        return describe_schema(table)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.post("/generate")
def generate_endpoint(req: GenerateReq):
    # Validate engine before hitting the DB
    if req.engine not in _ENGINE_REGISTRY:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown engine {req.engine!r}. Valid choices: {list(_ENGINE_REGISTRY)}",
        )

    # Sample real rows from the DB
    try:
        real_df = sample_rows(req.source_table, n=20_000, db="prod")
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"DB unavailable: {exc}") from exc

    # Infer schema and generate synthetic data
    schema = Schema.infer(real_df)
    synth_df = generate(real_df, schema, engine=req.engine, n=req.n, seed=None)

    # Cache under a stable run_id
    run_id = req.run_id or str(uuid.uuid4())
    _SYNTH_CACHE[run_id] = synth_df

    return {
        "run_id": run_id,
        "rows": len(synth_df),
        "engine": req.engine,
        "columns": synth_df.columns.tolist(),
    }


@app.post("/validate")
def validate_endpoint(req: ValidateReq):
    synth_df = _SYNTH_CACHE.get(req.run_id)
    if synth_df is None:
        raise HTTPException(status_code=404, detail=f"run_id {req.run_id!r} not found in cache")

    try:
        real_df = sample_rows(req.source_table, n=10_000, db="prod")
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"DB unavailable: {exc}") from exc

    tstr: Optional[float] = None
    if req.target_col is not None:
        tstr = compute_tstr_auc(synth_df, real_df, req.target_col)

    ks_avg = compute_ks_avg(synth_df, real_df)
    js_avg = compute_js_avg(synth_df, real_df)
    dcr_min = compute_dcr_min(synth_df, real_df)

    return {
        "TSTR": tstr,
        "KS_avg": ks_avg,
        "JS_avg": js_avg,
        "DCR_min": dcr_min,
    }


@app.post("/push")
def push_endpoint(req: PushReq):
    synth_df = _SYNTH_CACHE.get(req.run_id)
    if synth_df is None:
        raise HTTPException(status_code=404, detail=f"run_id {req.run_id!r} not found in cache")

    try:
        pushed = write_rows(req.destination_table, synth_df, db="staging")
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"DB unavailable: {exc}") from exc

    return {"pushed": pushed}


@app.get("/runs/{run_id}/plot_sample")
def plot_sample_endpoint(
    run_id: str,
    source_table: str = Query(...),
    columns: str = Query(...),
):
    synth_df = _SYNTH_CACHE.get(run_id)
    if synth_df is None:
        raise HTTPException(status_code=404, detail=f"run_id {run_id!r} not found in cache")

    requested_cols = [c.strip() for c in columns.split(",") if c.strip()]

    try:
        real_df = sample_rows(source_table, n=500, db="prod")
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"DB unavailable: {exc}") from exc

    # Filter to only requested columns that exist in each frame
    real_cols = [c for c in requested_cols if c in real_df.columns]
    synth_cols = [c for c in requested_cols if c in synth_df.columns]

    real_sample = real_df[real_cols].head(500)
    synth_sample = synth_df[synth_cols].sample(n=min(500, len(synth_df)), random_state=42)

    return {
        "real": real_sample.to_dict(orient="records"),
        "synth": synth_sample.to_dict(orient="records"),
    }
