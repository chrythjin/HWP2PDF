# Session: AuthProvider lint-safe loading initialization

## What changed

- `apps/web/src/auth/AuthProvider.tsx`
  - Initial `loading` state now derives from `isFirebaseConfigured` so the Firebase-unconfigured path resolves loading to false without a synchronous `setState` in the init effect.
  - The unconfigured branch no longer calls `setLoading(false)` inside the effect body.
  - Listener initialization errors still clear loading, but the update is deferred with `queueMicrotask` to satisfy the `react-hooks/set-state-in-effect` lint rule.
- `apps/web/src/auth/AuthProvider.test.tsx`
  - Mocked `@/lib/firebase` with a runtime `isFirebaseConfigured` getter so tests can toggle configured/unconfigured modes.
  - Added coverage for unconfigured loading resolution and listener initialization error handling.

## Why

`pnpm --filter web lint` was failing with `react-hooks/set-state-in-effect` at `apps/web/src/auth/AuthProvider.tsx:47` because `setLoading(false)` was called synchronously inside the `useEffect` body when Firebase was not configured. The fix preserves all existing public API behavior (`AuthContextValue`, `login`, `signup`, `logout`, `clearError`) while removing the lint violation.

## Verification

- `pnpm --filter web test -- AuthProvider` — 10/10 tests pass.
- `pnpm --filter web lint` — no `react-hooks/set-state-in-effect` error for `AuthProvider.tsx`.
- `pnpm --filter web typecheck` — clean for edited files.

## Evidence and backups

- Evidence: `.omo/evidence/task-1-hwp2pdf-review-fixes.md`
- Backups: `history/file-backups/AuthProvider.tsx_20260630_182254_Windows_U-N-00658`, `history/file-backups/AuthProvider.test.tsx_20260630_182254_Windows_U-N-00658`

## Notes

- `agent-lsp` TypeScript diagnostics could not be initialized on this Windows path; the exact failure is recorded in the task evidence, and package-level `typecheck`/`lint` were used as fallbacks.
- No public auth API shape changes, no new dependencies, no `eslint-disable`, and no unrelated files were modified.
