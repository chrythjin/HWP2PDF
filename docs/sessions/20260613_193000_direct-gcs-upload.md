# Direct GCS Upload and User Setup Checklist

Date: 2026-06-13

## Summary

Added the production direct-upload path for browser-to-GCS uploads and saved a plain-language checklist for the external setup tasks the user must perform.

## Changes

- Added `docs/USER_SETUP_CHECKLIST.md` with only user-owned tasks: GCP project, service accounts, GitHub secrets/vars, Vercel setup, Docker or remote deployment verification, and operating policy decisions.
- Extended shared API contracts with direct upload request/response types and routes:
  - `POST /v1/uploads/initiate`
  - `POST /v1/uploads/complete`
- Added API support for signed GCS original upload initiation and completion.
- Added GCS original materialization before conversion so the existing LibreOffice pipeline can process files uploaded directly to GCS.
- Updated the web uploader to try direct signed upload first and automatically fall back to multipart `POST /v1/upload` in local/dev mode.
- Replaced stale duplicate uploader code with a canonical re-export.
- Added `scripts/smoke-api.mjs` and wired the Cloud Run workflow smoke test to check health, invalid multipart upload handling, and direct upload URL initiation.
- Added GCS bucket CORS config and apply script for browser `PUT` uploads to signed URLs.
- Updated runtime documentation for direct upload, CORS, fallback behavior, and smoke testing.

## Verification

- `lsp_diagnostics apps/api/src`: 0 diagnostics.
- `lsp_diagnostics apps/web/src`: 0 diagnostics.
- `lsp_diagnostics packages/shared/src`: 0 diagnostics.
- `pnpm -r build`: passed.
- `pnpm --filter web lint`: passed.
- `git diff --check`: passed.
- Local API HTTP surface QA on port 18080 passed:
  - `GET /health` returned ok.
  - `POST /v1/uploads/initiate` returned 409 in local storage mode, confirming direct-upload fallback behavior.
  - Multipart `POST /v1/upload` with a `.hwp` fixture returned 202.

## Not verified locally

- Actual signed URL creation against GCS requires a real bucket and Google credentials.
- Actual browser-to-GCS `PUT` requires bucket CORS configured with the final Vercel origin.
- Successful HWP-to-PDF conversion still requires the Docker/Cloud Run LibreOffice + H2Orestart runtime.
