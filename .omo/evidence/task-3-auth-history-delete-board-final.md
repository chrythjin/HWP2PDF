# Task 3 — JobStore schema, UploadSession store, and retention/tombstone support

**Date:** 2026-06-22
**Plan:** `.omo/plans/auth-history-delete-board-final.md` Todo 3
**Files changed:**
- `apps/api/src/services/job-store.ts` (extended)
- `apps/api/src/services/job-store.auth.test.ts` (new, 40 tests)

## What was implemented

### JobRecord extensions
- Owner fields: `ownerType` ("user" | "anonymous"), `userId`, `accessTokenHash`
- Retention fields: `downloadExpiresAt`, `metadataExpiresAt`
- Tombstone fields: `deletedAt`, `deletedBy`, `tombstoneUntil`
- `CreateJobInput` and `UpdateJobPatch` derived from extended `JobRecord`
- Old job compatibility preserved: all new fields are optional

### Helper functions (exported)
- `isDownloadExpired(job)` — checks `downloadExpiresAt` with fallback to `expiresAt`
- `isMetadataExpired(job)` — checks `metadataExpiresAt`; returns false if undefined (legacy)

### JobStore interface methods added
- `getJobForUser(jobId, userId)` — returns job only if ownerType="user" and userId matches; null for deleted/mismatch
- `getJobForAnonymous(jobId, accessTokenHash)` — returns job only if ownerType="anonymous" and hash matches; null for deleted/mismatch
- `listJobsByUser(userId, options?)` — filters by userId, excludes deleted by default, excludes purged tombstones even with includeDeleted=true, sorts by createdAt desc
- `markJobDeleted(jobId, deletedBy)` — sets status="deleted", deletedAt, deletedBy, tombstoneUntil (now + TOMBSTONE_RETENTION_MS), clears downloadUrl/resultObjectPath/originalObjectPath; idempotent

### UploadSession CRUD
- `createUploadSession(session)` — stores in separate map/collection
- `getUploadSession(jobId)` — returns null if not found
- `completeUploadSession(jobId, updates?)` — sets completedAt, merges updates
- `expireUploadSessions(before?)` — removes expired sessions, returns count

### Both implementations
- `MemoryJobStore` — uses separate `Map<string, UploadSessionRecord>` for sessions
- `FirestoreJobStore` — uses separate `uploadSessions` collection

### Preserved behavior
- `getJob` still auto-transitions to "expired" and clears `downloadUrl` when download deadline passes (project memory 3232)
- `createJob`/`getJob`/`updateJob` signatures preserved
- `updateJob` on a deleted job is a no-op (worker no-op on deleted job) — returns current state without resurrecting

### Exported top-level functions
- `getJobForUser`, `getJobForAnonymous`, `listJobsByUser`, `markJobDeleted`
- `createUploadSession`, `getUploadSession`, `completeUploadSession`, `expireUploadSessions`
- `jobStore` (selected store instance)

## Test coverage (40 tests, all passing)

- User job create/retrieve with userId
- Anonymous job create/retrieve with accessTokenHash
- Legacy job compatibility (no ownerType)
- getJobForUser: matching userId, mismatching userId, anonymous job, nonexistent, deleted
- getJobForAnonymous: matching hash, mismatching hash, user job, deleted
- listJobsByUser: only specified user's jobs, excludes deleted, includes deleted with flag, excludes anonymous, empty result, sort by createdAt desc
- markJobDeleted: sets all tombstone fields, clears sensitive paths, null for nonexistent, idempotent, worker no-op on deleted job
- Expired download auto-clear: getJob transitions to expired, future deadline stays completed
- UploadSession CRUD: create/retrieve, null for nonexistent, complete with updates, mismatch, separate from jobs map, expire sessions, explicit before parameter
- isMetadataExpired: future, past, undefined
- isDownloadExpired: future, past, fallback to expiresAt
- Tombstone filtering: purged tombstones excluded even with includeDeleted=true, active tombstones included

## Verification

### Command: `pnpm --filter api test -- src/services/job-store.auth.test.ts`
```
Test Files  1 passed (1)
     Tests  40 passed (40)
  Duration  648ms
```

### Command: `pnpm --filter api test` (full suite)
```
Test Files  4 passed (4)
     Tests  78 passed (78)
  Duration  1.09s
```

### Typecheck: `pnpm --filter api typecheck`
- Zero errors in `job-store.ts` or `job-store.auth.test.ts`
- Pre-existing errors in `auth.ts`/`auth.test.ts` are from Todo 2 (not in scope)

## Decisions
- `UploadSessionRecord` is a type alias for the shared `UploadSession` type, keeping the server-side naming explicit while reusing the contract
- `listJobsByUser` in Firestore uses `where("status", "!=", "deleted")` for the default non-deleted filter; purged tombstone filtering is done in memory when `includeDeleted=true`
- `markJobDeleted` clears `downloadUrl`, `resultObjectPath`, and `originalObjectPath` to prevent sensitive path leakage from tombstones (decision D12)
- `updateJob` on a deleted job returns the current deleted state without applying the patch — this prevents a late worker from resurrecting a deleted job

## Not verified
- Firestore integration tests require real GCP credentials — only MemoryJobStore logic is unit-tested
- Route handler integration is deferred to Todo 5/7