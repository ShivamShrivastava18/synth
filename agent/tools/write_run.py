"""Writes / updates a run document in Firestore.

A run doc looks like:
  runs/{run_id} = {
    trigger, source_table, destination_table, engine, retry_count,
    status, metrics, plot_columns,
    created_at, approved_at, approval_verdict, pushed_at,
  }

Always uses set(merge=True) so partial updates from later steps don't clobber
earlier fields.
"""
from __future__ import annotations
from datetime import datetime, timezone
from google.cloud import firestore

_db = firestore.Client()


def write_run(
    run_id: str,
    *,
    trigger: str | None = None,
    source_table: str | None = None,
    destination_table: str | None = None,
    engine: str | None = None,
    retry_count: int | None = None,
    status: str | None = None,
    metrics: dict | None = None,
    plot_columns: list[str] | None = None,
) -> dict:
    doc: dict = {}
    if trigger is not None: doc["trigger"] = trigger
    if source_table is not None: doc["source_table"] = source_table
    if destination_table is not None: doc["destination_table"] = destination_table
    if engine is not None: doc["engine"] = engine
    if retry_count is not None: doc["retry_count"] = retry_count
    if status is not None: doc["status"] = status
    if metrics is not None: doc["metrics"] = metrics
    if plot_columns is not None: doc["plot_columns"] = plot_columns
    # First write also sets created_at
    snap = _db.collection("runs").document(run_id).get()
    if not snap.exists:
        doc["created_at"] = datetime.now(timezone.utc)
        doc.setdefault("approved_at", None)
        doc.setdefault("approval_verdict", None)
        doc.setdefault("pushed_at", None)
    _db.collection("runs").document(run_id).set(doc, merge=True)
    return {"ok": True, "run_id": run_id, "wrote_fields": list(doc.keys())}
