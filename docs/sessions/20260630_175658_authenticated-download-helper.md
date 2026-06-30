# 2026-06-30 authenticated download helper

## Request

Implement Task 2 from `.omo/plans/hwp2pdf-review-fixes.md`: establish a focused authenticated browser-download helper contract for web protected PDF downloads.

## Changes

- Added `apps/web/src/lib/download-file.ts` with `downloadProtectedFile`.
- Added `apps/web/src/lib/download-file.test.ts` covering bearer auth, anonymous shared header auth, token-not-in-URL behavior, safe non-OK errors, and Blob/Object URL cleanup.
- Added `.omo/evidence/task-2-hwp2pdf-review-fixes.md` and appended notepad learnings at `.omo/notepads/hwp2pdf-review-fixes/learnings.md`.

## Verification

- `pnpm --filter web test -- download` -> exit 0, 7 tests passed.
- `pnpm --filter web typecheck` -> exit 0, no TypeScript output.
- Serena diagnostics for `apps/web/src/lib/download-file.ts` -> `{}`.
- Serena diagnostics for `apps/web/src/lib/download-file.test.ts` -> `{}`.

## Notes

- This task intentionally does not wire the helper into DropzoneUploader or history page; those are downstream T3/T4 tasks.
