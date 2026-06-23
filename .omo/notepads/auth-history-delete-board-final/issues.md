# Issues - auth-history-delete-board-final

## 2026-06-23 final wave blockers
- F4 rejected: privacy/terms/home FAQ not updated for member 30-day metadata retention, deletion tombstone, anonymous token access, anonymous TTL deletion. Also lint errors in new web code (history page, board page, useBoardClaims, DropzoneUploader warnings, board-page.test warnings) and roadmap trailing whitespace.
- OCR review timed out (partial) — independent review accepted as fallback.

## 2026-06-23 F2 code quality / security review — REJECT

Verdict: REJECT.

Blocking issue:
- Tombstone privacy is not satisfied. `MemoryJobStore.markJobDeleted` and `FirestoreJobStore.markJobDeleted` spread the full existing job record into the tombstone, then clear only `downloadUrl`, `resultObjectPath`, and `originalObjectPath`. This preserves private metadata and local paths such as `originalFileName`, `sourcePath`, `resultPath`, `ownerType`, `userId`, and `accessTokenHash` on deleted records, contrary to the required tombstone shape of only `status`/`deletedAt`/`deletedBy` (and retention deadline if needed). Evidence: `apps/api/src/services/job-store.ts:247` spreads `...current`; `apps/api/src/services/job-store.ts:249-257` clears only selected URL/object fields; Firestore repeats the same pattern at `apps/api/src/services/job-store.ts:450-459`. Existing tests assert only selected fields are cleared, not tombstone minimization: `apps/api/src/services/job-store.auth.test.ts:284-298` and `apps/api/src/routes/v1.member-jobs.test.ts:523-532`.

Positive security evidence checked:
- Anonymous access token plaintext is generated and returned only in upload responses, while only `accessTokenHash` is stored on upload session/job records: `apps/api/src/routes/v1.ts:149-188`, `apps/api/src/routes/v1.ts:323-370`; token utilities store SHA-256 hashes and constant-time verification: `apps/api/src/utils/access-token.ts:21-34`, `apps/api/src/utils/access-token.ts:47-64`; auth middleware says tokens are never logged and verification errors omit token text: `apps/api/src/middleware/auth.ts:14-15`, `apps/api/src/middleware/auth.ts:91-94`. I found no route-side logging of plaintext `accessToken` in `apps/api/src/routes/v1.ts`.
- Download/status owner checks are enforced for owner-aware jobs: status route verifies owner before returning `downloadUrl` at `apps/api/src/routes/v1.ts:386-410`; download route verifies owner before redirect/stream at `apps/api/src/routes/v1.ts:453-475`; storage response builder includes `downloadUrl` only when verifier authorizes at `apps/api/src/services/storage-service.ts:170-193`; route tests cover anonymous/member no-token/wrong-token/correct-owner cases at `apps/api/src/routes/v1.download-auth.test.ts:105-168` and `apps/api/src/routes/v1.download-auth.test.ts:241-342`.
- Member history routes require auth and use owner-aware store methods: `GET /v1/me/jobs` uses `requireAuth` and `listJobsByUser(request.user.uid)` at `apps/api/src/routes/v1.ts:752-761`; detail and delete use `getJobForUser(jobId, request.user.uid)` at `apps/api/src/routes/v1.ts:769-793` and `apps/api/src/routes/v1.ts:801-835`; tests cover other-user 404 and auth-required cases at `apps/api/src/routes/v1.member-jobs.test.ts:179-190`, `apps/api/src/routes/v1.member-jobs.test.ts:340-360`, and `apps/api/src/routes/v1.member-jobs.test.ts:437-469`.
- Worker endpoint is protected by `requireWorkerOidc`: route binding at `apps/api/src/routes/v1.ts:571`; middleware requires Bearer token and validates audience/issuer/email at `apps/api/src/middleware/worker-auth.ts:204-249`; tests cover missing header, empty bearer, invalid token, wrong audience, and valid processing at `apps/api/src/routes/v1.worker.test.ts:131-171` and `apps/api/src/routes/v1.worker.test.ts:178-201`.

Code-quality/security scan notes:
- `ocr review` was available and was run. It timed out after 120000 ms, producing partial output including: `[ocr] 233 file(s) changed, reviewing 48 in C:\NEW PRG\HWP2PDF`, plan completion for `apps/api/src/routes/v1.ts`, `apps/api/src/services/job-store.ts`, and `apps/api/src/services/storage-service.ts`, plus several `Review filter: failed to parse LLM response` messages before the shell timeout. No complete OCR verdict was available from that run.
- Targeted pattern scan found explicit `any` plus `new Function` dynamic imports in `apps/api/src/middleware/worker-auth.ts:105-106` and `apps/api/src/services/cloud-tasks-dispatcher.ts:101-102`, and an explicit `any` in `apps/api/src/services/firebase-admin.ts:59`. These are not the primary reject reason, but they are code-quality/security review findings to resolve or justify.
- Targeted scans did not find unsafe `eval(` or SQL-concatenation patterns in the reviewed API source. This code path uses Firestore/Map storage rather than raw SQL: `apps/api/src/services/job-store.ts:310-319`, `apps/api/src/services/job-store.ts:411-428`.

