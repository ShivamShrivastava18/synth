#!/usr/bin/env bash
# Provision GCP project and enable all APIs Synth needs.
# Idempotent — safe to re-run.
#
# Usage:
#   PROJECT_ID=synth-hackathon-2026 BILLING_ACCOUNT=01DFB3-022B09-E9C47D ./infra/enable_apis.sh

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-synth-hackathon-2026}"
BILLING_ACCOUNT="${BILLING_ACCOUNT:-}"

if [[ -z "$BILLING_ACCOUNT" ]]; then
  echo "BILLING_ACCOUNT not set. Run: gcloud beta billing accounts list"
  exit 1
fi

echo "→ Linking billing account $BILLING_ACCOUNT to $PROJECT_ID"
gcloud beta billing projects link "$PROJECT_ID" --billing-account="$BILLING_ACCOUNT"

echo "→ Setting active project"
gcloud config set project "$PROJECT_ID"

echo "→ Enabling APIs (this takes ~30 seconds)"
gcloud services enable \
  serviceusage.googleapis.com \
  cloudbilling.googleapis.com \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  sqladmin.googleapis.com \
  firestore.googleapis.com \
  cloudscheduler.googleapis.com \
  secretmanager.googleapis.com \
  aiplatform.googleapis.com \
  discoveryengine.googleapis.com \
  artifactregistry.googleapis.com \
  iam.googleapis.com

echo "✓ Done. APIs enabled on $PROJECT_ID."
