# HWP2PDF Documentation Index

This folder is the project documentation entry point for future OpenCode sessions. Prefer verified executable sources when these docs drift.

## Start here

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

- GCS original/result persistence and Firestore job polling state are implemented, but actual GCP integration requires Cloud Run service account credentials, a private GCS bucket, and Firestore enabled in the target project.
- LibreOffice is not installed in the current Windows development environment, so local surface QA verifies the clear converter configuration failure path rather than successful PDF output.
- Docker image build and successful HWP-to-PDF conversion still need verification in Docker/GCP because Docker CLI is unavailable locally.

## Session notes

- `sessions/20260613_030400_api-backend-mvp.md` - created the Express/TypeScript API MVP with upload, job status, rate limiting, and LibreOffice command boundary.
- `sessions/20260613_041500_frontend-api-upload-polling.md` - connected the active frontend uploader to the API upload and job polling flow.
- `sessions/20260613_043000_api-cloud-run-runtime.md` - added API Docker/Cloud Run runtime packaging and deployment documentation.
- `sessions/20260613_181757_api-gcs-storage-boundary.md` - added configurable GCS original/result persistence and signed result URLs.
- `sessions/20260613_190000_firestore-job-store-deploy.md` - added Firestore-backed job state, Cloud Run/Vercel deployment workflows, and GCS lifecycle config.
