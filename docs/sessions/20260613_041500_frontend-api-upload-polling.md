# 2026-06-13 Frontend API upload and polling integration

## Summary

Connected the active web uploader (`apps/web/src/components/DropzoneUploader.tsx`) to the Express API instead of the previous mock conversion timer.

## Changes

- Uploads selected `.hwp` files to `POST /v1/upload` using `NEXT_PUBLIC_API_BASE_URL` when configured, falling back to `http://localhost:8080`.
- Polls `GET /v1/jobs/:jobId` using shared `POLLING_INTERVAL` and `MAX_POLLING_TIME`.
- Maps API statuses (`queued`, `processing`, `completed`, `failed`, `expired`) into the existing UI states without changing the landing page layout.
- Shows the API job ID during queued/processing states and uses the returned `downloadUrl` for completed conversions.
- Preserves the current local development failure path: when LibreOffice is not installed, the API returns a clear failed job message and the frontend displays it.
- Removed existing lint warnings from the unused duplicate uploader component under `apps/web/src/components/upload/DropzoneUploader.tsx`.

## Verification

- `pnpm --filter web build` passed.
- `pnpm --filter web lint` passed after cleaning the duplicate component warnings.
- Full workspace build and browser/API surface QA were run after this change in the same session.

## Notes

- Local dev still needs `NEXT_PUBLIC_API_BASE_URL=http://localhost:18080` when the API is run on port 18080 because port 8080 is occupied on this workstation.
- Successful PDF generation still depends on a runtime with LibreOffice available; this Windows environment verifies the upload/polling/failure surface rather than successful conversion output.
