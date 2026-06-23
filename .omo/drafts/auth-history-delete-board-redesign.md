# auth-history-delete-board-redesign draft

status: interviewing
intent: clear
request: 기존 `docs/plan/auth-history-delete-board-roadmap.md`를 사용자가 원하는 기능 기준으로 다시 만들기. 사용자가 결정해야 할 것은 하나씩 질문한다.

## Components ledger

- C1 Auth foundation: Firebase Client SDK 로그인/회원가입 + API Firebase Admin/ADC 토큰 검증. status=grounded. evidence=`docs/plan/auth-history-delete-board-roadmap.md`, `apps/api/package.json`, `apps/web/package.json`.
- C2 Job ownership and upload sessions: 회원/익명 job 소유권 분리, direct upload initiate/complete 사이 UploadSession 저장. status=needs-user-decisions. evidence=`apps/api/src/routes/v1.ts`, `apps/api/src/services/job-store.ts`, `packages/shared/src/index.ts`.
- C3 Job status/history/delete: 회원 이력, 공개 job 조회 제한, 파일 삭제와 이력 삭제 분리, processing 삭제 정책. status=needs-user-decisions. evidence=`apps/api/src/routes/v1.ts`, `apps/api/src/services/storage-service.ts`, `apps/api/src/services/conversion-service.ts`.
- C4 Durable conversion: 현재 in-process `void convertJobToPdf`와 Cloud Run 운영 보장 사이의 차이를 해소할지 결정. status=needs-user-decision. evidence=`apps/api/src/routes/v1.ts`, `apps/api/src/services/conversion-service.ts`.
- C5 Members-only board: 회원-only read/write, admin notice, author spoofing 방지, validation/sanitization. status=needs-user-decisions. evidence=`docs/plan/auth-history-delete-board-roadmap.md`.
- C6 Deployment/policy/docs: Cloud Run/Vercel/Firebase env, IAM, privacy/terms/home FAQ 반영. status=grounded-with-open-decisions. evidence=`AGENTS.md`, project memories, existing roadmap.

## Decisions ledger

- D1 Auth approach: adopt Firebase Client SDK for web login/signup and API token verification only; remove server password DTO/refresh endpoint from the revised plan. Rationale: Firebase Auth handles email/password and refresh on client; API should not receive passwords.
- D2 Firestore security boundary: adopt Express API authorization as primary boundary; Firestore Rules are defense-in-depth/default-deny unless a future direct-client Firestore feature is explicitly chosen. Rationale: current API uses server Firestore SDK.
- D3 Firebase Admin credentials: adopt Cloud Run ADC/service account as production default; private key env only as non-GCP/local fallback if needed. Rationale: current GCP clients already use ADC-style runtime auth.
- D4 Durable conversion guarantee: user selected A안. Revised plan must include Cloud Tasks or Pub/Sub worker now, not defer it. Upload completion creates/persists queued job and enqueues durable conversion work; worker handles LibreOffice conversion, retry/idempotency/stuck-job recovery, GCS result publish, and Firestore status updates.
- D5 Anonymous deletion: user selected A안. Anonymous/non-member jobs do not support direct user-initiated deletion in MVP; they rely on short retention/TTL/GCS lifecycle cleanup. Direct file/history deletion is a logged-in member feature only.
- D6 Anonymous status/download access: user selected A안. Anonymous/non-member job status and download access require `jobId + accessToken`; `jobId` alone is no longer sufficient. Access token is issued at upload/initiate time, stored server-side only as a hash, and sent by the client on status/download-related API calls.
- D7 Member history retention: user selected A안. Files remain short-lived according to retention/lifecycle policy; member history metadata is retained for 30 days. After file/download expiry, history shows an expired/unavailable state. User deletion removes files and hides/deletes the history entry according to the plan's chosen tombstone strategy.
- D8 Board admin model: user selected A안. Use Firebase custom claims for `admin`/`boardModerator` authority. Normal members may read board and write `general`/`qna`; admins can create/manage `notice`; admins/moderators can moderation-delete posts. API verifies claims server-side after Firebase ID token verification.
- D9 Plan output target: user chose dual output. Generate the executable worker plan under `.omo/plans/` and include a todo for the worker to save the same finalized human-facing plan content under `docs/plan/` as well. The docs/plan artifact should supersede the old roadmap and `docs/INDEX.md` must be updated accordingly during implementation.
- D10 Test strategy: user selected C안. Use TDD for core security/API/worker logic (auth middleware, optional auth, ownership, UploadSession, public/member job access split, deletion authorization, board role/author checks, worker idempotency/retry). Use tests-after for UI pages/components and copy/policy rendering, while still requiring agent-executed QA for every todo.
- D11 Durable queue technology: user selected A안 Cloud Tasks HTTP queue. Plan should enqueue one task per completed upload/job and use an internal authenticated HTTP worker endpoint (OIDC service account token verification) to process conversion by `jobId`, with idempotency and retry/backoff/dead-letter handling.
- D12 Deletion metadata: user selected A안. Member delete immediately removes original/result files and hides the job from member history, but leaves a minimal tombstone for up to 30 days (`status: "deleted"`, `deletedAt`, `deletedBy`, redacted filename/object paths/downloadUrl). This supports idempotent deletes, delayed Cloud Tasks worker no-op behavior, and audit/debugging. Privacy copy must disclose short-lived tombstone metadata.
- D13 Anonymous token transport: user selected A안. Anonymous job access token must be sent via dedicated `X-Job-Access-Token` header. Firebase ID tokens remain in `Authorization: Bearer <idToken>`. Query-string token transport is explicitly rejected because it leaks into browser history/logs/referrers.

