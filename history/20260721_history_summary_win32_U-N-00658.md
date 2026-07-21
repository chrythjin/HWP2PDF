# History Summary 2026-07-21

## Changes
- Created `firestore.rules` in the workspace root to block all direct client-side reads and writes to Cloud Firestore.
- Updated `firebase.json` to link the new `firestore.rules` configuration.
- Created session note `docs/sessions/20260721_120232_lock-firestore-rules.md`.
- Updated `docs/INDEX.md` index references.

## Verification
- Verified all API tests passed successfully using `pnpm --filter api test`.
