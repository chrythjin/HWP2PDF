# auth-history-delete-board-final - Work Plan

## TL;DR (For humans)

**What you'll get:** 로그인 기반 변환 이력, 회원 파일 삭제, 비회원 변환 유지, 브라우저를 닫아도 지속되는 Cloud Tasks 기반 변환, 회원 전용 게시판을 한 번에 구현하되 보안 경계와 운영 배포 조건까지 포함합니다.

**Why this approach:** 현재 서비스는 jobId만 알면 상태/다운로드를 볼 수 있고 변환도 API 프로세스 내부 fire-and-forget이라 회원 기능을 얹으면 개인정보와 안정성 문제가 생깁니다. 그래서 먼저 소유권/토큰/다운로드 보호 계약을 고정하고, 그 위에 Cloud Tasks worker와 회원 기능을 쌓습니다.

**What it will NOT do:** 서버가 비밀번호를 직접 받거나 자체 로그인 토큰을 발급하지 않습니다. 비회원 직접 삭제는 MVP에 넣지 않습니다. GCS signed URL을 무조건 공개 반환하면서 `X-Job-Access-Token`으로 보호됐다고 주장하지 않습니다.

**Effort:** XL
**Risk:** High - 인증, 소유권, queue worker, 저장소 스키마, 프론트 라우팅, 배포/IAM이 모두 바뀌는 대형 기능 묶음입니다.
**Decisions to sanity-check:** Cloud Tasks HTTP queue, 익명 access token 전용 헤더, 회원 삭제 tombstone 30일, 게시판 admin custom claims, 문서/배포까지 같은 릴리스에 포함.

Your next move: 이 계획을 검토한 뒤 실행을 시작하려면 `$start-work`로 worker에게 넘기세요. Prometheus는 계획만 작성했고 제품 코드는 변경하지 않았습니다.

---

> TL;DR (machine): XL/high-risk implementation plan for Firebase Auth + owner-scoped jobs + UploadSession + Cloud Tasks worker + member history/delete + member board + deployment/docs/tests.

## Scope

### Must have

- Firebase Auth Client SDK 기반 로그인/회원가입/로그아웃 UI와 API Firebase Admin ID token 검증.
- API는 비밀번호를 직접 받지 않고, 서버 자체 refresh token/login DTO를 만들지 않음.
- Firestore Rules는 1차 보안 경계가 아니라 defense-in-depth/default-deny로만 사용. Express/API 권한 검사가 1차 경계.
- Cloud Run production 인증은 ADC/service account 우선. 서비스 계정 키 env는 로컬/비GCP fallback만 허용.
- 회원/비회원 job 소유권 모델 분리:
  - 회원 job: `ownerType: "user"`, `userId` 보유.
  - 비회원 job: `ownerType: "anonymous"`, `accessTokenHash` 보유, 원문 token은 최초 응답에서만 반환.
- 서버 `UploadSession` 엔티티로 direct upload `initiate -> complete -> status/download` 소유권을 묶음.
- 비회원 status/download 접근은 `jobId + X-Job-Access-Token` 필수. query string token과 `Authorization` 재사용 금지.
- 회원 history API는 본인 job만 반환. 파일 다운로드 만료와 metadata 보관 만료를 분리.
- 회원 파일은 짧은 TTL/다운로드 만료 정책을 유지하고, 회원 metadata는 30일 보관.
- 회원 삭제는 원본/결과 파일 즉시 삭제 시도 + history에서 숨김 + 최소 tombstone 30일 유지.
- 비회원 직접 삭제는 MVP 미지원. 비회원 파일/metadata는 TTL/lifecycle/cleanup으로 정리.
- Cloud Tasks HTTP queue 기반 durable conversion:
  - upload complete → queued job persist → Cloud Tasks enqueue → internal worker endpoint → LibreOffice conversion → result publish → completed/failed.
  - worker endpoint는 Cloud Tasks OIDC service account token/audience 검증.
  - idempotency, retry/backoff, stuck-job handling, already-deleted/completed no-op 처리 포함.
- 게시판은 회원 전용:
  - normal member: read/write `general`, `qna`; own post edit/delete.
  - `admin` custom claim: notice create/edit/delete, full moderation.
  - `boardModerator` custom claim: moderation delete/edit 범위는 구현 전에 API 계약에 명시.
  - authorId/authorName은 클라이언트 입력이 아니라 token/server profile에서만 설정.
