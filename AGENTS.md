# HWP2PDF Agent Guide

Repo-specific guidance only. If docs disagree with executable config or scripts, trust the executable source. See sub-AGENTS.md for deeper per-area rules.

## Project map

- pnpm workspace (`pnpm-workspace.yaml`); packages live under `apps/*` and `packages/*`.
- `apps/web` — Next.js 16.2.9 frontend, package name `web`. See `apps/web/AGENTS.md` for Next.js caveats.
- `apps/api` — Express/TypeScript conversion API, package name `api`. See `apps/api/src/services/AGENTS.md`, `apps/api/src/routes/AGENTS.md`, `apps/api/src/middleware/AGENTS.md`.
- `packages/shared` — Shared TypeScript contracts published as `@hwp2pdf/shared` after `tsc` builds `dist/`. See `packages/shared/src/AGENTS.md`.
- Product/architecture source docs: `docs/superpowers/specs/HWP2PDF-Blueprint.md`, `docs/superpowers/specs/HWP2PDF-Plan-v1.md`, `docs/architecture/`.

## Verified commands

- Use **pnpm**, not npm. Root `package.json` declares `packageManager: pnpm@8.15.1` and Node `>=20`.
- `pnpm -r build` — verified 2026-07-20. Order: `packages/shared` (tsc) → `apps/api` (tsc) → `apps/web` (`next build`).
- `pnpm --filter api typecheck` — `tsc --noEmit` for API only.
- `pnpm --filter api test` — vitest, 356 tests in 18 files (verified 2026-07-20).
- `pnpm -r lint` — ESLint for web; workspace-wide passes.
- Root scripts: `dev:web`, `dev:api`, `build:web`, `build:api`, `lint`, `typecheck`, `test`. Verify the target package exists before assuming a script works.

## Mode-specific facts

- **Local dev**: in-memory job store + filesystem (`apps/api/tmp/uploads`, `apps/api/tmp/results`). `tmp/` is git-ignored.
- **Production**: `STORAGE_BACKEND=gcs` + `JOB_STORE_BACKEND=firestore`. Originals in `{gcsOriginalPrefix}/{jobId}/{filename}`; results in `{gcsResultPrefix}/{jobId}/{jobId}.pdf`.
- **Conversion**: shells out to `LIBREOFFICE_BIN` or `soffice`. Missing binary → job fails with `PUBLIC_CONVERSION_ERRORS`-mapped message, raw error stays in logs only.
- **Async dispatch**: Cloud Tasks in production, inline in local dev, mock in tests. See `apps/api/src/services/cloud-tasks-dispatcher.ts`.

## Owner / auth model

- Members: Firebase ID token verified via Admin SDK (`apps/api/src/middleware/auth.ts`). Custom claims for `admin`, `boardModerator`.
- Anonymous: SHA-256 hashed access token in `X-Job-Access-Token` header. Constant-time compare in `OwnerVerifier`.
- Every job operation requires owner verification — no `jobId`-alone access. See `apps/api/src/services/storage-service.ts`.

## Documentation rule

- After successful code/config changes, add a concise session note under `docs/sessions/YYYYMMDD_HHMMSS_<task-name>.md`.
- Update `docs/INDEX.md` when the change affects documented navigation.
- Per AGENTS.md global rule: back up edits to `history/file-backups/` and log to `history/YYYYMMDD_history_summary_<OS>_<USERNAME>.md` format.

## Anti-patterns

- Do not delete `tmp_env.txt` / `tmp_env_yaml.txt` / `tsconfig.json.agent-lsp-backup` — these are workspace-managed.
- Do not bypass owner verification on any job operation.
- Do not commit `apps/web/.env.local` or any `.env*` file (gitignored, but verify).
- Do not run `pnpm deploy` in Docker — use `pnpm --filter api deploy --prod --ignore-scripts /prod/api` (project memory #803, #825).
- Do not log raw `error.message` from internal failures — use `errorName` (safety check already enforced in `error-handler.ts`).
