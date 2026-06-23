# Task 4: Storage deletion and protected download boundary

**Date:** 2026-06-22
**Plan:** `.omo/plans/auth-history-delete-board-final.md` Todo 4
**Status:** PASS

## Summary

Implemented idempotent local/GCS delete helpers and a protected download boundary that prevents anonymous/member status responses from exposing reusable `downloadUrl` before access verification.

## Changes

### Files modified

1. **`packages/shared/src/index.ts`** — Added `JOB_DOWNLOAD: "/v1/jobs/:jobId/download"` to `API_ROUTES`.
2. **`apps/api/src/services/storage-service.ts`** — Added:
   - `deleteStoredJobFiles(job: JobRecord): Promise<void>` — idempotent best-effort deletion of GCS original, GCS result, local upload, local result. Errors logged with `[REDACTED_PATH]` replacement; no object paths leaked.
   - `getProtectedDownloadUrl(job: JobRecord): Promise<string | undefined>` — mints a fresh short-lived signed URL (GCS mode, `PROTECTED_DOWNLOAD_URL_TTL_MS` default 2 min) or returns the proxy download route URL (local mode).
   - `createOwnerVerifier(input)` — returns a verifier function that checks anonymous token hash (constant-time) or user ID equality.
   - `getStatusResponse(job, verifier?, credentials?)` — builds `JobStatusResponse` with `downloadUrl` included only when the verifier authorizes the caller.
   - `extractAnonymousTokenFromHeaders(headers)` — extracts `X-Job-Access-Token` header value.
   - `PROTECTED_DOWNLOAD_URL_TTL_MS` — short TTL constant (default 2 minutes, max 5 minutes).
3. **`apps/api/src/routes/v1.ts`** — Updated:
   - `GET /v1/jobs/:jobId` now uses `optionalAuth` middleware + `getStatusResponse` with owner verifier. `downloadUrl` is omitted when unauthorized.
   - Added `GET /v1/jobs/:jobId/download` — proxy download endpoint that verifies owner first (anonymous token or Firebase user), then streams the file (local mode) or redirects to a fresh signed URL (GCS mode).
   - `GET /v1/results/:fileName` — preserved for backwards compatibility; new owner-aware jobs now require owner verification, legacy jobs (no owner fields) remain accessible.

### Files created

4. **`apps/api/src/services/storage-service.delete.test.ts`** — 23 tests covering:
   - `deleteStoredJobFiles` deletes local files, is idempotent, handles missing paths, handles undefined object paths, does not leak file paths in error logs.
   - `createOwnerVerifier` — anonymous token match/mismatch/no-token/no-hash, user match/mismatch/no-user/no-userId.
   - `getStatusResponse` — omits `downloadUrl` when no verifier, when verifier rejects (wrong token, no token, wrong user); includes metadata fields even when unauthorized.
   - `getProtectedDownloadUrl` — returns undefined for non-completed jobs, for jobs with no result paths; returns download endpoint URL in local mode.
   - `PROTECTED_DOWNLOAD_URL_TTL_MS` — within valid range.

5. **`apps/api/src/routes/v1.download-auth.test.ts`** — 17 tests covering:
   - Anonymous job status: no token → 200 no downloadUrl; wrong token → 200 no downloadUrl; correct token → 200 with downloadUrl.
   - Member job status: no auth → 200 no downloadUrl; wrong user → 200 no downloadUrl; correct user → 200 with downloadUrl.
   - Download endpoint anonymous: no token → 401; wrong token → 403; correct token → 200 file stream.
   - Download endpoint member: no auth → 401; wrong user → 403; correct user → 200 file stream.
   - Download endpoint edge cases: non-existent job → 404; processing job → 409.
   - Legacy job (no owner fields): status omits downloadUrl; download requires credential.
   - Stored downloadUrl never exposed in status response.

## Design decisions

### Protected download strategy: Fresh signed URL after verification (Option B)

Chose **Option B** from the task spec: `getProtectedDownloadUrl` mints a fresh short-lived signed URL only after owner verification passes. The status response (`GET /v1/jobs/:jobId`) uses `optionalAuth` + `createOwnerVerifier` to conditionally include `downloadUrl`. A dedicated `GET /v1/jobs/:jobId/download` endpoint provides an API proxy alternative that verifies ownership before streaming the file (local mode) or redirecting to a fresh signed URL (GCS mode).