- core security/API/worker는 TDD-first. UI pages/components/copy는 구현 후 테스트.
- 구현 worker는 최종 human-facing 계획 내용을 `docs/plan/auth-history-delete-board-roadmap.md`에 동일하게 반영하고 `docs/INDEX.md`를 갱신.
- 성공한 코드/config 변경 후 `docs/sessions/YYYYMMDD_HHMMSS_<task-name>.md` 작성.

### Must NOT have (guardrails, anti-slop, scope boundaries)

- 서버 비밀번호 DTO, `/v1/auth/login`, `/v1/auth/signup`, `/v1/auth/refresh` 자체 구현 금지.
- `jobId` 단독으로 회원/비회원 job status나 downloadUrl 반환 금지.
- access token 원문 저장 금지. 로그/test output에도 Firebase ID token, anonymous access token, signed URL 원문 노출 금지.
- `X-Job-Access-Token` 보호를 도입하면서 GCS signed URL을 status 응답에 무조건 노출 금지. token 검증 후 짧게 재발급하거나 API 프록시 다운로드로 통제해야 함.
- Cloud Tasks worker endpoint를 `--allow-unauthenticated` 상태에서 Express/OIDC 검증 없이 열어두기 금지.
- 현재 `void convertJobToPdf(...)` in-process 변환을 production 경로에 남기기 금지. local/dev fallback을 남길 경우 명시적으로 `CONVERSION_DISPATCHER=inline` 같은 opt-in으로 제한.
- 회원 deletion을 Firestore document hard delete만으로 처리 금지. 파일 삭제 실패/worker 재시도/idempotent delete를 다룰 tombstone 필요.
- 비회원 삭제 기능을 토큰만으로 급히 추가 금지.
- 게시판 notice/admin 권한을 client-provided role/category에 의존 금지.
- Firestore Rules가 Admin SDK/API 권한을 막아준다고 가정 금지.
- 인증/worker/storage 실제 동작 검증을 사용자에게 떠넘기기 금지. agent가 테스트/빌드/스모크를 직접 실행하고 증거 파일을 남겨야 함.
- Next.js 16.2.9 관련 API/라우팅 변경 전 `apps/web/AGENTS.md` 지시대로 installed docs 확인 없이 추측 구현 금지.

## Verification strategy

> Zero human intervention - all verification is agent-executed.

- Test decision: mixed strategy.
  - TDD first: shared contracts, token hashing/verification, auth middleware, optional auth, UploadSession validation, ownership guards, history/deletion authorization, Cloud Tasks worker OIDC/idempotency, board permission matrix.
  - Tests-after: login/history/board page UI, copy/policy rendering, end-to-end smoke.
- Required commands, unless a todo explicitly justifies a narrower command first:
  - `pnpm --filter @hwp2pdf/shared test`
  - `pnpm --filter api test`
  - `pnpm --filter web test`
  - `pnpm --filter api typecheck`
  - `pnpm --filter web typecheck`
  - `pnpm -r build`
  - `node scripts/smoke-api.mjs <deployed-or-local-api-url>` after smoke script updates and a running API is available.
  - `ocr review` before final completion if code/config changed.
- For focused tests, prefer adding named test files and invoking them directly, e.g. `pnpm --filter api test -- src/routes/v1.auth.test.ts` or `pnpm --filter web test -- src/components/DropzoneUploader.auth.test.tsx`. If the runner does not support file filters, run the full package test command and record that fallback in evidence.
- Evidence: each todo writes concise command output and assertions to `.omo/evidence/task-<N>-auth-history-delete-board-final.md` or `.json`. Do not store secrets/tokens in evidence.
- Status/download acceptance must include explicit HTTP boundary checks:
  - no token → 401/403.
  - wrong token → 403 or 404 by chosen API policy, but consistent and documented.
  - correct token → 200.
  - other member's job → 403.
  - deleted/tombstoned job → no download URL and hidden from normal history.

## Execution strategy

### Parallel execution waves

