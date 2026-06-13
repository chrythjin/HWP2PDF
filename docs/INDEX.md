# HWP2PDF Documentation Index

This folder is the project documentation entry point for future OpenCode sessions. Prefer verified executable sources when these docs drift.

## Start here

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

- Production GCS storage and Cloud Run runtime packaging are not implemented yet; `apps/api` currently uses local temporary directories and an in-memory job store.
- LibreOffice is not installed in the current Windows development environment, so local surface QA verifies the clear converter configuration failure path rather than successful PDF output.
- Frontend `DropzoneUploader` still uses a mock conversion flow and is not yet wired to `apps/api` upload/polling.

## Session notes

- `sessions/20260613_030400_api-backend-mvp.md` - created the Express/TypeScript API MVP with upload, job status, rate limiting, and LibreOffice command boundary.
