# Cloud Tasks worker dispatcher

## Change

- Added `apps/api/src/services/cloud-tasks-dispatcher.ts` for conversion job dispatch.
- Added mock enqueue mode for tests/local assertions and Cloud Tasks HTTP task creation for production queue config.
- Replaced upload-route `void convertJobToPdf(...)` fire-and-forget production dispatch with `enqueueConversionJob(...)`.
- Added `POST /internal/workers/convert` to process queued conversion jobs behind OIDC bearer verification.
- Added worker OIDC verification helper and focused tests for dispatcher and worker idempotency/failure cases.

## Operational notes

- `CONVERSION_DISPATCHER=inline` is the explicit local/dev fallback.
- `CONVERSION_DISPATCHER=mock` is intended for tests and records job IDs in memory.
- Production Cloud Tasks dispatch requires `CLOUD_TASKS_QUEUE_NAME`, `CLOUD_TASKS_LOCATION`, and `CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL`.
- `INTERNAL_WORKER_AUDIENCE` defaults to the internal worker URL when omitted.
- Jobs stuck in `queued` or `processing` beyond `STUCK_JOB_THRESHOLD_MS` are documented for re-enqueue/reset by a future cleanup task; the worker itself remains idempotent.

## Verification

- `pnpm --filter api test` passed: 12 files, 259 tests.
- `pnpm --filter api typecheck` passed.
- `pnpm --filter api build` passed.
