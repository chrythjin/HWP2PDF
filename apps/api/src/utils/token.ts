// ---------------------------------------------------------------------------
// Backwards-compatible re-export from access-token.ts.
//
// New code should import directly from `./access-token.js`. This file exists
// so existing imports from `./token.js` continue to work.
// ---------------------------------------------------------------------------

export {
  generateAnonymousAccessToken,
  hashAccessToken,
  verifyAnonymousAccessToken as verifyAccessTokenHash,
  redactToken,
  ANONYMOUS_TOKEN_LENGTH,
} from "./access-token.js";