- **Wave 1 — contracts and security spine:** shared contracts, API auth/token primitives, JobStore/UploadSession schema, storage deletion/download boundary, Cloud Tasks interface design. Parallelize after shared types are drafted; tests first.
- **Wave 2 — API behavior:** upload initiate/complete ownership, status/download auth, history/delete endpoints, worker endpoint/enqueue, board API. Strong dependency on Wave 1 contracts.
- **Wave 3 — frontend:** Firebase client/AuthProvider, upload token handling, history/delete UI, board UI, navigation/copy/policy updates. Depends on stable API contracts from Wave 2; can parallelize board UI with history UI.
- **Wave 4 — deployment/docs/smoke:** workflows/env/IAM docs, smoke script, docs plan copy, docs index/session docs. Can begin after API env names stabilize.
- **Final verification wave:** independent audits after all todos complete.

### Dependency matrix

| Todo | Depends on | Blocks | Can parallelize with |
| --- | --- | --- | --- |
| 1 Shared contracts | none | 2,3,5,6,7,8,9,10 | none |
| 2 API auth primitives | 1 | 5,6,8,9 | 3,4 |
| 3 JobStore + UploadSession | 1 | 5,6,7,8 | 2,4 |
| 4 Storage + download boundary | 1 | 6,7,10 | 2,3 |
| 5 Upload/status ownership API | 1,2,3,4 | 6,8,10 | 7 after partial completion |
| 6 Cloud Tasks worker | 1,2,3,4,5 | 10,13 | 7,8 |
| 7 History/delete API | 2,3,4,5 | 11,13 | 6,8 |
| 8 Board API | 1,2,3 | 12,13 | 6,7 |
| 9 Web auth shell | 1,2 | 10,11,12 | 6,7,8 |
| 10 Upload UI token/worker UX | 5,6,9 | 13 | 11,12 |
| 11 History/delete UI | 7,9 | 13 | 10,12 |
| 12 Board UI | 8,9 | 13 | 10,11 |
| 13 Deployment/docs/smoke/session docs | 6,7,8,10,11,12 | final verification | none |

## Todos

> Implementation + Test = ONE todo. Never separate.

- [x] 1. Shared API contract and retention model
  What to do / Must NOT do: Extend `packages/shared/src/index.ts` with owner-aware job contracts, `UploadSession` DTOs, anonymous `AccessToken` response semantics, `downloadExpiresAt`, `metadataExpiresAt`, `deleted` status/tombstone fields, board DTOs, and route constants. Update `packages/shared/src/index.test.ts` and `validation.test.ts` with failing-first tests for route constants, status enum, retention fields, and token non-return policy. Must NOT add server password/login DTOs.
  Parallelization: Wave 1 | Blocked by: none | Blocks: 2,3,5,6,7,8,9,10
  References (executor has NO interview context - be exhaustive): `packages/shared/src/index.ts`, `packages/shared/src/job-types.ts`, `packages/shared/src/validation.ts`, `packages/shared/src/index.test.ts`, `packages/shared/src/validation.test.ts`, `apps/api/src/routes/v1.ts`, `.omo/drafts/auth-history-delete-board-redesign.md` decisions D1-D13.
  Acceptance criteria (agent-executable): `pnpm --filter @hwp2pdf/shared test` passes; shared exports include no password DTOs; `API_ROUTES` includes health/upload/upload-initiate/upload-complete/jobs/me/me-jobs/results/board routes; `UploadStatus` includes `deleted` or a documented tombstone-specific status accepted by tests.
  QA scenarios (name the exact tool + invocation): `pnpm --filter @hwp2pdf/shared test | Tee-Object .omo/evidence/task-1-auth-history-delete-board-final.md` in PowerShell. Expected: no password DTO exports, deleted/tombstone contract exists, anonymous token plaintext is response-only.
  Commit: N | feat(shared): add auth-aware job contracts

- [x] 2. Firebase Admin auth and token primitives in API
  What to do / Must NOT do: Add `firebase-admin` dependency and API utilities for Firebase Admin initialization via ADC by default, local/mock test mode, and optional service-account fallback. Add `requireAuth`, `optionalAuth`, and `requireBoardRole` style middleware. Add anonymous access token generation/hash/constant-time verification helper with log redaction. Must NOT require real Firebase credentials for unit tests.
  Parallelization: Wave 1 | Blocked by: 1 | Blocks: 5,6,7,8
  References: `apps/api/package.json`, `apps/api/src/config.ts`, `apps/api/src/app.ts`, `apps/api/src/middleware/request-id.ts`, `apps/api/src/middleware/error-handler.ts`, `apps/api/src/utils/api-error.ts`, `.github/workflows/deploy-api-cloud-run.yml`.
  Acceptance criteria: API tests cover valid Firebase mock token, missing token, invalid token, admin claim, boardModerator claim, anonymous token hash verification, and redaction. No test requires network/Firebase credentials.
  QA scenarios: `pnpm --filter api test -- src/auth/firebase-auth.test.ts src/auth/anonymous-token.test.ts | Tee-Object .omo/evidence/task-2-auth-history-delete-board-final.md`; fallback to `pnpm --filter api test` if filtering is unsupported. Expected: missing/invalid Firebase token rejected, mock valid token accepted, custom claims surfaced, anonymous tokens hash/verify and redact.
  Commit: N | feat(api): add firebase auth middleware

