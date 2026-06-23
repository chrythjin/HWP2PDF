# Task 5 — Upload initiate/complete/status ownership API

## Date
2026-06-22

## Summary
Implemented Todo 5 of `auth-history-delete-board-final`: updated `POST /v1/uploads/initiate`, `POST /v1/uploads/complete`, `POST /v1/upload`, and `GET /v1/jobs/:jobId` in `apps/api/src/routes/v1.ts` to enforce upload ownership via `optionalAuth`, server `UploadSession`, owner binding, anonymous token issuance, `X-Job-Access-Token` verification, and `API_ROUTES` constants.

## Files modified
- `apps/api/src/routes/v1.ts` — updated all four routes with ownership enforcement
- `apps/api/src/routes/v1.download-auth.test.ts` — updated status tests to expect 401/403 for owner-aware jobs (was 200 with omitted downloadUrl)
- `apps/api/src/routes/v1.upload-ownership.test.ts` — new test file with 24 tests

## Changes

### POST /v1/uploads/initiate
- Added `optionalAuth` middleware.
- Authenticated users: creates `UploadSession` with `ownerType: "user"`, `userId: req.user.uid`.
- Anonymous users: generates access token via `generateAnonymousAccessTokenWithHash()`, stores hash in `UploadSession`, returns plaintext token once in response (`accessToken` + `accessTokenHeader` fields).
- Validates fileName/fileSize via shared `validateFile`.

### POST /v1/uploads/complete
- Added `optionalAuth` middleware.
- Looks up `UploadSession` by `jobId` — returns 404 if not found.
- Returns 409 if session already completed.
- Verifies `objectPath` matches session exactly (not just by prefix) — returns 403 on mismatch.
- Verifies `fileName`/`fileSize` match session — returns 403 on mismatch.
- For anonymous sessions: requires `X-Job-Access-Token` header (401 if missing, 403 if wrong).
- For user sessions: requires `req.user.uid === session.userId` (403 if mismatch).
- Creates job with owner fields from session.
- Marks session as completed via `completeUploadSession()`.

### POST /v1/upload (multipart fallback)
- Added `optionalAuth` middleware.
- Same ownership binding: authenticated → `ownerType: "user"` + `userId`; anonymous → `ownerType: "anonymous"` + `accessTokenHash` + plaintext token returned once.
- Returns `accessToken` and `accessTokenHeader` in response for anonymous users.

### GET /v1/jobs/:jobId (status)
- Already had `optionalAuth`.
- Owner-aware jobs (with `ownerType`): enforces access control — 401 if no credential, 403 if wrong credential. Returns 200 with `downloadUrl` only when owner verified.
- Legacy jobs (no `ownerType`): returns 200 with `downloadUrl` omitted (backwards compatible).

### Other
- Updated results route to use `API_ROUTES.RESULTS` constant instead of hardcoded path.
- Removed prefix-based `objectPath` validation (replaced by exact match against session).

## Verification

### Commands run
```
pnpm --filter api typecheck
pnpm --filter api test
pnpm --filter @hwp2pdf/shared test
```

### Results
- `pnpm --filter api typecheck`: PASS (no errors)
- `pnpm --filter api test`: 178/178 tests pass across 9 test files
- `pnpm --filter @hwp2pdf/shared test`: 41/41 tests pass

### Test coverage (v1.upload-ownership.test.ts — 24 tests)
- Anonymous initiate returns 201 with jobId + accessToken
- Anonymous initiate creates UploadSession with hashed token
- Authenticated initiate returns 201 without accessToken
- Authenticated initiate creates UploadSession with userId
- Invalid file extension rejected (422)
- File exceeding size limit rejected (422)
- Anonymous complete with correct token returns 202
- Anonymous complete without token returns 401
- Anonymous complete with wrong token returns 403
- Wrong user complete returns 403
- Session not found returns 404
- objectPath mismatch returns 403
- fileName mismatch returns 403
- Anonymous status without token returns 401
- Anonymous status with wrong token returns 403
- Anonymous status with correct token returns 200 with downloadUrl
- Member status without auth returns 401
- Member status with wrong user returns 403
- Member status with correct user returns 200 with downloadUrl
- Legacy job status returns 200 without downloadUrl
- Multipart anonymous upload returns 202 with accessToken
- Multipart authenticated upload returns 202 without accessToken
- Multipart invalid file rejected (422)
- Full anonymous flow: initiate → complete → status works end-to-end

### Updated tests (v1.download-auth.test.ts — 17 tests, all pass)
- Anonymous status without token: now expects 401 (was 200)
- Anonymous status with wrong token: now expects 403 (was 200)
- Member status without auth: now expects 401 (was 200)
- Member status with wrong user: now expects 403 (was 200)
- Stored downloadUrl not leaked: now expects 401/403 (was 200 with undefined)

## HTTP boundary policy (documented)
- Missing credential on owner-aware job: **401** (`unauthorized`)
- Wrong credential on owner-aware job: **403** (`forbidden`)
- Session not found: **404** (`upload_session_not_found`)
- Session already completed: **409** (`upload_session_already_completed`)
- objectPath/fileName/fileSize mismatch: **403** (`upload_session_*_mismatch`)
- Legacy jobs (no ownerType): 200 with downloadUrl omitted (backwards compatible)

## Notes
- `convertJobToPdf` is still called inline (Todo 6 will replace with Cloud Tasks enqueue).
- GCS object existence/size sanity checks are best-effort and not implemented in this task (mocked in tests; real GCS calls would need integration test environment).
- No changes to shared package, job-store, or storage-service core logic.