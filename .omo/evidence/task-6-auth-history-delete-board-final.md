# Todo 6 Evidence — Cloud Tasks HTTP worker and conversion dispatcher

## Summary

- Implemented Cloud Tasks dispatcher service with mock queue, idempotent mock enqueue, dynamic production client factory, queue config validation, and internal worker URL/audience helpers.
- Replaced upload-route fire-and-forget inline conversion dispatch with `enqueueConversionJob`.
- Added authenticated internal worker endpoint at `POST /internal/workers/convert`.
- Worker endpoint verifies OIDC bearer tokens, no-ops non-queued jobs, handles queued jobs through the conversion service, records terminal unexpected failures, and documents stuck-job recovery policy.
- Added focused dispatcher and worker endpoint tests.

## Verification

- `pnpm --filter api test` — passed: 12 test files, 259 tests.
- `pnpm --filter api typecheck` — passed.
- `pnpm --filter api build` — passed.
- Focused Todo 6 tests — passed: 2 test files, 35 tests.

## Focused test output

```text
> api@0.1.0 test C:\NEW PRG\HWP2PDF\apps\api
> vitest run "src/services/cloud-tasks-dispatcher.test.ts" "src/routes/v1.worker.test.ts"

RUN v4.1.8 C:/NEW PRG/HWP2PDF/apps/api

✓ src/services/cloud-tasks-dispatcher.test.ts (19 tests) 19ms
✓ src/routes/v1.worker.test.ts (16 tests) 140ms

Test Files  2 passed (2)
Tests       35 passed (35)
Duration    1.59s
```
