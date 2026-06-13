# Firestore Job Store and Deployment Configuration

## Summary

Implemented the production job-state boundary and deployment configuration needed after the GCS storage boundary work.

## Changes

- Added `@google-cloud/firestore` to the API package.
- Converted `apps/api/src/services/job-store.ts` from a direct in-memory `Map` implementation into a small async `JobStore` adapter.
- Kept local development on the in-memory backend by default.
- Added Firestore backend selection with `JOB_STORE_BACKEND=firestore` or `FIRESTORE_JOBS_COLLECTION`.
- Updated upload and job polling routes to await the async job store.
- Updated conversion status transitions to await job-state persistence.
- Added request ID response headers and structured error logging for unexpected API failures.
- Added `.github/workflows/deploy-api-cloud-run.yml` for Artifact Registry + Cloud Run API deployment.
- Added `.github/workflows/deploy-web-vercel.yml` for Vercel web deployment.
- Added `infrastructure/gcp/gcs-lifecycle.json` and `infrastructure/gcp/apply-gcs-lifecycle.sh` for bucket lifecycle configuration.
- Updated Cloud Run runtime documentation, docs index, and repo agent guide.
- Updated frontend completion copy to reflect short-lived signed download links.

## Verification

- `pnpm --filter api build` passed after Firestore and request-id changes.
- `pnpm --filter web lint` passed after frontend copy change.
- `pnpm -r build` passed.
- Live local API surface QA passed: `/health` returned ok, invalid upload returned 422, `.hwp` upload queued a job, and polling reached the expected LibreOffice configuration failure path in this Windows environment.

## Remaining gaps

- Actual Firestore and GCS modes require Cloud Run service account credentials, Firestore enabled in the target project, and a private bucket.
- Docker image build and successful HWP-to-PDF conversion still require a Docker/GCP runtime because Docker CLI and LibreOffice/H2Orestart are not available in this Windows environment.
