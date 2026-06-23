# Decisions - auth-history-delete-board-final

## 2026-06-23 fix scope
- Fix only F4-blocking issues: update public policy pages (privacy, terms, home FAQ), fix roadmap trailing whitespace, fix lint errors in NEW auth feature code (history page, board page, useBoardClaims, DropzoneUploader unused warnings, board-page.test unused warnings).
- Leave pre-existing lint errors in page.tsx/privacy.tsx/terms.tsx/AdSenseAd.tsx untouched because they are outside the requested feature area and predate auth-history-delete-board work.
- Re-run final wave after fixes: pnpm -r build, pnpm -r test, pnpm --filter web lint (new-auth errors only), git diff --check, smoke-api.

## 2026-06-23 F4 scope fidelity and docs review

Verdict: REJECT.

Evidence:
- `docs/sessions/` contains matching auth-history-delete-board session notes: `20260623_074518_auth-history-delete-board.md` and `20260622_230000_auth-history-delete-board-deployment.md`.
- Most recent session note `docs/sessions/20260623_074518_auth-history-delete-board.md` exists and references the auth-history-delete-board plan/session slug, deployment/docs work, roadmap copy, docs index update, and verification evidence. It does not independently summarize the user-facing auth, history, delete, and board feature set beyond the plan slug and Todo 13 deployment/docs scope.
- `docs/INDEX.md` links to `sessions/20260623_074518_auth-history-delete-board.md` and `sessions/20260622_230000_auth-history-delete-board-deployment.md`, and includes `plan/auth-history-delete-board-roadmap.md` plus runtime/deployment workflow links. However, it does not list several feature-specific session notes present in `docs/sessions/` such as Firebase auth primitives, board API permission matrix, board UI, and anonymous upload token work, so it does not fully reflect the new auth/history/delete/board feature documentation surface.
- Required retention periods are consistent across the legal/FAQ text that was reviewed: member history metadata is 30 days, anonymous jobs are 30 minutes after conversion completion, tombstones are 30 days, and anonymous access uses `X-Job-Access-Token`.
- Privacy section 3.1-3.3, Terms section 4, and the FAQ all describe token-based anonymous lookup, no member history for anonymous users, 30-day member metadata retention, 30-minute anonymous cleanup, and 30-day tombstone retention.
- Scope fidelity cannot be approved from the current worktree: `git status --short` shows many auth/history/delete/board-related changes, but also broad `graphify-out/` deletions and unrelated-looking modified/generated assets outside the requested feature/doc scope. Because these are present in the same worktree, this review cannot confirm only requested areas were changed.

Required fixes before approval:
- Update `docs/INDEX.md` so the new feature set is represented with links to the relevant feature-specific session notes, not only the final deployment/docs sessions.
- Resolve or explicitly quarantine/explain the unrelated `graphify-out/` deletions and any other non-feature changes before asking for scope approval.
- Expand the latest/final session note or add an index-linked final note that explicitly mentions auth, history, delete, and board functionality, not only the Todo 13 deployment/docs wrap-up.

## 2026-06-23 F4 docs index follow-up

- Verified the requested feature-specific session notes exist in `docs/sessions/`: Firebase Admin auth primitives, board API permission matrix, Cloud Tasks worker dispatcher, board UI, and upload UI anonymous token.
- Updated `docs/INDEX.md` to list those five existing notes chronologically in `## Session notes` without modifying the session note files.
- Added a `## Current known gaps` note that auth/history/delete/board features are implemented and tested locally, while Firebase Auth production verification, Cloud Tasks queue, and Firestore persistence still require GCP staging access.

## 2026-06-23 F4 final rerun after fixes

Verdict: APPROVE.

Evidence file: `.omo/evidence/final-scope-docs-auth-history-delete-board-final.md`

Findings:
- Read `docs/INDEX.md`; the five previously missing feature-specific session notes are now listed: Firebase Admin auth primitives, board API permission matrix, Cloud Tasks worker dispatcher, board UI, and upload UI anonymous token.
- Listed `docs/sessions/`; all session note files referenced by `docs/INDEX.md` exist, including the five feature-specific notes.
- Read `docs/plan/auth-history-delete-board-roadmap.md` and ran `git diff --check`; no whitespace errors were reported.
- Read `apps/web/src/app/privacy/page.tsx`, `apps/web/src/app/terms/page.tsx`, and `apps/web/src/app/page.tsx`; privacy/terms/home FAQ now cover member metadata retention for 30 days, tombstone disclosure/30-day retention, anonymous 30-minute TTL deletion, and token-based anonymous access via `X-Job-Access-Token`.
- Ran `pnpm --filter web lint`; command completed without lint error output.
- Ran `git status --short`; `graphify-out/` deletions are still visible and are treated as pre-existing per inherited context, while the reviewed auth/history/delete/board and supporting docs/config changes match the requested feature scope.

## 2026-06-23 F1 final plan compliance re-verification

Verdict: REJECT.

Evidence file: `.omo/evidence/final-plan-compliance-auth-history-delete-board-final.md`

Findings:
- Re-read `.omo/plans/auth-history-delete-board-final.md` and checked D1-D13 individually with file:line evidence.
- Re-read required server/security files: `apps/api/src/routes/v1.ts`, `apps/api/src/routes/v1.board.ts`, `apps/api/src/middleware/auth.ts`, `apps/api/src/middleware/worker-auth.ts`, `apps/api/src/services/job-store.ts`, and `packages/shared/src/index.ts`.
- Ran required grep: `rtk grep -r "password\|refresh.*token\|login.*DTO" apps/api/src/`; it returned no output, so no server password DTO/login DTO/refresh token pattern was found in API source.
- Owner-aware new jobs are protected by Firebase `userId` ownership or anonymous `accessTokenHash`, but legacy owner-less paths remain: `GET /v1/jobs/:jobId` returns status for legacy jobs without credentials, `GET /v1/jobs/:jobId/download` accepts any credential for legacy jobs instead of matching ownership/hash, and `GET /v1/results/:fileName` keeps legacy downloads accessible when no owner verifier exists.
- Because F1 explicitly requires no jobId-only status/download leak and all status/download endpoints to require userId ownership or accessTokenHash, F1 cannot approve until the legacy owner-less compatibility paths are removed, migrated, or explicitly deferred with approved rationale.

