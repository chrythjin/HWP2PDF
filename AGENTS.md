# HWP2PDF Agent Guide

Use this file for repo-specific guidance only. If docs disagree with executable config or scripts, trust the executable source.

## Project map

- This is a pnpm workspace declared in `pnpm-workspace.yaml`; packages live under `apps/*` and `packages/*`.
- `apps/web` is the Next.js frontend package named `web`.
- `apps/api` is the Express/TypeScript conversion API package named `api`.
- `packages/shared` publishes internal shared TypeScript contracts as `@hwp2pdf/shared` after `tsc` builds `dist/`.
- There is no root README at the time of writing; `apps/web/README.md` is still the default Create Next App README.
- Product/architecture source docs live in `docs/superpowers/specs/HWP2PDF-Blueprint.md` and `docs/superpowers/specs/HWP2PDF-Plan-v1.md`.

## Verified commands

- Use pnpm, not npm. Root `package.json` declares `packageManager: pnpm@8.15.0` and Node `>=20`.
- `pnpm -r build` was verified on 2026-06-13 and builds `packages/shared` with `tsc`, `apps/api` with `tsc`, then `apps/web` with `next build`.
- `pnpm --filter api build` was verified on 2026-06-13 and compiles the API TypeScript package.
- Root scripts also declare `dev:web`, `dev:api`, `build:web`, `build:api`, `lint`, `typecheck`, and `test`, but only document them as working after verifying the target package exists and has the matching script.

## Next.js caveat

- `apps/web/AGENTS.md` applies inside the frontend: this repo uses Next.js 16.2.9, so read the relevant installed docs under `node_modules/next/dist/docs/` before changing Next-specific APIs or conventions.

## Current implementation facts

- Frontend source is under `apps/web/src/app` and `apps/web/src/components`; imports may use the `@/*` alias from `apps/web/tsconfig.json`.
- Shared upload constraints are centralized in `packages/shared/src/index.ts`: `.hwp` only, max 20MB, async job/status response types, and polling constants.
- API source is under `apps/api/src`; it exposes `GET /health`, `POST /v1/upload`, and `GET /v1/jobs/:jobId` using the shared API route constants.
- The API currently uses an in-memory job store and local `tmp/uploads` / `tmp/results` directories. Production GCS storage remains a future service-boundary implementation.
- The conversion service shells out to `LIBREOFFICE_BIN` or `soffice`; if LibreOffice is unavailable, jobs fail with a clear converter configuration message.

## Documentation rule

- After successful code/config changes, add a concise session note under `docs/sessions/YYYYMMDD_HHMMSS_<task-name>.md` and update `docs/INDEX.md` when the change affects documented navigation.