## Evidence ledger

- E1 Background surface map: background explorer confirmed no existing auth/board/history/delete implementation in `apps/**` or `packages/**`; key surfaces are `apps/api/src/routes/v1.ts`, `apps/api/src/services/{job-store,storage-service,conversion-service}.ts`, `apps/api/src/config.ts`, `packages/shared/src/index.ts`, `apps/web/src/components/DropzoneUploader.tsx`, `apps/web/src/components/PageLayout.tsx`, deployment workflows under `.github/workflows/`, `apps/api/Dockerfile`, and `scripts/smoke-api.mjs`. Plan must explicitly replace `void convertJobToPdf(...)` in `routes/v1.ts` with Cloud Tasks enqueue and add new contracts/routes/tests/deployment envs.
- E2 Background risk review: reviewer flagged plan requirements: anonymous `accessToken` contract must specify transport and response exposure; `UploadSession` must bind initiate→complete→status; Cloud Tasks worker must define idempotency/retry/stuck job handling; JobStore must support user listing/token lookup/delete/tombstone; `downloadExpiresAt` and 30-day `metadataExpiresAt` must be split; GCS/local deletion helpers must be added; custom claim name and board admin behavior must be fixed; Firebase Auth tests must not require real credentials in CI.

## Open user decisions, asked one at a time

- Q1 Durable conversion guarantee: decide whether the revised implementation plan should include Cloud Tasks/Pub/Sub worker now, or keep current in-process conversion as MVP with explicit limitation.
- Q2 Anonymous deletion: decide whether non-member jobs get direct delete via token or rely on TTL/lifecycle only.
- Q3 Anonymous status access: decide whether anonymous status/download requires access token or remains jobId-only for compatibility.
- Q4 History retention: decide metadata retention period and deletion semantics for member history.
- Q5 Board admin model: decide Firebase custom claims vs Firestore user roles, and notice/admin scope.
- Q6 Plan output target: decide whether to replace `docs/plan/auth-history-delete-board-roadmap.md` later in implementation or create a new superseding plan document. The `.omo` execution plan will be generated after approval.

## Current interview position

Q1 answered: A안. Q2 answered: A안. Q3 answered: A안. Q4 answered: A안. Q5 answered: A안. Q6 answered: dual output to `.omo/plans/` and `docs/plan/`. Q7 answered: C안 mixed TDD/tests-after. Q8 answered: A안 Cloud Tasks. Q9 answered: A안 minimal tombstone. Q10 answered: A안 dedicated `X-Job-Access-Token` header.

## Approval gate

status: awaiting-approval
pending action: run `node "C:\Users\U-N-00658\.opencode\node_modules\oh-my-openagent\dist\skills\ulw-plan\scripts\scaffold-plan.mjs" auth-history-delete-board-redesign --clear`, then write the decision-complete execution plan under `.omo/plans/auth-history-delete-board-redesign.md`. The implementation plan must also include a worker todo to overwrite `docs/plan/auth-history-delete-board-roadmap.md` with the same final plan content and update `docs/INDEX.md`.
approach: use the finalized D1-D13 decisions and E1-E2 evidence. Scope is Firebase Auth, user/anonymous job ownership, UploadSession, Cloud Tasks HTTP worker, member history, member deletion with 30-day tombstone, anonymous token-gated status/download via `X-Job-Access-Token`, members-only board with Firebase custom claims, deployment/policy/docs, and TDD-first core security/API/worker tests with UI tests after implementation.
