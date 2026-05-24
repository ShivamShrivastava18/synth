#!/usr/bin/env bash
# Deploy the Next.js dashboard to Cloud Run.
# Cloud Run will use the Compute Engine default service account, which needs
# Datastore User role on the project to read Firestore. We grant that idempotently.

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-synth-hackathon-2026}"
REGION="${REGION:-us-central1}"
SERVICE="${SERVICE:-synth-dashboard}"

if [[ -z "${ENGINE_URL:-}" ]]; then
  echo "ENGINE_URL not set. Source ~/.synth.env first."
  exit 1
fi

PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
RUNTIME_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

echo "→ Ensuring runtime SA can read Firestore"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/datastore.user" \
  --condition=None \
  --quiet > /dev/null

echo "→ Deploying $SERVICE to Cloud Run ($REGION)"
gcloud run deploy "$SERVICE" \
  --source dashboard/ \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --timeout 60 \
  --min-instances 0 \
  --max-instances 2 \
  --set-env-vars "ENGINE_URL=${ENGINE_URL},GCP_PROJECT_ID=${PROJECT_ID}" \
  --quiet

URL=$(gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)')
echo ""
echo "✓ Deployed: $URL"