- [x] 3. JobStore schema, UploadSession store, and retention/tombstone support
  What to do / Must NOT do: Extend `JobRecord`, `CreateJobInput`, `UpdateJobPatch`, `JobStore`, `MemoryJobStore`, and `FirestoreJobStore` for owner fields, `accessTokenHash`, `downloadExpiresAt`, `metadataExpiresAt`, `deletedAt`, `deletedBy`, `tombstoneUntil`, redacted filenames/object paths, list-by-user, token lookup, mark-deleted, and upload-session CRUD. Preserve old job compatibility where possible. Must NOT hard-delete member jobs on delete path except after tombstone TTL cleanup.
  Parallelization: Wave 1 | Blocked by: 1 | Blocks: 5,6,7,8
  References: `apps/api/src/services/job-store.ts`, `apps/api/src/config.ts`, project memory 3232/3233/3679/3680, decisions D6/D7/D12/D13.
  Acceptance criteria: unit tests cover MemoryJobStore and FirestoreJobStore serialization logic for user job, anonymous job, expired download, 30-day metadata, upload session initiate/complete mismatch, deleted tombstone hidden from user list, and worker no-op on deleted job.
  QA scenarios: `pnpm --filter api test -- src/services/job-store.auth.test.ts | Tee-Object .omo/evidence/task-3-auth-history-delete-board-final.md`; fallback to `pnpm --filter api test`. Expected: user/anonymous jobs serialize, UploadSession mismatch fails, expired downloads clear, deleted tombstone hidden from list.
  Commit: N | feat(api): add owner-aware job store

- [x] 4. Storage deletion and protected download boundary
  What to do / Must NOT do: Add idempotent local/GCS delete helpers for original and result objects. Decide and implement protected download strategy: either API proxy endpoint after auth/token verification or signed URL minted only after verification with very short TTL. Update `JobStatusResponse` behavior so anonymous/member status does not expose reusable `downloadUrl` before access verification. Must NOT keep unconditional signed URL in public status response.
  Parallelization: Wave 1 | Blocked by: 1 | Blocks: 5,6,7,10
  References: `apps/api/src/services/storage-service.ts`, `apps/api/src/routes/v1.ts`, `packages/shared/src/index.ts`, Metis warning about `downloadUrl` conflict, deployment GCS signed URL env `SIGNED_DOWNLOAD_URL_TTL_MINUTES`.
  Acceptance criteria: tests show header-less anonymous status/download does not return usable URL; correct `X-Job-Access-Token` or member auth can download; GCS/local delete helpers are idempotent and do not leak object paths in errors.
  QA scenarios: `pnpm --filter api test -- src/services/storage-service.delete.test.ts src/routes/v1.download-auth.test.ts | Tee-Object .omo/evidence/task-4-auth-history-delete-board-final.md`; fallback to full API tests. Expected: no-token anonymous download/status fails, wrong-token fails, correct token/member owner succeeds, status does not expose unconditional reusable signed URL, repeated file delete succeeds.
  Commit: N | feat(api): protect downloads and delete stored files

