# Web Firebase Auth Shell

## Summary

Implemented Todo 9 of `.omo/plans/auth-history-delete-board-final.md` for `apps/web`.

## Changes

- Added the Firebase client SDK dependency to the web package.
- Added browser-safe Firebase client initialization in `apps/web/src/lib/firebase.ts`.
- Added `AuthProvider` and `useAuth` for Firebase email/password auth state and actions.
- Wrapped the root app layout with `AuthProvider` using a Client Component provider inside the App Router Server Component layout.
- Added `/login` and `/signup` pages.
- Added auth-aware navigation via `AuthNav` in `PageLayout`.
- Added `fetchWithAuth` in `apps/web/src/lib/api-client.ts` to attach Firebase ID tokens to authenticated API calls.
- Added Firebase public env typings and `.env.local.example` placeholders.
- Added tests for auth provider behavior and authenticated API-client headers.

## Verification

- `pnpm --filter web test` — passed: 6 files, 58 tests.
- `pnpm --filter web typecheck` — passed.
- `pnpm --filter web build` — passed.
- `ocr review` — attempted, but timed out after 180 seconds before final verdict.
