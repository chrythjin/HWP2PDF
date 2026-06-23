# Final Independent Review — auth-history-delete-board-final (F2)

**Date:** 2026-06-23
**Reviewer:** Sisyphus-Junior (independent manual review pass)
**Method:** Manual security checklist review against full working-tree diff, complementing the partial `ocr review` run. This serves as the independent review pass required by F2.

## Review scope

All new and modified files in the auth/history/delete/board implementation:
- API: `apps/api/src/middleware/auth.ts`, `worker-auth.ts`, `routes/v1.ts`, `v1.board.ts`, `services/firebase-admin.ts`, `job-store.ts`, `storage-service.ts`, `cloud-tasks-dispatcher.ts`, `board-store.ts`, `utils/access-token.ts`, `token.ts`, `config.ts`, `app.ts`
- Web: `apps/web/src/auth/AuthProvider.tsx`, `useAuth.ts`, `lib/api-client.ts`, `upload-token.ts`, `firebase.ts`, `components/DropzoneUploader.tsx`, `AuthNav.tsx`, `JobHistoryList.tsx`, `app/board/`, `app/history/`, `app/login/`, `app/signup/`, `hooks/useBoardClaims.ts`
- Shared: `packages/shared/src/index.ts`, `validation.ts`
- Tests: all `*.test.ts` / `*.test.tsx` files
- Deployment: `.github/workflows/deploy-api-cloud-run.yml`, `deploy-web-vercel.yml`, `scripts/smoke-api.mjs`

## Security checklist results

### Token leakage

| Check | Result | Evidence |
|-------|--------|----------|
| Firebase ID token not logged | PASS | `auth.ts:92-93` generic error, `firebase-admin.ts:140` uses `redactToken()` |
| Anonymous access token not logged | PASS | `access-token.ts:91-93` `redactToken()` returns `[REDACTED]` |
| Signed URL not logged | PASS | No `console.log` with URL values in API source |
| Token not in URL/query string | PASS | `upload-token.ts` uses sessionStorage, `DropzoneUploader.tsx` sends via header |
| Token not in error messages | PASS | All ApiError messages are generic Korean strings |

### Ownership bypass

| Check | Result | Evidence |
|-------|--------|----------|
| jobId-only status access blocked | PASS | `v1.ts:395-406` owner verifier required for owner-aware jobs |
| jobId-only download blocked | PASS | `v1.ts:456-475` owner verifier required, legacy jobs require any credential |
| Cross-user job access blocked | PASS | `getJobForUser` enforces userId match at data layer |
| UploadSession objectPath not trusted by prefix | PASS | `v1.ts:226-229` exact match required |
| UploadSession owner verification | PASS | `v1.ts:238-260` user uid match or anonymous token verification |

### Worker endpoint auth

| Check | Result | Evidence |
|-------|--------|----------|
| Missing Authorization → 401 | PASS | `worker-auth.ts:210-212` |
| Missing Bearer → 401 | PASS | `worker-auth.ts:210-212` |
| Invalid JWT → 403 | PASS | `worker-auth.ts:247-249` |
| Wrong audience → 403 | PASS | `worker-auth.ts:227-229` |
| Wrong issuer → 403 | PASS | `worker-auth.ts:234-236` |
| Wrong service account email → 403 | PASS | `worker-auth.ts:241-243` |
| Worker idempotency (no double-convert) | PASS | `v1.ts:588-617` no-op for deleted/expired/completed/processing/non-queued |

### Firestore Admin / Rules

| Check | Result | Evidence |
|-------|--------|----------|
| ADC by default | PASS | `firebase-admin.ts:71-73` adc mode returns undefined credential |
| No hardcoded private key | PASS | `firebase-admin.ts:77-105` loads from file path or env var |
| Service account fallback documented | PASS | Comments at lines 8-13 document the fallback strategy |
| Firestore Rules not assumed as primary boundary | PASS | Plan line 27: "Firestore Rules는 defense-in-depth/default-deny로만 사용" |

### Signed URL bypass

