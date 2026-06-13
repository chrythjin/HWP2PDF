# Job Expiry and Local Download Gate

Implemented the runtime retention boundary that was still missing after GCS/Firestore production backend work.

## Changes

- Added `JOB_RETENTION_MINUTES` config with a 30-minute default.
- Added `expiresAt` to upload and job status API contracts.
- Job records now store `expiresAt` and transition to `expired` when polled after retention.
- Expired jobs hide `downloadUrl` and return a clear re-upload message.
- Replaced static local `/v1/results` serving with a job-aware download route.
- Local result downloads now return HTTP 410 after job expiry and remove the local result file when present.
- Documented the retention variable and expiry behavior in `docs/operations/api-cloud-run-runtime.md`.

## Verification

- `pnpm --filter @hwp2pdf/shared build` passed.
- `pnpm --filter api build` passed.
- `pnpm -r build` passed.
- `pnpm --filter web lint` passed before the final line-ending normalization pass.
- `lsp_diagnostics` reported no diagnostics for `apps/api/src` and `packages/shared/src/index.ts`.
- Live API surface QA passed with `JOB_RETENTION_MINUTES=0.001` on port 18080:
  - `/health` returned `ok`.
  - Invalid upload returned HTTP 422.
  - `.hwp` upload returned `queued` plus `expiresAt`.
  - Polling after expiry returned `expired`.
  - `/v1/results/{jobId}.pdf` returned HTTP 410 after expiry.

## Notes

Docker is not required for this retention/download-gate implementation. Docker or Cloud Run is still required to verify a successful LibreOffice/H2Orestart conversion path in a runtime that actually contains the converter.
