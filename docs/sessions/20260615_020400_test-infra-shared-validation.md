# Test Infrastructure and Shared Validation Refactor

Date: 2026-06-15

## Summary

- Added Vitest test infrastructure for `apps/api`, `apps/web`, and `packages/shared`.
- Added baseline smoke tests for the API app factory, web uploader render path, and shared validation exports.
- Added shared validation characterization tests before refactoring.
- Refactored shared validation so extension and size validation are separately testable without dummy file objects.

## Changed Files

- `apps/api/package.json`
- `apps/api/vitest.config.ts`
- `apps/api/src/app.test.ts`
- `apps/web/package.json`
- `apps/web/vitest.config.mts`
- `apps/web/vitest.setup.ts`
- `apps/web/src/components/DropzoneUploader.test.tsx`
- `packages/shared/package.json`
- `packages/shared/vitest.config.ts`
- `packages/shared/src/index.ts`
- `packages/shared/src/validation.ts`
- `packages/shared/src/index.test.ts`
- `packages/shared/src/validation.test.ts`
- `pnpm-lock.yaml`

## Verification

- `pnpm --filter @hwp2pdf/shared test` passed.
- `pnpm --filter api test` passed.
- `pnpm --filter web test` passed.
- `pnpm -r test` passed.
- `pnpm -r typecheck` passed.
- `pnpm -r build` passed.

## Notes

- Vitest configs restrict test discovery to `src/**/*.test.ts` or package source tests so compiled `dist` artifacts are not executed as tests.
- The shared validation refactor preserves the current public behavior, including the existing four-character filename suffix check.
