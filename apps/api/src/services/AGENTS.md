# apps/api/src/services/AGENTS.md

Business logic layer. Holds every domain module that drives the conversion pipeline. Parent `AGENTS.md` covers package layout and verified commands.

## Module map

| File | Role | Key exports |
|---|---|---|
| `job-store.ts` | JobRecord CRUD + retention/tombstone | `MemoryJobStore`, `FirestoreJobStore`, `JobRecord`, `UpdateJobPatch`, owner-aware lookups |
| `storage-service.ts` | Dual-backend (filesystem/GCS) + `OwnerVerifier` | `shouldUseGcs`, `getProtectedDownloadUrl`, `createOwnerVerifier` |
| `conversion-service.ts` | LibreOffice invocation | `convertJobToPdf`, `runLibreOffice` |
| `cloud-tasks-dispatcher.ts` | Async dispatch (cloud-tasks / inline / mock) | `enqueueConversionJob`, `createInternalWorkerUrl`, `getDispatcherMode` |
| `board-store.ts` | Board post CRUD | `MemoryBoardStore`, `FirestoreBoardStore`, `createBoardPost`, `listBoardPosts` |
| `firebase-admin.ts` | Admin SDK lifecycle (ADC/SA/mock) | `getTokenVerifier`, `buildMockIdToken` |
| `maintenance-service.ts` | Stuck job recovery, upload session cleanup | `runMaintenance`, `recoverStaleProcessingJobs`, `expireUploadSessionsForCleanup` |

## Cross-cutting rules

- **Owner verification.** `getProtectedDownloadUrl` always calls `createOwnerVerifier`; never shortcut to a signed URL without owner check.
- **Tombstone retention.** `JobRecord` writes preserve `TOMBSTONE_RETENTION_MS` (30d). Always use `UpdateJobPatch` (PATCH type is `Omit<JobRecord, "jobId" | "createdAt" | "ownerType" | "userId" | "accessTokenHash">`, memory #645).
- **Public error mapping.** Conversion errors must go through `PUBLIC_CONVERSION_ERRORS`. Never surface `error.message` raw (memory #325).
- **Async pattern.** `enqueueConversionJob` is the only entry point for Cloud Tasks — never `gcloud tasks` directly from routes.

## Anti-patterns

- Don't import `firebase-admin` root — v14 requires `firebase-admin/auth` subpath (memory #323).
- Don't introduce a new job state without updating `JobRecord`'s literal union.
- Don't store secrets in env-driven config — `config.ts` is env-only, secrets stay in Secret Manager.

## When adding a service

1. Pick the dual-backend interface pattern if data persists across restarts (`MemoryXxx` + `FirestoreXxx`).
2. Register in `app.ts` initialization section.
3. Co-locate `*.test.ts` next to source (memory #358 — tests beside code, not under `__tests__`).
