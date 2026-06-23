# Task 7 Evidence: Member History and Deletion API

**Date:** 2026-06-22
**Plan:** `.omo/plans/auth-history-delete-board-final.md` Todo 7
**Status:** Complete

## Summary

Implemented three member-only endpoints for job history and deletion:
- `GET /v1/me/jobs` — list caller's non-deleted jobs, sorted by createdAt desc
- `GET /v1/me/jobs/:jobId` — single job detail (404 if not owned, 410 if deleted)
- `DELETE /v1/me/jobs/:jobId` — idempotent soft-delete with file cleanup

## Files Modified

1. **`apps/api/src/routes/v1.ts`** — Added imports for `requireAuth`, `getJobForUser`, `listJobsByUser`, `markJobDeleted`, `deleteStoredJobFiles`, `UploadStatus`. Added `toMemberJobResponse` helper. Added three route handlers before the board router mount.

2. **`apps/api/src/routes/v1.member-jobs.test.ts`** — New file. 19 tests covering all boundary conditions.

## Implementation Details

### GET /v1/me/jobs
- Uses `requireAuth` middleware (401 without/invalid token).
- Calls `listJobsByUser(req.user.uid, { includeDeleted: false })`.
- Maps each `JobRecord` to `JobStatusResponse` via `toMemberJobResponse`.
- `toMemberJobResponse` includes `downloadUrl` only when:
  - `status === "completed"`
  - A result file/object path exists
  - The download deadline (`downloadExpiresAt` or `expiresAt`) has not passed
- Returns sorted array (listJobsByUser sorts by createdAt desc).

### GET /v1/me/jobs/:jobId
- Uses `requireAuth`.
- Calls `getJobForUser(jobId, req.user.uid)` — returns null for not-found, other-user, or deleted.
- Distinguishes deleted tombstone (410) from not-found (404) by checking raw `getJob`.
- Returns 200 with sanitized response for own non-deleted job.

### DELETE /v1/me/jobs/:jobId
- Uses `requireAuth`.
- Calls `getJobForUser` — 404 if not found/not owned.
- Returns 409 if `status === "processing"`.
- Calls `storageService.deleteStoredJobFiles(job)` — best-effort file deletion.
- Calls `jobStore.markJobDeleted(jobId, req.user.uid)` — sets tombstone, strips paths.
- Returns 200 on success.
- Idempotent: if job is already deleted (tombstone), returns 200 with noop flag.

## Test Coverage (19 tests)

- GET /v1/me/jobs auth required (2 tests: no token, invalid token)
- GET /v1/me/jobs list own jobs (4 tests: filtered+sorted, empty, expired download omits URL, valid download includes URL)
- GET /v1/me/jobs/:jobId auth required (1 test)
- GET /v1/me/jobs/:jobId not found/other user (2 tests: non-existent, other user 404)
- GET /v1/me/jobs/:jobId deleted tombstone (1 test: 410)
- GET /v1/me/jobs/:jobId own job (2 tests: 200 sanitized, expired download omits URL)
- DELETE /v1/me/jobs/:jobId auth required (1 test)
- DELETE /v1/me/jobs/:jobId not found/other user (2 tests: non-existent, other user 404)
- DELETE /v1/me/jobs/:jobId processing conflict (1 test: 409)
- DELETE /v1/me/jobs/:jobId success and idempotency (3 tests: strips paths, idempotent repeat, hidden from list)

## Verification

```
pnpm --filter api test
```

Result: **278 tests passed** across 13 test files (0 failures).

```
pnpm --filter api build
```

Result: TypeScript compilation succeeded with no errors.

## Key Decisions

- **Tombstone 410 vs 404:** `getJobForUser` returns null for deleted jobs (tombstones are hidden from owner-aware lookups). The route does a secondary `getJob` check to distinguish deleted (410) from truly not-found (404).
- **Idempotent delete:** Repeat delete on a tombstone returns 200 with `{ ok: true, noop: true }` — the route checks `getJob` for the deleted status and returns success without re-processing.
- **Processing 409:** Jobs in `processing` status cannot be deleted (no cancellation mechanism in MVP). Returns 409 with a clear Korean message.
- **Test isolation:** Mocked `job-store.js` with a fresh `MemoryJobStore` per test to prevent state leakage between test cases (the real singleton persists across tests).