# Session: auth-history-delete-board Deployment, Smoke, Docs (Todo 13)

**Date:** 2026-06-23
**Task:** Todo 13 of `.omo/plans/auth-history-delete-board-final.md` — Deployment, smoke, docs, and session artifact
**Status:** Complete

## Summary

Finalized deployment workflows, expanded the smoke test script, verified deployment docs, wrote the human-facing roadmap, updated the docs index, and wrote evidence + session artifacts for the auth-history-delete-board feature plan.

This was a retry after a prior attempt was aborted. The prior attempt had already populated most artifacts (workflows, docs, roadmap, INDEX). This retry completed the missing pieces: the session doc, evidence files, smoke script fix for local-mode fallback, and full verification.

## Files Modified

### `scripts/smoke-api.mjs`
- Updated Test 2 (anonymous upload) to handle both GCS mode (201 from `/v1/uploads/initiate`) and local mode (409 from initiate → fallback to multipart `POST /v1/upload` returning 202 with `jobId + accessToken`).
- The smoke script now passes 10/10 in live mode against a local mock API and 6/6 in `--mock` mode.

## Files Verified (already populated by prior attempt)

### `.github/workflows/deploy-api-cloud-run.yml`
- Contains Firebase Admin env: `FIREBASE_PROJECT_ID`, `FIREBASE_ADMIN_MODE=adc`.
- Contains Cloud Tasks env: `CLOUD_TASKS_QUEUE_NAME`, `CLOUD_TASKS_LOCATION`, `CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL`, `INTERNAL_WORKER_URL`, `INTERNAL_WORKER_AUDIENCE`, `CONVERSION_DISPATCHER=cloud-tasks`.
- Contains Firestore collection env: `FIRESTORE_JOBS_COLLECTION`, `FIRESTORE_BOARD_POSTS_COLLECTION`.
- Grants Cloud Tasks Enqueuer and Cloud Run Invoker IAM roles.

### `.github/workflows/deploy-web-vercel.yml`
- Syncs `NEXT_PUBLIC_FIREBASE_*` variables (API_KEY, AUTH_DOMAIN, PROJECT_ID, STORAGE_BUCKET, MESSAGING_SENDER_ID, APP_ID) and `NEXT_PUBLIC_API_BASE_URL` to Vercel.

### `docs/DEPLOYMENT_GUIDE.md`
- Includes Firebase Authentication setup (Step 1-6), Cloud Tasks queue creation (Step 1-7), Cloud Tasks service account (Step 1-3-1), Firebase client env vars for Vercel, and IAM roles.

### `docs/USER_SETUP_CHECKLIST.md`
- Includes Firebase Authentication setup, Cloud Tasks worker service account, `CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL` secret, `CLOUD_RUN_WORKER_AUDIENCE` secret, `NEXT_PUBLIC_FIREBASE_*` variables, and Cloud Tasks queue creation.

### `docs/operations/api-cloud-run-runtime.md`
- Documents Firebase Admin authentication (ADC, service-account, mock modes), Cloud Tasks queue setup, worker endpoint OIDC security, Firestore TTL/cleanup, GCS lifecycle, and all runtime env vars.

### `docs/plan/auth-history-delete-board-roadmap.md`
- Finalized human-facing plan with 10 sections: TL;DR, current state, implemented features, API endpoints, env vars, IAM roles, security boundaries, data retention, verification criteria, and todo summary.

### `docs/INDEX.md`
- Roadmap entry and session entry already present.

## Files Created

### `.omo/evidence/task-13-build-auth-history-delete-board-final.md`
- Build evidence: `pnpm -r build` passes for all 3 packages.

### `.omo/evidence/task-13-test-auth-history-delete-board-final.md`
- Test evidence: 377 tests pass (41 shared + 278 api + 58 web).

### `.omo/evidence/task-13-smoke-auth-history-delete-board-final.md`
- Smoke evidence: mock mode 6/6, live mode 10/10.

### `docs/sessions/20260622_230000_auth-history-delete-board-deployment.md`
- This session doc.

## Verification

### Build
```
pnpm -r build
→ packages/shared: tsc Done
→ apps/api: tsc Done
→ apps/web: next build Done (12/12 pages)
```
Evidence: `.omo/evidence/task-13-build-auth-history-delete-board-final.md`

### Tests
```
pnpm -r test
→ @hwp2pdf/shared: 41 passed (2 files)
→ api: 278 passed (13 files)
→ web: 58 passed (6 files)
→ Total: 377 passed, 0 failed
```
Evidence: `.omo/evidence/task-13-test-auth-history-delete-board-final.md`

### Smoke Tests

**Mock mode:**
```
node scripts/smoke-api.mjs --mock
→ 6 passed, 0 failed
```

**Live mode** (API with `FIREBASE_ADMIN_MODE=mock`, `STORAGE_BACKEND=local`, `CONVERSION_DISPATCHER=inline`):
```
node scripts/smoke-api.mjs http://127.0.0.1:8090
→ 10 passed, 0 failed
```

Assertions verified:
1. `GET /health` → 200 with `status=ok`
2. Anonymous upload returns `jobId + accessToken` (via GCS initiate or local multipart fallback)
3. `GET /v1/jobs/:jobId` without `X-Job-Access-Token` → 401
4. `POST /internal/workers/convert` without OIDC → 401
5. `GET /v1/me/jobs` without auth → 401
6. `POST /v1/board/posts` without auth → 401
7. `POST /v1/upload` without file → 422

Evidence: `.omo/evidence/task-13-smoke-auth-history-delete-board-final.md`

## Key Decisions

- **Smoke script local-mode fallback:** The original smoke script expected `/v1/uploads/initiate` to always return 201. In local mode (`STORAGE_BACKEND=local`), initiate returns 409 `direct_upload_unavailable` because direct GCS upload is not available. Updated the script to fall back to multipart `POST /v1/upload` which returns 202 with `jobId + accessToken` for anonymous users. This allows the smoke script to pass in both GCS and local modes.
- **No real Firebase credentials required:** The live smoke test uses `FIREBASE_ADMIN_MODE=mock` which stubs Firebase token verification and accepts `mock_id_token_` prefixed tokens. No real Firebase project or credentials are needed.
- **Port 8090 used for local testing:** Port 8080 was occupied by another service (Bifrost). The API was started on port 8090 with `PORT=8090`.

## Not Verified

- Real GCP Cloud Run deployment with actual Firebase Auth, Cloud Tasks, Firestore, and GCS — requires user-provided GCP credentials and project setup.
- Real Vercel deployment with Firebase client env — requires user-provided Vercel project and Firebase config.
- End-to-end HWP→PDF conversion via Cloud Tasks worker — requires LibreOffice in the runtime environment.

These are documented in `docs/DEPLOYMENT_GUIDE.md` as user setup tasks.