- [x] 5. Upload initiate/complete/status ownership API
  What to do / Must NOT do: Update `POST /v1/uploads/initiate`, `POST /v1/uploads/complete`, `POST /v1/upload`, and `GET /v1/jobs/:jobId` to use optional auth, server UploadSession, owner binding, anonymous token issuance, `X-Job-Access-Token` verification, GCS object existence/size sanity checks where practical, and `API_ROUTES` constants. Must NOT trust client-provided `objectPath` merely by prefix.
  Parallelization: Wave 2 | Blocked by: 1,2,3,4 | Blocks: 6,7,10
  References: `apps/api/src/routes/v1.ts` lines around initiate/complete/upload/jobs/results, `apps/api/src/middleware/upload.ts`, `apps/api/src/services/job-store.ts`, `apps/api/src/services/storage-service.ts`, `packages/shared/src/index.ts`, decisions D5/D6/D13.
  Acceptance criteria: tests cover anonymous initiate returns `jobId + accessToken` once; complete requires matching UploadSession; wrong user/token complete fails; status without token fails; status with token succeeds; member job status requires owner auth; public `jobId` only no longer works.
  QA scenarios: `pnpm --filter api test -- src/routes/v1.upload-ownership.test.ts | Tee-Object .omo/evidence/task-5-auth-history-delete-board-final.md`; fallback to full API tests. Expected: anonymous initiate 201 with `jobId/accessToken`; complete without matching UploadSession 403/404; status without header 401/403; wrong header 403/404; correct header 200; member job queried by other member 403.
  Commit: N | feat(api): enforce upload ownership

- [x] 6. Cloud Tasks HTTP worker and conversion dispatcher
  What to do / Must NOT do: Add Cloud Tasks enqueue service and internal worker endpoint. Replace production `void convertJobToPdf(...)` dispatch in route handlers with enqueue. Worker verifies OIDC service account token/audience, claims/locks queued jobs idempotently, runs LibreOffice conversion, publishes result, handles retryable vs terminal failures, no-ops completed/deleted/expired jobs, and records stuck-job recovery policy. Inline conversion may exist only as explicit local/dev fallback if documented and not production default.
  Parallelization: Wave 2 | Blocked by: 1,2,3,4,5 | Blocks: 10,13
  References: `apps/api/src/routes/v1.ts` current `void convertJobToPdf`, `apps/api/src/services/conversion-service.ts`, `apps/api/src/config.ts`, `apps/api/Dockerfile`, `.github/workflows/deploy-api-cloud-run.yml`, decision D4/D11, project memory 3746/3753.
  Acceptance criteria: tests cover enqueue on upload complete, worker OIDC missing/invalid rejected, retry duplicate does not double-convert, completed/deleted job no-op, failed conversion updates status with safe message, Cloud Tasks env missing produces explicit config error. No production path directly calls conversion from upload route.
  QA scenarios: `pnpm --filter api test -- src/services/cloud-tasks-dispatcher.test.ts src/routes/v1.worker.test.ts | Tee-Object .omo/evidence/task-6-auth-history-delete-board-final.md`; fallback to full API tests. Expected: upload complete enqueues once, worker endpoint without valid OIDC rejected, duplicate task no-ops after completed/deleted state, no production upload route calls `convertJobToPdf` directly.
  Commit: N | feat(api): add cloud tasks conversion worker

- [x] 7. Member history and deletion API
  What to do / Must NOT do: Add `GET /v1/me/jobs`, `GET /v1/me/jobs/:jobId`, and member-only delete endpoint. History returns only current user's non-deleted jobs by default, shows download expired state after `downloadExpiresAt`, and hides tombstones. Delete attempts file deletion, clears download/object paths, redacts filename if required, sets tombstone for 30 days, and returns idempotent success. Processing delete policy must be explicit, preferably 409 unless cancellable flag is implemented.
  Parallelization: Wave 2 | Blocked by: 2,3,4,5 | Blocks: 11,13
  References: `apps/api/src/routes/v1.ts`, `apps/api/src/services/job-store.ts`, `apps/api/src/services/storage-service.ts`, `packages/shared/src/index.ts`, decisions D7/D12.
  Acceptance criteria: A회원 sees only A jobs; B회원 gets 403 for A job; deleted job hidden from history; repeated delete succeeds/no-ops; processing delete returns documented 409 or sets documented cancellation flag; tombstone contains no downloadUrl/objectPath secrets.
  QA scenarios: `pnpm --filter api test -- src/routes/v1.member-jobs.test.ts | Tee-Object .omo/evidence/task-7-auth-history-delete-board-final.md`; fallback to full API tests. Expected: unauthenticated `/v1/me/jobs` 401; owner list 200 only own jobs; other user job detail/delete 403; delete 200 then hidden from list; repeat delete 200/no-op; processing delete returns documented 409 unless cancellation is implemented.
  Commit: N | feat(api): add member history and deletion

