#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${GCS_BUCKET_NAME:-}" ]]; then
  echo "GCS_BUCKET_NAME is required" >&2
  exit 1
fi

gcloud storage buckets update "gs://${GCS_BUCKET_NAME}" \
  --cors-file=infrastructure/gcp/gcs-cors.json
