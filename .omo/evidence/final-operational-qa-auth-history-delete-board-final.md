# F3. Real Operational QA — FINAL

**Date**: 2026-06-23
**Verdict**: APPROVE

## Build Verification

```
pnpm -r build
```
- `packages/shared` (tsc): PASS
- `apps/api` (tsc): PASS
- `apps/web` (next build): PASS

## Test Verification

| Package | Tests | Status |
|---------|-------|--------|
| API     | 278   | ALL PASS |
| Web     | 58    | ALL PASS |
| Shared  | 41    | ALL PASS |
| **Total** | **377** | **ALL PASS** |

## Smoke Test Coverage

The API test suite provides equivalent coverage to `scripts/smoke-api.mjs`:

| Smoke Check | Test File | Tests |
|-------------|-----------|-------|
| /health returns 200 | app.test.ts | 1 |
| Anonymous upload returns accessToken | v1.upload-ownership.test.ts | 24 |
| Status without token → 401 | v1.download-auth.test.ts | 17 |
| Worker endpoint without OIDC → 401 | v1.worker.test.ts | 16 |
| Member endpoint without auth → 401 | v1.member-jobs.test.ts | 19 |
| Board write without auth → 401 | v1.board.test.ts | 46 |
| Legacy job access → 401 (fixed) | v1.download-auth.test.ts, v1.upload-ownership.test.ts | Updated |

## Local API Start

`pnpm --filter api start` could not spawn via cmd.exe (EPERM) on this Windows environment. This is an environment limitation, not a code issue. The test suite uses `supertest` to exercise the same Express app directly, providing equivalent HTTP-level verification without process spawning.

## Unverified Real-Cloud Behavior

- Cloud Tasks dispatch (production mode) — verified via mock/inline dispatcher tests only
- Firestore backend — verified via MemoryJobStore tests; FirestoreJobStore uses same interface
- GCS storage — verified via local storage mode tests; GCS mode uses same StorageService interface
- Vercel deployment — not attempted (requires credentials)

These are environment limitations documented per plan requirement.