- [x] 8. Members-only board API and permission matrix
  What to do / Must NOT do: Add board routes and persistence layer for posts. Validate title/body/category/pageSize. Server derives authorId/authorName from token/profile, not client input. Custom claims enforce notice/admin and moderator behavior. Store plain text or safely rendered markdown only; do not use `dangerouslySetInnerHTML` without sanitization. Rate limiting/moderation delete behavior must be explicit.
  Parallelization: Wave 2 | Blocked by: 1,2,3 | Blocks: 12,13
  References: `apps/api/src/app.ts`, `apps/api/src/routes/v1.ts`, `apps/api/src/services/job-store.ts` style for Firestore access, `packages/shared/src/index.ts`, decision D8.
  Acceptance criteria: tests cover anonymous read/write denied if member-only read chosen, normal member can create general/qna, normal member cannot create notice, author spoof rejected/ignored, owner can edit/delete own post, non-owner cannot, admin/moderator claims can moderate according to contract.
  QA scenarios: `pnpm --filter api test -- src/routes/v1.board.test.ts | Tee-Object .omo/evidence/task-8-auth-history-delete-board-final.md`; fallback to full API tests. Expected: anonymous board write denied; member creates general/qna; member notice create denied; author spoof input ignored/rejected; non-owner edit/delete denied; admin/moderator claim performs documented moderation action.
  Commit: N | feat(api): add member board routes

- [x] 9. Web Firebase auth shell and navigation
  What to do / Must NOT do: Add Firebase client SDK, env typing, `AuthProvider`/`useAuth`, login/signup/logout pages, route/navigation updates, and API client that attaches Firebase ID token via `Authorization: Bearer`. Read installed Next.js 16.2.9 docs before choosing server/client component boundaries. Must NOT put Firebase secrets in client env; only `NEXT_PUBLIC_FIREBASE_*` public config.
  Parallelization: Wave 3 | Blocked by: 1,2 | Blocks: 10,11,12
  References: `apps/web/package.json`, `apps/web/src/app/layout.tsx`, `apps/web/src/components/PageLayout.tsx`, `apps/web/AGENTS.md`, `apps/web/tsconfig.json`, `apps/web/.env.local`.
  Acceptance criteria: web tests cover login/signup form rendering, authenticated nav state, logout state, API client adds Authorization for authenticated calls and not for anonymous calls. `pnpm --filter web test` passes.
  QA scenarios: `pnpm --filter web test -- src/auth/AuthProvider.test.tsx src/lib/api-client.auth.test.ts | Tee-Object .omo/evidence/task-9-auth-history-delete-board-final.md`; fallback to `pnpm --filter web test`. Expected: login/signup/logout states render, authenticated API calls include Authorization bearer, anonymous calls omit bearer, evidence names installed Next docs consulted.
  Commit: N | feat(web): add firebase auth shell

- [x] 10. Upload UI anonymous token handling and durable conversion UX
  What to do / Must NOT do: Update `DropzoneUploader` or split it if responsibility becomes too large. Store anonymous `accessToken` only in memory/session storage as appropriate, attach `X-Job-Access-Token` on status/download calls, handle token loss with clear UX, remove assumptions that jobId alone is sufficient, show queued/processing states compatible with Cloud Tasks, and avoid exposing tokens in URLs. Must NOT overload existing React `uploadSessionRef` terminology with server `UploadSession` without clear naming.
  Parallelization: Wave 3 | Blocked by: 5,6,9 | Blocks: 13
  References: `apps/web/src/components/DropzoneUploader.tsx`, `packages/shared/src/index.ts`, `apps/web/src/app/page.tsx`, decisions D5/D6/D11/D13.
  Acceptance criteria: web tests mock anonymous upload response, verify status fetch sends `X-Job-Access-Token`, verify URL/query does not contain token, verify login upload sends Firebase auth not anonymous header unless API returns anonymous token, verify queued/processing/completed/error UI.
  QA scenarios: `pnpm --filter web test -- src/components/DropzoneUploader.auth.test.tsx | Tee-Object .omo/evidence/task-10-auth-history-delete-board-final.md`; fallback to full web tests. Expected: mocked anonymous upload stores token outside URL, status polling sends `X-Job-Access-Token`, wrong/missing token UI error path renders, queued/processing/completed states render, logged-in flow sends Authorization.
  Commit: N | feat(web): secure anonymous upload polling

