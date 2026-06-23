# Task 11 — Web history and member delete UI

## Summary

Implemented the member conversion history page at `apps/web/src/app/history/page.tsx` with auth gating, job listing from `/v1/me/jobs`, download expiry distinction, delete with confirmation, and 401/403 graceful handling. Includes a reusable `JobHistoryList` component and TDD test suite.

## Files created

- `apps/web/src/app/history/page.tsx` — client component, auth-gated history page
- `apps/web/src/app/history/history-page.test.tsx` — 7 tests covering all acceptance criteria
- `apps/web/src/components/JobHistoryList.tsx` — reusable list component with download/delete UI

## Implementation details

- **Auth gating**: Uses `useAuth()` from `AuthProvider`. If `loading`, shows loading state. If no `user`, shows login prompt with link to `/login` (`data-testid="history-login-prompt"`).
- **Job fetch**: `fetchWithAuth(API_ROUTES.ME_JOBS, user, { method: "GET" })` on mount and when `user` changes. Uses shared `API_ROUTES.ME_JOBS` constant.
- **Download expiry**: `JobHistoryList` checks `downloadExpiresAt` against `Date.now()`. If expired or status !== `completed`, shows "다운로드 만료됨" label (`data-testid="download-expired-label"`). Otherwise shows download link.
- **Delete with confirmation**: `window.confirm()` dialog before calling `DELETE /v1/me/jobs/:jobId` via `fetchWithAuth`. On success, removes the row from local state (`setJobs(prev => prev.filter(...))`).
- **401/403 handling**: If API returns 401 or 403, sets `authError` state which shows "인증이 만료되었습니다" message with login link (`data-testid="history-auth-error"`).
- **Styling**: Matches existing `PageLayout` aesthetic — glassmorphism cards, blue/indigo gradients, zinc dark mode, rounded-2xl/3xl borders.

## Test coverage (7/7 passing)

1. **Unauthenticated → login prompt**: Shows `history-login-prompt` with login link.
2. **Authenticated → renders jobs**: Mocked `/v1/me/jobs` returns job-1, verifies jobId appears.
3. **Expired download label**: Job with `downloadExpiresAt` in the past shows `download-expired-label`.
4. **Delete confirmation calls API with Authorization**: Clicks delete, `window.confirm` returns true, verifies DELETE fetch call includes `Authorization: Bearer mock-id-token`.
5. **Deleted row disappears**: Two jobs rendered, delete job-1, verifies job-1 is removed and job-2 remains.
6. **401 handling**: API returns 401, verifies `history-auth-error` appears.
7. **403 handling**: API returns 403, verifies `history-auth-error` appears.

## Verification commands

```
pnpm --filter web test -- src/app/history/history-page.test.tsx
```

Result: 7 passed, 0 failed (215ms)

```
pnpm --filter web typecheck
```

Result: No errors in history/page.tsx, JobHistoryList.tsx, or history-page.test.tsx. One pre-existing error in `src/app/board/board-page.test.tsx` (Todo 12 file, not this task).

## Pre-existing issues (not introduced by this task)

- `board-page.test.tsx` has 17 test failures and 1 typecheck error (`auth` property on `IdTokenResult`). These are from Todo 12 and not related to this task's changes.
- `AuthProvider.test.tsx` may have a pre-existing mock issue mentioned in the plan.

## Not verified

- Full `pnpm --filter web test` does not pass due to pre-existing `board-page.test.tsx` failures (not this task's responsibility).
- `pnpm -r build` not run (not required by task scope).