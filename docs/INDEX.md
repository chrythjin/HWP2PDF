# HWP2PDF Documentation Index

This folder is the project documentation entry point for future OpenCode sessions. Prefer verified executable sources when these docs drift.

## Start here

- `DEPLOYMENT_GUIDE.md` - step-by-step beginner-friendly deployment guide (GCP + Cloud Run + Vercel, ~1.5 hours).
- `USER_SETUP_CHECKLIST.md` - plain-language checklist of external account, secret, deployment, and policy tasks the user must prepare.
- `operations/api-cloud-run-runtime.md` - current API Docker/Cloud Run runtime, storage, job store, and deployment contract.
- `../AGENTS.md` - compact repo-specific operating guide for agents.
- `superpowers/specs/HWP2PDF-Blueprint.md` - original full product and architecture blueprint.
- `superpowers/specs/HWP2PDF-Plan-v1.md` - original full implementation plan.
- `sessions/` - dated session notes for completed implementation or documentation changes.

## Verified repository shape

- Root package: pnpm workspace named `hwp2pdf`.
- Frontend: `apps/web`, package name `web`, Next.js 16.2.9.
- Backend API: `apps/api`, package name `api`, Express + TypeScript conversion API.
- Shared package: `packages/shared`, package name `@hwp2pdf/shared`.

## Verified commands

- `pnpm -r build` passed on 2026-06-13 and builds `packages/shared`, `apps/api`, and `apps/web`.
- `pnpm --filter api build` passed on 2026-06-13.

## Current known gaps

- GCS original/result persistence, direct signed browser uploads, and Firestore job polling state are implemented, but actual GCP integration requires Cloud Run service account credentials, a private GCS bucket, bucket CORS, and Firestore enabled in the target project.
- LibreOffice is not installed in the current Windows development environment, so local surface QA verifies the clear converter configuration failure path rather than successful PDF output.
- Docker image build and successful HWP-to-PDF conversion still need verification in Docker/GCP because Docker CLI is unavailable locally.
- The Vercel frontend project at `https://hwp2pdf-phi.vercel.app` previously served `404 NOT_FOUND` and then a rate-limit error on `/v1/uploads/complete`; both were resolved by correcting Vercel project settings / `vercel.json` and by adding a Cloud Run-aware `keyGenerator` to `express-rate-limit`. See `sessions/20260619_235000_vercel-404-and-rate-limit-fix.md`.
- Cloud Run HWP→PDF conversion was verified end-to-end (initiate, GCS upload, complete, job polling, PDF download) after fixing LibreOffice JRE, H2Orestart extension registration, rate-limit `ipKeyGenerator` validation, and LibreOffice `-env:UserInstallation` syntax. Warm-up profile in `/app/.lo-profile` reduced conversion time from ~112s to ~92s. See `sessions/20260620_010000_hwp-conversion-cloud-run-fix.md`.

## Session notes

- `sessions/20260613_030400_api-backend-mvp.md` - created the Express/TypeScript API MVP with upload, job status, rate limiting, and LibreOffice command boundary.
- `sessions/20260613_041500_frontend-api-upload-polling.md` - connected the active frontend uploader to the API upload and job polling flow.
- `sessions/20260613_043000_api-cloud-run-runtime.md` - added API Docker/Cloud Run runtime packaging and deployment documentation.
- `sessions/20260613_181757_api-gcs-storage-boundary.md` - added configurable GCS original/result persistence and signed result URLs.
- `sessions/20260613_190000_firestore-job-store-deploy.md` - added Firestore-backed job state, Cloud Run/Vercel deployment workflows, and GCS lifecycle config.
- `sessions/20260613_191700_job-expiry-download-gate.md` - added job retention metadata and job-aware local result download expiry enforcement.
- `sessions/20260613_193000_direct-gcs-upload.md` - added direct browser-to-GCS upload flow, fallback behavior, smoke script, CORS config, and user setup checklist.
- `sessions/20260613_201000_deployment-workflow-preflight.md` - added deployment workflow preflight gates so missing GCP/Vercel secrets skip deployment instead of failing pushes.
- `sessions/20260615_020400_test-infra-shared-validation.md` - added Vitest infrastructure, baseline tests, and shared validation refactor coverage.
- `sessions/20260618_155921_deployment-guide.md` - added beginner-friendly end-to-end deployment guide (GCP + Cloud Run + Vercel) and surfaced it in the start-here list.
- `sessions/20260619_000000_graphify-rebuild-semantic-extraction.md` - rebuilt knowledge graph: 38→204 nodes, 27→251 edges, 61 communities (76% extracted, 23% inferred). Re-extracted missing chunk_02 (22 files) and chunk_09 (window.svg), manually merged all 9 sem.json chunks, ran graphify cluster-only.
- `sessions/20260619_231500_cloud-run-vercel-deploy.md` - completed GCP Cloud Run and Vercel production deployments, fixed Artifact Registry IAM issues, resolved Docker LibreOffice JRE extension errors, and resolved Vercel Routing/Redeploy configurations.
- `sessions/20260619_232000_vercel-404-diagnosis.md` - diagnosed live `404 NOT_FOUND` on `https://hwp2pdf-phi.vercel.app`; verified Cloud Run API is healthy and identified missing/correct Vercel project settings and GitHub Actions secrets as the root cause.
- `sessions/20260620_010000_hwp-conversion-cloud-run-fix.md` - fixed LibreOffice JRE, H2Orestart registration, rate-limit keyGenerator validation, and LibreOffice UserInstallation syntax; verified HWP→PDF conversion end-to-end on Cloud Run.
- `sessions/20260619_235000_vercel-404-and-rate-limit-fix.md` - fixed Vercel 404 by adding `apps/web/vercel.json`, aligning branch and dashboard settings, and fixed Cloud Run `500` on `/v1/uploads/complete` by adding a Cloud Run-aware `keyGenerator` to `express-rate-limit`.