The `PROTECTED_DOWNLOAD_URL_TTL_MS` defaults to 2 minutes (configurable via env, max 5 min per plan), separate from the legacy `SIGNED_DOWNLOAD_URL_TTL_MINUTES` (15 min default) used for the old unconditional publish path.

### Owner verifier design

`createOwnerVerifier` is a factory that captures job ownership metadata at creation time and returns a function that checks request-side credentials. For anonymous jobs, it uses `verifyAccessTokenHash` (constant-time SHA-256 comparison). For member jobs, it compares `uid` equality. The verifier never logs tokens or paths — reason codes are generic enums.

### Legacy job compatibility

Jobs created before Todo 3 adds owner fields have no `ownerType`/`userId`/`accessTokenHash`. The route code uses `buildOwnerVerifier` which returns `undefined` for legacy jobs. When the verifier is `undefined`, `getStatusResponse` omits `downloadUrl` (the core boundary guard). The download endpoint requires at least some credential for legacy jobs as a transitional guard.

## Verification

### Commands run

```
pnpm --filter api test
pnpm --filter api typecheck
pnpm --filter @hwp2pdf/shared test
pnpm -r build
```

### Results

- `pnpm --filter api test`: **154/154 passed** (8 test files, 0 failures)
  - `storage-service.delete.test.ts`: 23/23 passed
  - `v1.download-auth.test.ts`: 17/17 passed
  - All pre-existing tests still pass (token, auth, job-store, firebase-admin, app)
- `pnpm --filter api typecheck`: **PASS** (no errors)
- `pnpm --filter @hwp2pdf/shared test`: **41/41 passed**
- `pnpm -r build`: **PASS** (shared, api, web all build successfully)

### HTTP boundary checks verified

| Scenario | Expected | Actual |
|---|---|---|
| Anonymous status, no token | 200, no downloadUrl | ✅ 200, downloadUrl undefined |
| Anonymous status, wrong token | 200, no downloadUrl | ✅ 200, downloadUrl undefined |
| Anonymous status, correct token | 200, with downloadUrl | ✅ 200, downloadUrl present |
| Member status, no auth | 200, no downloadUrl | ✅ 200, downloadUrl undefined |
| Member status, wrong user | 200, no downloadUrl | ✅ 200, downloadUrl undefined |
| Member status, correct user | 200, with downloadUrl | ✅ 200, downloadUrl present |
| Anonymous download, no token | 401 | ✅ 401 |
| Anonymous download, wrong token | 403 | ✅ 403 |
| Anonymous download, correct token | 200 file stream | ✅ 200, attachment |
| Member download, no auth | 401 | ✅ 401 |
| Member download, wrong user | 403 | ✅ 403 |
| Member download, correct user | 200 file stream | ✅ 200, attachment |
| Non-existent job download | 404 | ✅ 404 |
| Processing job download | 409 | ✅ 409 |
| Legacy job status | 200, no downloadUrl | ✅ 200, downloadUrl undefined |
| Legacy job download, no credential | 401 | ✅ 401 |
| Stored downloadUrl not exposed | undefined | ✅ undefined |

### Delete helper idempotency verified

- `deleteStoredJobFiles` called twice on same job: no throw ✅
- Missing files: no throw ✅
- Undefined paths: no throw ✅
- Error logs redact file paths: ✅ (paths replaced with `[REDACTED_PATH]`)

## Not verified

- GCS mode signed URL minting: tests run in local mode (no `STORAGE_BACKEND=gcs` env). The `getProtectedDownloadUrl` GCS path is exercised via code paths but not via integration test with a real/mock GCS bucket. This should be verified in Todo 5 or deployment smoke tests.
- Firebase Admin real token verification: tests use mock verifier via `setTokenVerifierForTesting`. Real Firebase credential verification is deferred to deployment/integration testing.

## Residual risks

- **Todo 3 dependency:** The owner fields (`ownerType`, `userId`, `accessTokenHash`) are not yet on `JobRecord` — they're accessed via type cast (`as JobRecord & JobOwnerFields`). Once Todo 3 adds them to the interface, the cast can be removed. The current code works correctly for both legacy and owner-aware jobs.
- **Legacy `/v1/results/:fileName` route:** New owner-aware jobs are guarded, but legacy jobs remain accessible without credentials for backwards compatibility. This is intentional per the task spec but should be revisited once all jobs are owner-aware.
- **`PROTECTED_DOWNLOAD_URL_TTL_MS` env:** Not yet documented in deployment docs (Todo 13).