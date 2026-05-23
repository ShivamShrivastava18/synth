"""Wraps Engine /schema/{table}. (Future: also Fivetran MCP get_connection_schema_config.)"""
import os
import httpx

ENGINE_URL = os.environ["ENGINE_URL"]


def discover_schema(source_table: str) -> dict:
    resp = httpx.get(f"{ENGINE_URL}/schema/{source_table}", timeout=30)
    resp.raise_for_status()
    return resp.json()
