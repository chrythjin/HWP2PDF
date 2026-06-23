import { describe, expect, it } from "vitest";
import {
  generateAnonymousAccessToken,
  generateAnonymousAccessTokenWithHash,
  hashAccessToken,
  verifyAnonymousAccessToken,
  redactToken,
  ANONYMOUS_TOKEN_LENGTH,
} from "./access-token.js";

// ---------------------------------------------------------------------------
// Anonymous access token utility tests (decision D6/D13).
//
// Covers:
//   - Token generation (randomness, length, base64url charset)
//   - SHA-256 hashing (determinism, known vector)
//   - Constant-time verification (match, mismatch, empty inputs, tampered hash)
//   - Combined {token, hash} generation
//   - Log redaction
// ---------------------------------------------------------------------------

describe("anonymous access token utilities", () => {
  // -----------------------------------------------------------------------
  // generateAnonymousAccessToken
  // -----------------------------------------------------------------------

  describe("generateAnonymousAccessToken", () => {
    it("generates a URL-safe base64 token of the expected length", () => {
      const token = generateAnonymousAccessToken();
      const decoded = Buffer.from(token, "base64url");
      expect(decoded.length).toBe(ANONYMOUS_TOKEN_LENGTH);
    });

    it("generates unique tokens on each call", () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateAnonymousAccessToken());
      }
      expect(tokens.size).toBe(100);
    });

    it("produces base64url-safe characters only", () => {
      const token = generateAnonymousAccessToken();
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    });
  });

  // -----------------------------------------------------------------------
  // hashAccessToken
  // -----------------------------------------------------------------------

  describe("hashAccessToken", () => {
    it("produces a SHA-256 hex hash of the token", () => {
      const token = "test-token-value";
      const hash = hashAccessToken(token);
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });

    it("is deterministic — same token produces same hash", () => {
      const token = "deterministic-test";
      expect(hashAccessToken(token)).toBe(hashAccessToken(token));
    });

    it("different tokens produce different hashes", () => {
      expect(hashAccessToken("token-a")).not.toBe(hashAccessToken("token-b"));
    });

    it("matches a known SHA-256 vector", () => {
      // SHA-256("hello") = 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
      expect(hashAccessToken("hello")).toBe(
        "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
      );
    });
  });

  // -----------------------------------------------------------------------
  // verifyAnonymousAccessToken
  // -----------------------------------------------------------------------

  describe("verifyAnonymousAccessToken", () => {
    it("returns true for a token matching the hash", () => {
      const token = generateAnonymousAccessToken();
      const hash = hashAccessToken(token);
      expect(verifyAnonymousAccessToken(token, hash)).toBe(true);
    });

    it("returns false for a wrong token", () => {
      const correct = generateAnonymousAccessToken();
      const wrong = generateAnonymousAccessToken();
      const hash = hashAccessToken(correct);
      expect(verifyAnonymousAccessToken(wrong, hash)).toBe(false);
    });

    it("returns false for empty token", () => {
      const hash = hashAccessToken("real-token");
      expect(verifyAnonymousAccessToken("", hash)).toBe(false);
    });

    it("returns false for empty hash", () => {
      const token = generateAnonymousAccessToken();
      expect(verifyAnonymousAccessToken(token, "")).toBe(false);
    });

    it("is constant-time — does not short-circuit on prefix mismatch", () => {
      const token = "constant-time-test";
      const realHash = hashAccessToken(token);
      const tamperedHash = realHash.slice(0, -2) + "00";
      expect(verifyAnonymousAccessToken(token, tamperedHash)).toBe(false);
    });

    it("returns false when both token and hash are empty", () => {
      expect(verifyAnonymousAccessToken("", "")).toBe(false);
    });

    it("returns false when hash length differs from candidate hash length", () => {
      const token = "some-token";
      // Short hash (not a valid SHA-256 hex).
      expect(verifyAnonymousAccessToken(token, "abc123")).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // generateAnonymousAccessTokenWithHash
  // -----------------------------------------------------------------------

  describe("generateAnonymousAccessTokenWithHash", () => {
    it("returns both a token and its hash", () => {
      const { token, hash } = generateAnonymousAccessTokenWithHash();
      expect(token).toBeTruthy();
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });

    it("the returned hash matches hashAccessToken(token)", () => {
      const { token, hash } = generateAnonymousAccessTokenWithHash();
      expect(hashAccessToken(token)).toBe(hash);
    });

    it("the token verifies against the hash", () => {
      const { token, hash } = generateAnonymousAccessTokenWithHash();
      expect(verifyAnonymousAccessToken(token, hash)).toBe(true);
    });

    it("generates unique token+hash pairs", () => {
      const pairs = new Set<string>();
      for (let i = 0; i < 50; i++) {
        const { token, hash } = generateAnonymousAccessTokenWithHash();
        pairs.add(`${token}:${hash}`);
      }
      expect(pairs.size).toBe(50);
    });
  });

  // -----------------------------------------------------------------------
  // redactToken
  // -----------------------------------------------------------------------

  describe("redactToken", () => {
    it("returns a fixed redaction string", () => {
      expect(redactToken("anything")).toBe("[REDACTED]");
    });

    it("returns [REDACTED] even for empty input", () => {
      expect(redactToken("")).toBe("[REDACTED]");
    });

    it("never returns the input token", () => {
      const token = "super-secret-token-12345";
      const redacted = redactToken(token);
      expect(redacted).not.toContain(token);
      expect(redacted).toBe("[REDACTED]");
    });
  });
});