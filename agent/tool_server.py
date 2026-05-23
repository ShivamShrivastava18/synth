"""FastAPI host for the Synth agent's tools. Agent Builder calls these
endpoints over HTTPS; each one wraps a single tool function."""
from __future__ import annotations
from typing import Optional, List
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from tools.discover_schema import discover_schema
from tools.generate_synthetic import generate_synthetic
from tools.validate_fidelity import validate_fidelity
from tools.write_run import write_run
from tools.request_approval import request_human_approval
from tools.notify_slack import notify_slack

app = FastAPI(title="Synth Agent Tools")


class DiscoverReq(BaseModel):
    source_table: str

class GenerateReq(BaseModel):
    source_table: str
    engine: str = "gaussian_copula"
    n: int = 50_000
    run_id: Optional[str] = None

class ValidateReq(BaseModel):
    run_id: str
    source_table: str
    target_col: Optional[str] = None

class WriteRunReq(BaseModel):
    run_id: str
    trigger: Optional[str] = None
    source_table: Optional[str] = None
    destination_table: Optional[str] = None
    engine: Optional[str] = None
    retry_count: Optional[int] = None
    status: Optional[str] = None
    metrics: Optional[dict] = None
    plot_columns: Optional[List[str]] = None

class ApprovalReq(BaseModel):
    run_id: str
    timeout_seconds: int = 1800
    poll_interval: int = 5

class SlackReq(BaseModel):
    message: str


@app.get("/health")
def health(): return {"ok": True}

@app.post("/tools/discover_schema")
def t_discover(req: DiscoverReq):
    try:
        return discover_schema(req.source_table)
    except Exception as e:
        raise HTTPException(502, str(e))

@app.post("/tools/generate_synthetic")
def t_generate(req: GenerateReq):
    try:
        return generate_synthetic(**req.model_dump(exclude_none=True))
    except Exception as e:
        raise HTTPException(502, str(e))

@app.post("/tools/validate_fidelity")
def t_validate(req: ValidateReq):
    try:
        return validate_fidelity(**req.model_dump(exclude_none=True))
    except Exception as e:
        raise HTTPException(502, str(e))

@app.post("/tools/write_run")
def t_write(req: WriteRunReq):
    try:
        return write_run(**req.model_dump(exclude_none=True))
    except Exception as e:
        raise HTTPException(500, str(e))

@app.post("/tools/request_human_approval")
def t_approve(req: ApprovalReq):
    try:
        return request_human_approval(**req.model_dump())
    except Exception as e:
        raise HTTPException(500, str(e))

@app.post("/tools/notify_slack")
def t_slack(req: SlackReq):
    try:
        return notify_slack(req.message)
    except Exception as e:
        raise HTTPException(502, str(e))
