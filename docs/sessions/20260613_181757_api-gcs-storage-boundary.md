# 2026-06-13 API GCS storage boundary

## Summary

Added a configurable storage boundary to the Express conversion API so local development keeps the existing result-serving path while Cloud Run can persist originals/results to private GCS and return signed PDF download URLs.

## Changes

- Added `@google-cloud/storage` to the API package.
- Added `apps/api/src/services/storage-service.ts` with local and GCS result publishing behavior.
- Added storage config values: `STORAGE_BACKEND`, `GCS_BUCKET_NAME`, `GCS_PROJECT_ID`, object prefixes, and signed URL TTL.
- Updated `POST /v1/upload` to persist the original HWP to GCS before queueing when GCS is enabled.
- Updated conversion completion to upload the PDF to GCS and return a V4 signed URL when GCS is enabled.
- Kept the existing local static `/v1/results` behavior as the default for local QA.
- Updated runtime docs and docs index to reflect that GCS persistence is now implemented behind a config switch.

## Runtime contract

- Default local mode: `STORAGE_BACKEND=local`, job `downloadUrl` remains `RESULT_URL_BASE/{jobId}.pdf`.
- GCS mode: set `STORAGE_BACKEND=gcs` or provide `GCS_BUCKET_NAME`.
- Original objects use `GCS_ORIGINAL_PREFIX/{jobId}/{safeFileName}`.
- Result objects use `GCS_RESULT_PREFIX/{jobId}/{jobId}.pdf`.
- Result signed URLs use `SIGNED_DOWNLOAD_URL_TTL_MINUTES`, default 15 minutes.

## Verification

- `pnpm --filter api build` passed after the storage changes.
- TypeScript LSP diagnostics for `apps/api/src` reported zero diagnostics.
- `pnpm -r build` passed after the storage changes.
- Production API bundle generation with `pnpm --filter api deploy --prod tmp/deploy-api` passed.
- Live local-backend API surface QA passed on port 18080: `GET /health` returned `ok`, invalid upload returned 422, `.hwp` upload returned queued, and job polling reached the expected LibreOffice-not-installed failure path.

## Remaining gaps

- Actual GCS mode requires Cloud Run service account credentials and a private bucket; this local Windows environment does not contain those production credentials.
- The API still uses an in-memory job store, so a production multi-instance deployment still needs an external job state store.

