# Task 2 Evidence: Firebase Admin auth and token primitives in API

**Date:** 2026-06-22
**Plan:** `.omo/plans/auth-history-delete-board-final.md` Todo 2
**Status:** ✅ Complete

## Files created/modified

| File | Action | Purpose |
| --- | --- | --- |
| `apps/api/src/services/firebase-admin.ts` | Created | Firebase Admin init (ADC/SA/mock), `getTokenVerifier`, `setTokenVerifierForTesting`, `buildMockIdToken`, mock `verifyIdToken` with `mock_id_token_` prefix |
| `apps/api/src/services/firebase-admin.test.ts` | Created | 11 tests: mock token verify, invalid token reject, role claim parsing, test override, round-trip |
| `apps/api/src/utils/access-token.ts` | Created | `generateAnonymousAccessToken`, `hashAccessToken`, `verifyAnonymousAccessToken` (constant-time), `generateAnonymousAccessTokenWithHash`, `redactToken` |
| `apps/api/src/utils/access-token.test.ts` | Created | 21 tests: generation, hashing, verification, combined API, redaction |
| `apps/api/src/middleware/auth.ts` | Created | `requireAuth`, `optionalAuth`, `requireBoardRole("admin"|"boardModerator"|"any")`, Express `Request.user` augmentation |
| `apps/api/src/middleware/auth.test.ts` | Created | 25 tests: missing/invalid token, valid token, admin/moderator claims, optionalAuth, board role matrix, "any" role, log redaction |
| `apps/api/src/utils/token.ts` | Created | Backwards-compatible re-export from `access-token.ts` |
| `apps/api/src/utils/token.test.ts` | Created | 16 tests: generation, hashing, verification, redaction (imports via re-export) |

## Verification commands and results

### Test run

```
pnpm --filter api test
```

Result: **114 passed, 0 failed** (6 test files)

```
 ✓ src/utils/access-token.test.ts (21 tests) 13ms
 ✓ src/utils/token.test.ts (16 tests) 13ms
 ✓ src/services/firebase-admin.test.ts (11 tests) 13ms
 ✓ src/middleware/auth.test.ts (25 tests) 13ms
 ✓ src/services/job-store.auth.test.ts (40 tests) 14ms
 ✓ src/app.test.ts (1 test) 13ms

 Test Files  6 passed (6)
      Tests  114 passed (114)
```

### Build

```
pnpm --filter api build
```

Result: **Success** (tsc compiled with no errors)

### Typecheck (my files only)

No typecheck errors in any of the new/modified files. Pre-existing errors in `src/routes/v1.download-auth.test.ts` (from Todo 4/5) are unrelated.

## Test coverage summary

### firebase-admin.test.ts (11 tests)
- Mock mode token verification: valid token, admin+moderator claims, invalid prefix, invalid base64, invalid JSON, missing uid, minimal valid token
- Test override: custom verifier used, reset to mock mode
- buildMockIdToken: prefix present, round-trip through verification

### access-token.test.ts (21 tests)
- generateAnonymousAccessToken: length, uniqueness, base64url charset
- hashAccessToken: SHA-256 hex, deterministic, different tokens, known vector
- verifyAnonymousAccessToken: match, mismatch, empty token, empty hash, constant-time, both empty, length mismatch
- generateAnonymousAccessTokenWithHash: returns token+hash, hash matches, token verifies, unique pairs
- redactToken: fixed string, empty input, never leaks

### auth.test.ts (25 tests)
- requireAuth: no header, non-Bearer, malformed Bearer, invalid token, verifier error, valid token, admin claim, moderator claim, both claims
- optionalAuth: no header, malformed header, valid token, invalid token
- requireBoardRole: no prior auth, lacks admin, has admin, lacks moderator, has moderator, admin satisfies moderator, moderator doesn't satisfy admin, "any" with user, "any" with admin, "any" with moderator, "any" without auth
- Log redaction: error messages don't contain raw token

### token.test.ts (16 tests, via re-export)
- Same coverage as access-token.test.ts subset, verifying backwards-compatible re-export works

## Key design decisions

1. **Mock mode via `FIREBASE_ADMIN_MODE=mock` env var**: Tests set this in `beforeEach` to avoid requiring real Firebase credentials. The mock verifier accepts `mock_id_token_<base64url(json)>` tokens.

2. **`setTokenVerifierForTesting` for explicit test injection**: When tests need custom verifier behavior (e.g., simulating network errors), they inject a stub. This takes priority over mock mode.

3. **`requireBoardRole("any")` added**: The plan specified `'admin'|'boardModerator'|'any'`. "any" means any authenticated user passes — useful for board read/write endpoints that require membership but not specific roles.

4. **`token.ts` as re-export**: Existing `token.test.ts` imports from `./token.js`. Rather than break it, `token.ts` re-exports from `access-token.ts` with the old name `verifyAccessTokenHash` aliased to `verifyAnonymousAccessToken`.

5. **Express `Request.user` augmentation**: Uses `declare global { namespace Express { ... } }` instead of the old `express-serve-static-core` module augmentation which had a type resolution error.

## No secrets/tokens in evidence

No Firebase credentials, service account keys, or real tokens appear in this evidence file. All test tokens use mock prefixes or generated random values.