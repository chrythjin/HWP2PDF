# 2026-06-13 API Cloud Run runtime packaging

## Summary

Added the first production-oriented runtime packaging surface for the Express conversion API.

## Changes

- Added `apps/api/Dockerfile` for a multi-stage Cloud Run image with LibreOffice, Korean fonts, and H2Orestart registration.
- Added root `.dockerignore` so Docker builds do not send local caches, generated wiki files, build outputs, or QA artifacts as context.
- Updated conversion execution to use H2Orestart's `Hwp2002_File` input filter and a job-scoped LibreOffice profile directory.
- Added `docs/operations/api-cloud-run-runtime.md` documenting build, runtime variables, local container QA, and Cloud Run deploy flags.
- Linked the runtime document from `docs/INDEX.md`.

## Runtime contract

- H2Orestart `v0.7.12` is installed during image build and conversion uses `--infilter=Hwp2002_File`.
- The image listens on `PORT=8080` by default.
- The conversion service uses `LIBREOFFICE_BIN=soffice`, matching the current API config contract.
- Each conversion uses a job-scoped LibreOffice `UserInstallation` profile directory and removes it after the process exits.
- Upload and result temp directories point at `/tmp/hwp2pdf/*` inside the container.
- The image runs as non-root user `hwp2pdf`.

## Verification

- Docker CLI is not installed in this Windows environment, so the actual image build could not be executed locally.
- The Dockerfile's workspace build/deploy core was verified with pnpm commands in this session.
- The API production deploy bundle was executed directly with Node and checked through `GET /health` plus invalid upload rejection.
- Full workspace build, web lint, and TypeScript LSP diagnostics were run after the packaging change in this session.
