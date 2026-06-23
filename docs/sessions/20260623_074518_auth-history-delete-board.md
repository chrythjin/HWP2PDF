# Session: auth-history-delete-board Todo 13 completion

**Date:** 2026-06-23 07:45:18
**Task:** Complete Todo 13 of `.omo/plans/auth-history-delete-board-final.md` — deployment, smoke, docs, and session artifact.
**Status:** Complete

## What changed

- Added `GOOGLE_APPLICATION_CREDENTIALS_JSON` as an optional Firebase Admin service-account fallback in the API config and Firebase Admin initialization path.
- Added `GOOGLE_APPLICATION_CREDENTIALS_JSON` to the Cloud Run deployment workflow as an optional secret-backed env var, while keeping `FIREBASE_ADMIN_MODE=adc` as the production default.
- Documented the ADC-first / inline service-account-key fallback behavior in `docs/operations/api-cloud-run-runtime.md`.
- Overwrote `docs/plan/auth-history-delete-board-roadmap.md` with the full `.omo/plans/auth-history-delete-board-final.md` plan content plus YAML frontmatter.
- Updated `docs/INDEX.md` with the requested `Design / planning` section and cross-links to the roadmap, runtime docs, and deployment workflows.
- Refreshed Todo 13 evidence files under `.omo/evidence/`.

## Files touched

- `.github/workflows/deploy-api-cloud-run.yml`
- `apps/api/src/config.ts`
- `apps/api/src/services/firebase-admin.ts`
- `docs/operations/api-cloud-run-runtime.md`
- `docs/plan/auth-history-delete-board-roadmap.md`
- `docs/INDEX.md`
- `.omo/evidence/task-13-build-auth-history-delete-board-final.md`
- `.omo/evidence/task-13-test-auth-history-delete-board-final.md`
- `.omo/evidence/task-13-smoke-auth-history-delete-board-final.md`
- `docs/sessions/20260623_074518_auth-history-delete-board.md`

## Verification performed

### Build

Command:

```powershell
pnpm -r build
```

Result: PASS. `packages/shared` and `apps/api` compiled with `tsc`; `apps/web` completed `next build` and generated 12/12 pages.

Evidence:

`.omo/evidence/task-13-build-auth-history-delete-board-final.md`

### Tests

Command:

```powershell
pnpm -r test
```

Result: PASS. 21 test files passed, 377 tests passed, 0 failed.

Evidence:

`.omo/evidence/task-13-test-auth-history-delete-board-final.md`

### Smoke

Port `8080` was already occupied by another local process, so the API was started on `8090` with local/mock settings:

```powershell
PORT=8090
FIREBASE_ADMIN_MODE=mock
CONVERSION_DISPATCHER=inline
JOB_STORE_BACKEND=memory
STORAGE_BACKEND=local
```

Command:

```powershell
node scripts/smoke-api.mjs http://127.0.0.1:8090
```

Result: PASS. 10 smoke assertions passed: `/health`, anonymous multipart fallback returning `jobId` + `accessToken`, missing anonymous status token rejection, worker endpoint OIDC rejection, unauthenticated member history rejection, unauthenticated board write rejection, and invalid multipart upload rejection.

Evidence:

`.omo/evidence/task-13-smoke-auth-history-delete-board-final.md`

## Known blockers / not verified

- Real Cloud Run deployment was not executed because live GCP credentials and project configuration are external to this local verification run.
- Real Cloud Tasks OIDC dispatch, Firestore persistence, and GCS signed upload/result lifecycle were not verified against a live cloud environment in this session.
- Real Vercel deployment and Firebase client env propagation were not executed because they require the configured Vercel project and secrets.
- Successful HWP-to-PDF conversion with LibreOffice/H2Orestart was not verified locally; local smoke uses API mock/local mode and verifies the request/authorization boundary.

## Rollback notes

- If inline service-account fallback is not desired, remove `GOOGLE_APPLICATION_CREDENTIALS_JSON` from `.github/workflows/deploy-api-cloud-run.yml` and remove the `googleApplicationCredentialsJson` config field plus fallback branch in `firebase-admin.ts`. ADC remains the preferred Cloud Run path.
- Deployment docs and roadmap/index changes are documentation-only and can be reverted independently from the API fallback wiring.

## Remaining risks

- Inline JSON credentials are more operationally sensitive than ADC. Keep `GOOGLE_APPLICATION_CREDENTIALS_JSON` unset for normal Cloud Run production and use it only as a fallback for non-GCP or break-glass environments.
- Cloud Tasks queue IAM and worker OIDC audience still require live-project validation before production rollout.
