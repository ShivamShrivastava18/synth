#!/usr/bin/env bash
set -euo pipefail
PROJECT_ID="${PROJECT_ID:-synth-hackathon-2026}"
REGION="${REGION:-us-central1}"
SERVICE="${SERVICE:-synth-agent-tools}"

if [[ -z "${ENGINE_URL:-}" ]]; then
  echo "ENGINE_URL not set. Source ~/.synth.env first."
  exit 1
fi

ENV_VARS="ENGINE_URL=${ENGINE_URL},TOOLS_URL=https://synth-agent-tools-2x7iaokvka-uc.a.run.app,GOOGLE_CLOUD_PROJECT=${PROJECT_ID},PROJECT_ID=${PROJECT_ID},VERTEX_LOCATION=${VERTEX_LOCATION:-global},MODEL_PRIMARY=${MODEL_PRIMARY:-gemini-3.1-pro-preview}"
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
  --memory 2Gi \
  --cpu 2 \
  --timeout 1800 \
  --min-instances 1 \
  --max-instances 2 \
  --set-env-vars "$ENV_VARS" \
  --quiet

URL=$(gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)')
echo "✓ Deployed: $URL"
