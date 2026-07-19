# Session: T5 OIDC Maintenance + IAM Gate Resolution

**Date:** 2026-07-19
**Session:** code-frontend-improvement-final continuation
**Commits:** 81afb59 (T5 maintenance), preceding T1-T4/T6-T11 (prior sessions)

## What was done

### IAM Gate Resolution
- Root cause: `gcloud builds get-default-service-account` returned `130439872251-compute@developer.gserviceaccount.com` which does **not exist** in project `hwp2pdf-499911`.
- Actual Cloud Build execution service account: `hwp2pdf-runner@hwp2pdf-499911.iam.gserviceaccount.com`
- Correct SA discovered via `gcloud builds list` + `gcloud builds describe`
- IAM grant: `chryth.code@gmail.com` + `roles/iam.serviceAccountViewer` on `hwp2pdf-runner@hwp2pdf-499911.iam.gserviceaccount.com`
- `gcloud iam service-accounts describe` now returns 200 OK

### T5 Implementation Complete
- **Files added:**
  - `apps/api/src/middleware/maintenance-auth.ts` — Google OIDC token verification (audience/issuer/subject validation)
  - `apps/api/src/routes/maintenance.ts` — `POST /internal/maintenance/run` endpoint
  - `apps/api/src/services/maintenance-service.ts` — orchestration (recoverStaleProcessingJobs + collectCleanupSessions)
  - `apps/api/src/routes/maintenance.test.ts` — OIDC matrix tests (valid/invalid/no-token/wrong-audience/wrong-issuer/wrong-subject)
  - `apps/api/src/services/job-store.maintenance.test.ts` — Memory + Firestore transaction tests (bounded pagination, cursor, claim atomicity)
  - `cloudbuild.staging-maintenance.yaml` — staging Cloud Build config
- **Files modified:**
  - `apps/api/src/services/job-store.ts` — `CleanupDiagnostics` type, `classifyUploadCleanupCandidate`, bounded pagination with `scanned.length > limit` cursor logic, both Memory and Firestore parity
- **Staging deployment:**
  - Cloud Build: ID `daee3a35-bcee-4cf9-a5c7-55544590152e`, duration 3M37S ✓
  - Cloud Run: `hwp2pdf-maintenance-00007-lfl`, serving 100% traffic ✓
  - Auth test: `401 Unauthorized` for invalid token ✓

### Verification Results (all pass)
- `pnpm --filter @hwp2pdf/shared test`: 47/47 ✓
- `pnpm --filter api test`: 356/356 ✓
- `pnpm --filter web test`: 174/174 ✓
- `pnpm -r typecheck`: shared/api/web ✓
- `pnpm -r build`: shared+api+web ✓
- Forbidden pattern scan: 0 violations in T5 files ✓

### Remaining Work
- Cloud Scheduler job creation for production maintenance scheduling (requires user to create Scheduler job pointing to deployed endpoint with correct OIDC audience/subject)
- F1–F4 (Plan compliance / Code quality / Behavioral QA / Scope fidelity) — T5 now unblocked these

## Evidence
- Build ID: `daee3a35-bcee-4cf9-a5c7-55544590152e`
- Cloud Run: `https://hwp2pdf-maintenance-130439872251.asia-northeast3.run.app`
- Commit: `81afb59`