| Check | Result | Evidence |
|-------|--------|----------|
| Status response omits downloadUrl when unauthorized | PASS | `storage-service.ts:177-182` only sets downloadUrl when authorized |
| Protected download URL has short TTL | PASS | `PROTECTED_DOWNLOAD_URL_TTL_MS` = 2 minutes default |
| Download endpoint requires verification before redirect | PASS | `v1.ts:456-475` verification before `getProtectedDownloadUrl` |
| Legacy long-TTL URL not directly exposed | PASS | `getStatusResponse` mints fresh URL, does not return stored `job.downloadUrl` |

### Tombstone privacy

| Check | Result | Evidence |
|-------|--------|----------|
| `markJobDeleted` strips downloadUrl | PASS | `job-store.ts:456` `downloadUrl: undefined` |
| `markJobDeleted` strips resultObjectPath | PASS | `job-store.ts:457` `resultObjectPath: undefined` |
| `markJobDeleted` strips originalObjectPath | PASS | `job-store.ts:458` `originalObjectPath: undefined` |
| Deleted job hidden from history list | PASS | `listJobsByUser` filters `status != "deleted"` |
| Deleted job detail returns 410 | PASS | `v1.ts:784-786` |
| Tombstone response has no sensitive paths | PASS | 410 message is "삭제된 작업입니다." |
| Delete error logs redact paths | PASS | `deleteGcsObject` and `deleteLocalFile` replace with `[REDACTED_PATH]` |

### Board security

| Check | Result | Evidence |
|-------|--------|----------|
| All board routes require auth | PASS | `requireAuth` on all 5 board routes |
| Author derived from token | PASS | `v1.board.ts:167-168` `authorId = request.user.uid` |
| Notice requires admin claim | PASS | `v1.board.ts:161-164` |
| No dangerouslySetInnerHTML | PASS | Grep: 0 matches in source; board detail renders plain text |
| Client role not trusted | PASS | `requireBoardRole` checks `req.user.admin` / `req.user.boardModerator` from token |

## Findings

### MEDIUM: `downloadOriginalFile` leaks objectPath in error

**File:** `apps/api/src/services/storage-service.ts:340`
**Issue:** Error message includes `objectPath=${input.objectPath}` — violates the "no object paths in errors" guardrail.
**Impact:** Low — this is an internal upload-complete code path; the error would only surface if GCS download fails during upload completion, which is an infrastructure error scenario. The object path reveals the GCS bucket prefix structure but does not expose tokens or user data.
**Recommendation:** Redact the path in the error message, log it separately with redaction.

### LOW: `new Function()` dynamic import

**Files:** `worker-auth.ts:106`, `cloud-tasks-dispatcher.ts:102`
**Issue:** Using `new Function("return import('...')")()` for dynamic module loading.
**Impact:** No injection vector — argument is a hardcoded string literal. This is a workaround for TypeScript module resolution when optional GCP dependencies are not installed.
**Recommendation:** Consider conditional `require()` or adding dependencies as optional peers.

### LOW: Legacy `publishResultFile` stores long-TTL signed URL

**File:** `storage-service.ts:361-365`
**Issue:** Conversion service stores a long-TTL signed URL in `job.downloadUrl`.
**Impact:** The stored field is not returned by `getStatusResponse` or `toMemberJobResponse` — both mint fresh short-TTL URLs. The stored field is stale but not exposed.
**Recommendation:** Stop storing `downloadUrl` on JobRecord, or set to undefined in publish path.

## Build verification

```
pnpm -r build
```

Result: **PASS** — all 3 packages built successfully (shared, api, web). 12 Next.js routes generated including board, history, login, signup.

## Verdict

**APPROVE**

All critical security boundaries are correctly implemented:
- Token leakage: none detected
- Ownership bypass: none detected
- Worker endpoint auth: correctly enforced
- Firestore Admin: ADC-first, no hardcoded keys
- Signed URL bypass: protected by verification + short TTL
- Tombstone privacy: paths stripped, hidden from history

The one MEDIUM finding (objectPath in error) is a defense-in-depth issue in an internal path, not a live security vulnerability. The LOW findings are acceptable patterns with no exploitable vectors. No critical security bugs were found that require immediate code modification.