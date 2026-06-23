# Session: Firebase Admin auth and token primitives in API

**Date:** 2026-06-22 18:45
**Task:** Todo 2 of `auth-history-delete-board-final` plan
**Status:** ✅ Complete

## Summary

Implemented Firebase Admin auth initialization, auth middleware, and anonymous access token utilities for the API package. All 114 tests pass and the build compiles cleanly.

## Changes

### New files

- `apps/api/src/services/firebase-admin.ts` — Firebase Admin SDK lifecycle: ADC/service-account/mock modes, `getTokenVerifier()`, `setTokenVerifierForTesting()`, `buildMockIdToken()`, mock `verifyIdToken` accepting `mock_id_token_` prefixed tokens with JSON payload.
- `apps/api/src/services/firebase-admin.test.ts` — 11 tests covering mock verification, invalid tokens, role claims, test override, round-trip.
- `apps/api/src/utils/access-token.ts` — `generateAnonymousAccessToken()`, `hashAccessToken()` (SHA-256), `verifyAnonymousAccessToken()` (constant-time via `timingSafeEqual`), `generateAnonymousAccessTokenWithHash()` ({token, hash}), `redactToken()`.
- `apps/api/src/utils/access-token.test.ts` — 21 tests covering generation, hashing, verification, combined API, redaction.
- `apps/api/src/middleware/auth.ts` — `requireAuth`, `optionalAuth`, `requireBoardRole("admin"|"boardModerator"|"any")` middleware. Express `Request.user` global augmentation.
- `apps/api/src/middleware/auth.test.ts` — 25 tests covering all middleware paths including the "any" role and log redaction.
- `apps/api/src/utils/token.ts` — Backwards-compatible re-export from `access-token.ts`.
- `apps/api/src/utils/token.test.ts` — 16 tests (existing, verified still passing via re-export).

### Key decisions

1. Mock mode controlled by `FIREBASE_ADMIN_MODE=mock` env var (checked dynamically at call time, not just from static config).
2. `requireBoardRole("any")` added per task spec — any authenticated user passes.
3. `token.ts` kept as re-export to avoid breaking existing imports.
4. Express type augmentation uses `declare global { namespace Express }` instead of `express-serve-static-core` module augmentation.

## Verification

- `pnpm --filter api test`: 114/114 passed (6 test files)
- `pnpm --filter api build`: Success (tsc compiled)
- No typecheck errors in new/modified files

## Not verified

- Real Firebase Admin SDK initialization (ADC/service-account) — by design, tests use mock mode only.
- Integration with Express routes — routes will be wired in later todos (5, 7, 8).