- [x] 11. Web history and member delete UI
  What to do / Must NOT do: Add member history page that requires login, lists only authenticated user's jobs, distinguishes active download vs expired download, supports delete with confirmation, hides deleted jobs after success, and handles 401/403 gracefully. Must NOT expose tombstone internals in normal user history.
  Parallelization: Wave 3 | Blocked by: 7,9 | Blocks: 13
  References: `apps/web/src/app/page.tsx`, `apps/web/src/components/PageLayout.tsx`, new API from Todo 7, privacy copy decision D7/D12.
  Acceptance criteria: web tests cover unauthenticated redirect/message, authenticated history load, expired download label, delete confirmation, delete API Authorization header, deleted row removal.
  QA scenarios: `pnpm --filter web test -- src/app/history/history-page.test.tsx | Tee-Object .omo/evidence/task-11-auth-history-delete-board-final.md`; fallback to full web tests. Expected: unauthenticated state prompts login, authenticated list renders own jobs, expired download label appears, delete confirmation calls API with Authorization, deleted row disappears.
  Commit: N | feat(web): add conversion history UI

- [x] 12. Web board UI
  What to do / Must NOT do: Add board list/detail/create/edit pages. Read/write gated by auth according to API contract. Hide notice creation controls unless `admin` claim is present; handle moderator/admin action UI. Store/display plain text safely. Must NOT trust client role as authority; UI gating is convenience only.
  Parallelization: Wave 3 | Blocked by: 8,9 | Blocks: 13
  References: `apps/web/src/app`, `apps/web/src/components/PageLayout.tsx`, board shared DTOs from Todo 1, API routes from Todo 8, decision D8.
  Acceptance criteria: tests cover unauthenticated board access behavior, member create general/qna, admin notice control visible only with claim, author cannot be edited in form, edit/delete controls match ownership/admin state.
  QA scenarios: `pnpm --filter web test -- src/app/board/board-page.test.tsx | Tee-Object .omo/evidence/task-12-auth-history-delete-board-final.md`; fallback to full web tests. Expected: unauthenticated access handled per API contract, member can compose general/qna, notice controls hidden without admin claim, author field not editable, owner/admin/moderator controls match mocked claims.
  Commit: N | feat(web): add member board UI

- [x] 13. Deployment, smoke, docs, and session artifact
  What to do / Must NOT do: Update deployment workflows/env docs for Firebase client env, Firebase Admin ADC/IAM, Cloud Tasks queue/region/service account/OIDC audience, Firestore TTL/cleanup, GCS lifecycle. Expand `scripts/smoke-api.mjs` for health, anonymous upload initiate token, token-required status, worker endpoint auth rejection, member-protected endpoint rejection without auth. Overwrite `docs/plan/auth-history-delete-board-roadmap.md` with the finalized human-facing plan content and update `docs/INDEX.md`. After successful code/config changes, write `docs/sessions/YYYYMMDD_HHMMSS_auth-history-delete-board.md`. Must NOT put real secrets/tokens in docs or evidence.
  Parallelization: Wave 4 | Blocked by: 6,7,8,10,11,12 | Blocks: final verification
  References: `.github/workflows/deploy-api-cloud-run.yml`, `.github/workflows/deploy-web-vercel.yml`, `apps/api/Dockerfile`, `scripts/smoke-api.mjs`, `docs/DEPLOYMENT_GUIDE.md`, `docs/USER_SETUP_CHECKLIST.md`, `docs/operations/api-cloud-run-runtime.md`, `docs/plan/auth-history-delete-board-roadmap.md`, `docs/INDEX.md`, `AGENTS.md` documentation rule.
  Acceptance criteria: workflows contain required non-secret env/secret names; smoke script runs against a local/test API without requiring real Firebase credentials unless explicitly skipped with documented reason; docs plan and index updated; session doc written after successful verification.
  QA scenarios: `pnpm -r build | Tee-Object .omo/evidence/task-13-build-auth-history-delete-board-final.md`; `pnpm -r test | Tee-Object .omo/evidence/task-13-test-auth-history-delete-board-final.md`; start local API using the documented package script, then `node scripts/smoke-api.mjs http://localhost:<port> | Tee-Object .omo/evidence/task-13-smoke-auth-history-delete-board-final.md`. Expected smoke assertions: `/health` 200, anonymous initiate returns access token, status without token 401/403, worker endpoint without OIDC 401/403, member endpoint without auth 401. If local API cannot run due to missing external dependencies, document exact blocker and run mock/fake smoke tests instead.
  Commit: N | docs(deploy): document auth queue rollout

