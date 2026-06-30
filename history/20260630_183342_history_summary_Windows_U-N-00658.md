# History Summary - 2026-06-30 18:33:42

## User Request
T4: Make member history downloads use authenticated fetch (T2 helper) instead of headerless `<a href>` navigation.

## Changes
- `apps/web/src/components/JobHistoryList.tsx`: Replaced `<a href={job.downloadUrl}>` with `<button onClick={() => onDownload(job)}>`; added `onDownload`, `downloadingJobId`, `downloadError` props; added downloading disabled state and per-job error display with `role="alert"`.
- `apps/web/src/app/history/page.tsx`: Added `handleDownload` using `downloadProtectedFile` (T2 helper) with Firebase user; added `downloadingJobId` and `downloadError` state; passed new props to `JobHistoryList`.
- `apps/web/src/app/history/history-page.test.tsx`: Updated mock token to `"history-id-token"`; added Blob/URL.createObjectURL/anchor-click mocks; added 4 new test cases; updated existing tests for new `download-button-*` test IDs.

## Before
- `JobHistoryList` used `<a href={job.downloadUrl}>` — headerless navigation that bypassed API authorization.
- No downloading/error state for downloads.
- Tests used `download-link-*` test IDs and did not test authenticated download behavior.

## After
- Downloads go through `downloadProtectedFile` (T2 helper) → `fetchWithAuth` with Firebase Bearer token.
- `JobHistoryList` shows "다운로드 중..." while downloading, per-job error text on failure.
- 13 tests pass covering: authenticated download URL+header, expired no-fetch, delete regression (disabled state + row removal), download failure 401/403/500, auth-error 401/403.
- Typecheck and lint clean.
