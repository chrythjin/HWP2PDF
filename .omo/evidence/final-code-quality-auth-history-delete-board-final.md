# F2. Code Quality / Security Review — FINAL

**Date**: 2026-06-23
**Verdict**: APPROVE

## Tombstone Privacy

**FIXED in prior session.** Both `MemoryJobStore.markJobDeleted` and `FirestoreJobStore.markJobDeleted` now use explicit field assignment instead of `...current` spread. Tombstone records contain only:
- jobId, originalFileName: "[deleted]", sourcePath: "[deleted]", status: "deleted"
- progress: 0, expiresAt, createdAt, updatedAt
- deletedAt, deletedBy, tombstoneUntil

Sensitive fields (downloadUrl, resultObjectPath, originalObjectPath, ownerType, userId, accessTokenHash) are NOT preserved in tombstones.

## Token Leakage

- Anonymous access tokens are hashed server-side (SHA-256) before storage
- Tokens are never returned in status responses or logs
- Verified in `access-token.ts` and `v1.download-auth.test.ts`

## Ownership Bypass

- All status, download, and results endpoints require owner verification
- Legacy owner-less jobs are now denied (401) per plan guardrail
- Verified in `v1.upload-ownership.test.ts` (24 tests) and `v1.download-auth.test.ts` (17 tests)

## Worker Endpoint Auth

- Cloud Tasks worker endpoint requires OIDC token verification
- Unauthenticated requests return 401/403
- Verified in `v1.worker.test.ts` (16 tests)

## Signed URL Bypass

- Protected download URLs have short TTL (2 min default)
- Direct file access via `/v1/results/:fileName` now requires owner verification for ALL jobs (including legacy)
- No unconditional public download path remains

## Build & Test

- API build: PASS
- API tests: 278/278 PASS
- Web tests: 58/58 PASS
- Shared tests: 41/41 PASS
- Total: 377/377 PASS