## Final verification wave

> Runs in parallel after ALL todos. ALL must APPROVE. Surface results and wait for the user's explicit okay before declaring complete.

- [x] F1. Plan compliance audit
  - Verify every D1-D13 decision is implemented or explicitly deferred with user-approved rationale.
  - Check no server password DTO/refresh endpoint exists.
  - Check no jobId-only status/download leak remains.
  - Evidence: `.omo/evidence/final-plan-compliance-auth-history-delete-board-final.md`.

- [x] F2. Code quality/security review
  - Run `ocr review | Tee-Object .omo/evidence/final-ocr-auth-history-delete-board-final.md`.
  - Run one independent review pass through the available OpenCode review mechanism. Preferred if available: invoke the review-work workflow against the final diff with goal "auth/history/delete/board implementation security and plan compliance" and save output to `.omo/evidence/final-independent-review-auth-history-delete-board-final.md`. If no review workflow/subagent is available in the worker environment, run `git diff --check`, `pnpm -r build`, all package tests, and a manual checklist against F1/F3/F4, then explicitly record the unavailable review mechanism and fallback evidence.
  - Focus: token leakage, ownership bypass, worker endpoint auth, Firestore Admin/Rules misunderstanding, signed URL bypass, tombstone privacy.
  - Evidence: `.omo/evidence/final-code-quality-auth-history-delete-board-final.md`.

- [x] F3. Real operational QA
  - Agent-run local verification command set: `pnpm -r build`, all package tests, local API start with the documented script, and `node scripts/smoke-api.mjs http://localhost:<port>`.
  - Required observed outcomes: anonymous upload/status with token succeeds; missing/wrong token fails; member endpoint without auth fails; worker endpoint without OIDC fails; board write without auth fails; fake/mock member owner and admin scenarios pass in tests.
  - If real Cloud Tasks/GCP/Vercel staging is unavailable, document exactly which real-cloud behavior was not verified and run local fake/mocked equivalents with evidence.
  - Evidence: `.omo/evidence/final-operational-qa-auth-history-delete-board-final.md`.

- [x] F4. Scope fidelity and docs review
  - Verify only requested feature areas and required supporting docs/config changed.
  - Verify `docs/sessions/...` and `docs/INDEX.md` are present and accurate.
  - Verify privacy/terms/home FAQ reflect member metadata 30 days, tombstone disclosure, anonymous TTL deletion, and token-based anonymous access.
  - Evidence: `.omo/evidence/final-scope-docs-auth-history-delete-board-final.md`.

## Commit strategy

- Do not commit automatically unless the user explicitly asks.
- Recommended commit split if/when user asks to commit:
  1. `feat(shared): add auth-aware conversion contracts`
  2. `feat(api): secure job ownership and conversion worker`
  3. `feat(api): add member history deletion and board`
  4. `feat(web): add auth history upload and board UI`
  5. `docs: document auth queue rollout`
- Before committing: inspect `git status`, `git diff`, `git log --oneline -10`; stage only intended files; never stage secrets/evidence containing tokens.

## Success criteria

- Anonymous users can still convert without logging in, but can only poll/download with `jobId + X-Job-Access-Token`.
- Logged-in users can convert, see their own 30-day metadata history, and delete their own files/history entries.
- Deleted member jobs are hidden from history, files are deleted/best-effort removed, and tombstones remain for at most 30 days without sensitive file paths/download URLs.
- Conversion no longer relies on in-process `void convertJobToPdf(...)` in production; Cloud Tasks HTTP worker performs conversion with authenticated internal endpoint and idempotent state transitions.
- Board is member-only and server-enforced; admin/boardModerator behavior comes from Firebase custom claims.
- API/security/worker tests cover success and failure boundaries; UI tests cover login/history/upload token/board basics.
- Deployment docs/workflows describe required Firebase, Cloud Tasks, Firestore, GCS lifecycle, and Vercel env settings.
- `pnpm -r build`, relevant test suites, smoke checks, and final reviews pass or any unverified operational dependency is explicitly documented.
