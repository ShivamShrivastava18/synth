#!/usr/bin/env bash
# Deploy the Synth engine service to Cloud Run.
# Uses `gcloud run deploy --source` which builds via Cloud Build and pushes
# to Artifact Registry automatically. Connects to Cloud SQL via Unix socket.

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-synth-hackathon-2026}"
REGION="${REGION:-us-central1}"
SERVICE="${SERVICE:-synth-engine}"

if [[ -z "${PG_PASSWORD:-}" ]]; then
  echo "PG_PASSWORD not set. Source ~/.synth.env first."
  exit 1
fi

# Cloud SQL connection: Unix socket DSN. SQLAlchemy understands ?host=…
PROD_DSN="postgresql+psycopg2://postgres:${PG_PASSWORD}@/lending?host=/cloudsql/${PROJECT_ID}:${REGION}:synth-prod"
STAGING_DSN="postgresql+psycopg2://postgres:${PG_PASSWORD}@/lending?host=/cloudsql/${PROJECT_ID}:${REGION}:synth-staging"

echo "→ Deploying $SERVICE to Cloud Run ($REGION)"
gcloud run deploy "$SERVICE" \
  --source engine/ \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --min-instances 0 \
  --max-instances 3 \
  --add-cloudsql-instances "${PROJECT_ID}:${REGION}:synth-prod,${PROJECT_ID}:${REGION}:synth-staging" \
  --set-env-vars "PROD_DB_DSN=${PROD_DSN},STAGING_DB_DSN=${STAGING_DSN}"

URL=$(gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)')
echo ""
echo "✓ Deployed: $URL"
echo ""
echo "Smoke test: curl $URL/health"
