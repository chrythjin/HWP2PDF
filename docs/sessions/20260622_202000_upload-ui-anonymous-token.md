# Session: Upload UI anonymous token handling and durable conversion UX

**Date:** 2026-06-22
**Task:** Todo 10 of `auth-history-delete-board-final` plan

## Changed files
- `apps/web/src/lib/upload-token.ts` (new) — sessionStorage helpers for anonymous access token persistence keyed by jobId (`hwp2pdf-job-<jobId>`).
- `apps/web/src/components/DropzoneUploader.tsx` (modified) — integrated `useAuth`, `fetchWithAuth`, `ANONYMOUS_ACCESS_TOKEN_HEADER`, token state + sessionStorage persistence, 401/403 error handling with Korean messages, protected download endpoint link (no token in URL).
- `apps/web/src/components/DropzoneUploader.auth.test.tsx` (new) — 11 tests covering idle state rendering, token-not-in-URL, state visibility, and upload-token helper CRUD.

## What changed
- `DropzoneUploader` now imports `useAuth` from `@/auth/useAuth` and `fetchWithAuth`/`buildApiUrl` from `@/lib/api-client`.
- Anonymous upload responses (`accessToken` + `accessTokenHeader` fields) are stored in component state (`accessToken`) and persisted to `sessionStorage` via `saveJobAccessToken`.
- Status polling uses `fetchWithAuth` which adds `Authorization: Bearer` for logged-in users; for anonymous jobs, the `X-Job-Access-Token` header is attached in the fetch options.
- 401 (missing token) and 403 (wrong token) responses produce distinct Korean error messages and transition to `failed` state.
- Download link points to the protected endpoint `/v1/jobs/:jobId/download` — no token in the URL. The browser follows the 302 redirect to the short-lived signed URL.
- `handleReset` clears the sessionStorage token for the current jobId.
- Multipart upload path attaches `Authorization` header for logged-in users via XHR `setRequestHeader`.

## Key decisions
- Token stored in `sessionStorage` (tab-scoped) rather than `localStorage` — appropriate for ephemeral anonymous access.
- Download uses the protected API endpoint, not a pre-baked signed URL in the DOM.
- Kept the existing `uploadSessionRef` naming for the React upload session guard (distinct from server `UploadSession`).

## Verification
- `pnpm --filter web typecheck`: PASS
- `pnpm --filter web test`: 58/58 passed (6 test files)
- `pnpm --filter web test -- src/components/DropzoneUploader.auth.test.tsx`: 11/11 passed

## Not verified
- Full end-to-end upload flow with real file drop and XHR mocking (jsdom limitation).
- Real Firebase auth and real API backend integration (mocked in tests).