#!/usr/bin/env bash
# Start Cloud SQL Auth Proxies for synth-prod (port 5435) and synth-staging (port 5436).
# Logs to /tmp/synth-{prod,staging}-proxy.log. Kill with: pkill -f cloud-sql-proxy

set -euo pipefail

PROJECT="${PROJECT_ID:-synth-hackathon-2026}"
REGION="${REGION:-us-central1}"

pkill -f cloud-sql-proxy 2>/dev/null || true
sleep 1

cloud-sql-proxy "${PROJECT}:${REGION}:synth-prod" --port 5435 \
  > /tmp/synth-prod-proxy.log 2>&1 &
echo "synth-prod proxy: pid $! → 127.0.0.1:5435"

cloud-sql-proxy "${PROJECT}:${REGION}:synth-staging" --port 5436 \
  > /tmp/synth-staging-proxy.log 2>&1 &
echo "synth-staging proxy: pid $! → 127.0.0.1:5436"

sleep 3
echo "Both running. Source ~/.synth.env to use PROD_DB_DSN and STAGING_DB_DSN."
