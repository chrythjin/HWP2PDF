# Session: tombstone privacy fix

**Date:** 2026-06-23 19:26:00
**Task:** Fix deleted-job tombstones so `markJobDeleted` does not preserve private job metadata.
**Status:** Complete

## What changed

- Updated `MemoryJobStore.markJobDeleted` and `FirestoreJobStore.markJobDeleted` to construct deleted tombstones from an explicit allowlist instead of spreading the previous job record.
- Tombstones now retain only required identity/audit fields plus required `JobRecord` placeholders: `jobId`, `originalFileName: "[deleted]"`, `sourcePath: "[deleted]"`, `status: "deleted"`, `progress: 0`, `expiresAt`, `createdAt`, `updatedAt`, `deletedAt`, `deletedBy`, and `tombstoneUntil`.
- Updated API tests to assert that deleted tombstones omit private fields including owner metadata, token hash, local/result paths, object paths, download URL, expiry metadata, and message.
- Appended the fix summary to `.omo/notepads/auth-history-delete-board-final/issues.md`.

## Files touched

- `apps/api/src/services/job-store.ts`
- `apps/api/src/services/job-store.auth.test.ts`
- `apps/api/src/routes/v1.member-jobs.test.ts`
- `.omo/notepads/auth-history-delete-board-final/issues.md`
- `docs/sessions/20260623_192600_tombstone-privacy-fix.md`

## Verification performed

Command:

```powershell
pnpm --filter api test
```

Result: PASS. 13 test files passed, 278 tests passed, 0 failed.

Command:

```powershell
pnpm --filter api build
```

Result: PASS. `apps/api` compiled with `tsc`.

## Notes

- An initial test run failed because an older `includeDeleted=true` test expected deleted user jobs to remain queryable by `userId`; this is incompatible with the privacy-safe tombstone shape because owner fields are intentionally omitted. The test was updated to match the new contract.
