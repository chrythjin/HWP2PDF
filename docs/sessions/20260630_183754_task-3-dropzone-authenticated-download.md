# Task 3: DropzoneUploader authenticated downloads

**Date:** 2026-06-30 18:37
**Task:** T3 — Make DropzoneUploader completed downloads use authenticated fetch

## User Request

Replace the headerless `<a href={downloadHref} download>` in `DropzoneUploader` with an authenticated download button that uses the T2 `downloadProtectedFile` helper, add tests, and verify.

## Changes

### `apps/web/src/components/DropzoneUploader.tsx`

- Added imports: `downloadProtectedFile` from `@/lib/download-file`, `loadJobAccessToken` from `@/lib/upload-token`.
- Added state: `isDownloading`, `downloadErrorMessage`.
- Added `handleDownload` callback: loads anonymous token from sessionStorage (or uses Firebase user), calls `downloadProtectedFile` with the protected download route, shows safe error on failure, does NOT clear token on failure.
- Removed `downloadHref` variable and the `<a href={downloadHref} download>` anchor.
- Replaced with `<button type="button" onClick={handleDownload} disabled={isDownloading}>` showing "PDF 다운로드" / "다운로드 중...".
- Added `role="alert"` error paragraph for `downloadErrorMessage`.
- `handleReset` now also clears `isDownloading` and `downloadErrorMessage`.

### `apps/web/src/components/DropzoneUploader.download.test.tsx` (new)

6 tests covering anonymous download, logged-in download, DOM token-leak, 401 failure, 403 failure, and missing-token paths.

## Before

Completed state rendered `<a href="http://localhost:8080/v1/jobs/<jobId>/download" download>PDF 다운로드</a>` — a headerless browser navigation that could not attach `Authorization` or `X-Job-Access-Token` headers.

## After

Completed state renders `<button onClick={handleDownload}>PDF 다운로드</button>` which calls `downloadProtectedFile({ url, user, anonymousJobToken, filename })` — fetch-based with proper auth headers, Blob/Object-URL download, and safe error handling.

## Verification

- `pnpm --filter web test -- DropzoneUploader`: 18/18 passed
- `pnpm --filter web typecheck`: exit 0
- `pnpm --filter web lint`: exit 0, 0 warnings