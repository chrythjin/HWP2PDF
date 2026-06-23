import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

// ---------------------------------------------------------------------------
// Anonymous job access token utilities (decision D6/D13).
//
// The plaintext token is returned to the client exactly once at upload
// initiate time. The server stores only the SHA-256 hash. Verification uses
// a constant-time comparison to prevent timing attacks.
//
// Tokens and hashes MUST be redacted from logs via {@link redactToken}.
// ---------------------------------------------------------------------------

/** Byte length of the generated random token (before base64url encoding). */
export const ANONYMOUS_TOKEN_LENGTH = 32; // 256 bits

/**
 * Generate a cryptographically random anonymous access token.
 *
 * @returns URL-safe base64-encoded string (no padding).
 */
export function generateAnonymousAccessToken(): string {
  return randomBytes(ANONYMOUS_TOKEN_LENGTH).toString("base64url");
}

/**
 * Hash an access token with SHA-256 for storage.
 *
 * Only the hash is persisted. The plaintext token is never stored server-side.
 *
 * @param token - Plaintext access token.
 * @returns Lowercase hex SHA-256 digest (64 chars).
 */
export function hashAccessToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Verify a plaintext token against a stored hash in constant time.
 *
 * Uses `crypto.timingSafeEqual` to prevent timing side-channels. Both inputs
 * must be non-empty; empty inputs always return false without throwing.
 *
 * @param token - Plaintext token from the client.
 * @param storedHash - SHA-256 hex hash from storage.
 * @returns true if the token matches the hash.
 */
export function verifyAnonymousAccessToken(token: string, storedHash: string): boolean {
  if (!token || !storedHash) {
    return false;
  }

  const candidateHash = hashAccessToken(token);

  // Both are 64-char hex strings, so lengths always match for valid hashes.
  // Guard against mismatched lengths to avoid timingSafeEqual throwing.
  if (candidateHash.length !== storedHash.length) {
    return false;
  }

  const candidateBuffer = Buffer.from(candidateHash, "utf8");
  const storedBuffer = Buffer.from(storedHash, "utf8");

  return timingSafeEqual(candidateBuffer, storedBuffer);
}

/**
 * Generate an anonymous access token and its SHA-256 hash in one call.
 *
 * The plaintext `token` is returned to the client exactly once. The `hash`
 * is what the server persists.
 *
 * @returns `{ token, hash }` — plaintext token and its SHA-256 hex hash.
 */
export function generateAnonymousAccessTokenWithHash(): {
  token: string;
  hash: string;
} {
  const token = generateAnonymousAccessToken();
  const hash = hashAccessToken(token);
  return { token, hash };
}

/**
 * Redact a token for safe logging.
 *
 * NEVER log the plaintext token, the hash, or any prefix of either.
 * Use this helper whenever a token value might appear in a log line.
 *
 * @returns The fixed string "[REDACTED]".
 */
export function redactToken(_token: string): string {
  return "[REDACTED]";
}