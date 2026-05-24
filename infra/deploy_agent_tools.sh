#!/usr/bin/env bash
set -euo pipefail
PROJECT_ID="${PROJECT_ID:-synth-hackathon-2026}"
REGION="${REGION:-us-central1}"
SERVICE="${SERVICE:-synth-agent-tools}"

if [[ -z "${ENGINE_URL:-}" ]]; then
  echo "ENGINE_URL not set. Source ~/.synth.env first."
  exit 1
fi

ENV_VARS="ENGINE_URL=${ENGINE_URL},GOOGLE_CLOUD_PROJECT=${PROJECT_ID}"
if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
  ENV_VARS="${ENV_VARS},SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL}"
fi
if [[ -n "${FIVETRAN_API_KEY:-}" && -n "${FIVETRAN_API_SECRET:-}" ]]; then
  ENV_VARS="${ENV_VARS},FIVETRAN_API_KEY=${FIVETRAN_API_KEY},FIVETRAN_API_SECRET=${FIVETRAN_API_SECRET}"
fi
if [[ -n "${FIVETRAN_CONNECTION_ID:-}" ]]; then
  ENV_VARS="${ENV_VARS},FIVETRAN_CONNECTION_ID=${FIVETRAN_CONNECTION_ID}"
fi

gcloud run deploy "$SERVICE" \
  --source agent/ \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --timeout 1800 \
  --min-instances 0 \
  --max-instances 3 \
  --set-env-vars "$ENV_VARS" \
  --quiet

URL=$(gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)')
echo "✓ Deployed: $URL"