## 2026-06-23 tombstone privacy fix

- Fixed the F2 reject root cause in `apps/api/src/services/job-store.ts`: both `MemoryJobStore.markJobDeleted` and `FirestoreJobStore.markJobDeleted` now construct deleted-job tombstones from an explicit allowlist instead of spreading `...current`.
- Tombstones now retain only identity/required audit fields: `jobId`, placeholder `originalFileName`/`sourcePath`, `status: "deleted"`, `progress: 0`, `expiresAt`, `createdAt`, `updatedAt`, `deletedAt`, `deletedBy`, and `tombstoneUntil`. Sensitive/private fields such as `resultPath`, object paths, owner fields, token hash, expiry metadata, download URL, and message are omitted.
- Updated API tests to assert the strict tombstone shape and absence of sensitive fields; `listJobsByUser(..., { includeDeleted: true })` no longer expects minimized tombstones because owner fields are removed by design.

## 2026-06-23 F2 code quality / security rerun — APPROVE

Verdict: APPROVE.

Required tombstone verification passed:
- `MemoryJobStore.markJobDeleted` now builds tombstones from an explicit allowlist at `apps/api/src/services/job-store.ts:248-260`; there is no `...current` spread and no `ownerType`, `userId`, `accessTokenHash`, `downloadUrl`, `resultPath`, or object path fields.
- `FirestoreJobStore.markJobDeleted` uses the same explicit allowlist at `apps/api/src/services/job-store.ts:453-465` and writes only that record at line 467.

Security checklist evidence:
- Anonymous tokens are generated server-side, stored only as SHA-256 hashes, and verified with constant-time comparison: `apps/api/src/utils/access-token.ts:21-35`, `apps/api/src/utils/access-token.ts:47-64`. Plaintext anonymous tokens are returned once in JSON upload responses, not URLs: `apps/api/src/routes/v1.ts:184-188` and `apps/api/src/routes/v1.ts:366-370`.
- Owner-aware job status/download/member history routes verify either matching Firebase user ID or matching anonymous token hash before exposing status/download access: `apps/api/src/routes/v1.ts:386-410`, `apps/api/src/routes/v1.ts:453-485`, `apps/api/src/routes/v1.ts:752-835`, and `apps/api/src/services/storage-service.ts:92-122`.
- Worker endpoint is protected by `requireWorkerOidc`: route binding at `apps/api/src/routes/v1.ts:571`; middleware requires Bearer OIDC and checks audience/issuer/service-account email at `apps/api/src/middleware/worker-auth.ts:204-249`; Cloud Tasks dispatch includes OIDC token config at `apps/api/src/services/cloud-tasks-dispatcher.ts:272-287`.
- Firebase Admin SDK is used server-side for token verification and Firestore Admin access; routes and stores enforce ownership/roles server-side rather than relying on Firestore Rules: `apps/api/src/services/firebase-admin.ts:70-132`, `apps/api/src/middleware/auth.ts:100-106`, `apps/api/src/services/job-store.ts:374-407`.
- Signed download URLs are protected by owner verification. `getStatusResponse` includes `downloadUrl` only after verifier authorization, and `getProtectedDownloadUrl` mints fresh short-lived URLs: `apps/api/src/services/storage-service.ts:139-157`, `apps/api/src/services/storage-service.ts:170-193`.
- Board routes require auth and enforce admin/moderator/owner permissions server-side: `apps/api/src/routes/v1.board.ts:94-108`, `115-130`, `137-184`, `191-258`, `265-299`; store-level checks are in `apps/api/src/services/board-store.ts:177-188`, `212-219`, `318-328`, and `354-360`.

Code-quality/security scan:
- Required grep over reviewed files for `as any`, `@ts-ignore`, `console.log`, `TODO`, and `FIXME` returned 0 matches. A regex follow-up for `as\s+any` also returned 0 matches.

Non-blocking follow-ups:
- `apps/api/src/services/storage-service.ts:339-341` includes `objectPath=${input.objectPath}` in an internal thrown error. The API error handler returns a generic 500 body, but it may log the message at `apps/api/src/middleware/error-handler.ts:14-15`; redact for defense in depth.
- `apps/api/src/services/storage-service.ts:361-367` still stores a legacy longer-TTL signed URL in `job.downloadUrl`; current response paths mint protected URLs after ownership verification, but removing the stored URL would reduce future misuse risk.
- `new Function("return import(...)")()` dynamic imports in `apps/api/src/middleware/worker-auth.ts:105-106` and `apps/api/src/services/cloud-tasks-dispatcher.ts:101-102` are hardcoded and not exploitable via user input, but a cleaner optional import pattern would reduce review noise.

