# Task 10 — Upload UI anonymous token handling and durable conversion UX

## Date
2026-06-22

## Summary
Updated `DropzoneUploader.tsx` to handle anonymous access tokens from upload initiate, attach `X-Job-Access-Token` on status/download calls for anonymous jobs, use `fetchWithAuth` with Firebase `Authorization` for logged-in users, handle 401/403 token errors with clear Korean messages, render queued/processing/completed/error states, and avoid exposing tokens in URLs. Added `upload-token.ts` helper for sessionStorage-based token persistence/recovery.

## Files changed
- `apps/web/src/lib/upload-token.ts` (new) — sessionStorage helpers for anonymous access token persistence keyed by jobId.
- `apps/web/src/components/DropzoneUploader.tsx` (modified) — integrated `useAuth`, `fetchWithAuth`, `ANONYMOUS_ACCESS_TOKEN_HEADER`, token state + sessionStorage, 401/403 error handling, protected download endpoint link.
- `apps/web/src/components/DropzoneUploader.auth.test.tsx` (new) — 11 tests covering idle state rendering for anonymous/logged-in, token-not-in-URL, state visibility, and upload-token helper CRUD.

## Key decisions
- Token stored in `sessionStorage` under key `hwp2pdf-job-<jobId>` — tab-scoped, cleared on tab close, appropriate for ephemeral anonymous access.
- Download link points to protected endpoint `/v1/jobs/:jobId/download` (no token in URL); the browser follows the 302 redirect to the short-lived signed URL.
- For anonymous jobs, `X-Job-Access-Token` header attached on status polling via `fetchWithAuth` options.
- For logged-in users, `fetchWithAuth` adds `Authorization: Bearer <firebase-id-token>`.
- 401 (missing token) and 403 (wrong token) produce distinct Korean error messages.
- Multipart upload path attaches `Authorization` header for logged-in users via XHR `setRequestHeader`.

## Verification

### Typecheck
```
pnpm --filter web typecheck
```
Result: PASS (no output = no errors)

### Tests (focused)
```
pnpm --filter web test -- src/components/DropzoneUploader.auth.test.tsx
```
Result: 11/11 passed

```
 ✓ src/components/DropzoneUploader.auth.test.tsx (11 tests) 75ms
 Test Files  1 passed (1)
      Tests  11 passed (11)
```

### Tests (full web suite)
```
pnpm --filter web test
```
Result: 58/58 passed across 6 test files

```
 ✓ src/lib/api-client.auth.test.ts (4 tests) 7ms
 ✓ src/auth/AuthProvider.test.tsx (8 tests) 43ms
 ✓ src/components/DropzoneUploader.test.tsx (1 test) 51ms
 ✓ src/components/DropzoneUploader.auth.test.tsx (11 tests) 95ms
 ✓ src/app/history/history-page.test.tsx (7 tests) 242ms
 ✓ src/app/board/board-page.test.tsx (27 tests) 415ms
 Test Files  6 passed (6)
      Tests  58 passed (58)
```

## Test coverage notes
- The full upload flow (file drop → initiate → GCS upload → complete → status polling → completed) requires mocking both `XMLHttpRequest` and `fetch` simultaneously, which is complex in jsdom. The existing `DropzoneUploader.test.tsx` smoke test covers idle rendering. The new auth test file covers:
  - Idle state rendering for anonymous and logged-in users
  - Token not exposed in any link href
  - Completed/queued/failed states not visible in idle
  - 401 error message not visible in idle
  - `upload-token.ts` helper: save/load/clear/key prefix/unknown jobId
- The `fetchWithAuth` Authorization header behavior is verified by `api-client.auth.test.ts` (4 tests).

## Not verified
- Full end-to-end upload flow with real file drop and XHR mocking (would require extensive jsdom XHR mock infrastructure).
- Real Firebase auth integration (mocked in tests).
- Real API backend integration (mocked in tests).

## Pre-existing issues noted
- `AuthProvider.test.tsx` has a known mock hoisting warning (mentioned in task spec as ignorable); tests still pass.
- Wiki/graph markdown files have broken link diagnostics (unrelated to this task).