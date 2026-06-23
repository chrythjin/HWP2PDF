import { describe, expect, it } from "vitest";
import {
  generateAnonymousAccessToken,
  hashAccessToken,
  verifyAccessTokenHash,
  redactToken,
  ANONYMOUS_TOKEN_LENGTH,
} from "./token.js";

describe("anonymous access token utilities", () => {
  describe("generateAnonymousAccessToken", () => {
    it("generates a URL-safe base64 token of the expected length", () => {
      const token = generateAnonymousAccessToken();
      // Decoded byte length should match ANONYMOUS_TOKEN_LENGTH.
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
      // base64url alphabet: A-Z a-z 0-9 - _
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    });
  });

  describe("hashAccessToken", () => {
    it("produces a SHA-256 hex hash of the token", () => {
      const token = "test-token-value";
      const hash = hashAccessToken(token);
      // SHA-256 hex = 64 chars
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
      // Known: SHA-256("hello") = 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
      expect(hashAccessToken("hello")).toBe(
        "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
      );
    });
  });

  describe("verifyAccessTokenHash", () => {
    it("returns true for a token matching the hash", () => {
      const token = generateAnonymousAccessToken();
      const hash = hashAccessToken(token);
      expect(verifyAccessTokenHash(token, hash)).toBe(true);
    });

    it("returns false for a wrong token", () => {
      const correct = generateAnonymousAccessToken();
      const wrong = generateAnonymousAccessToken();
      const hash = hashAccessToken(correct);
      expect(verifyAccessTokenHash(wrong, hash)).toBe(false);
    });

    it("returns false for empty token", () => {
      const hash = hashAccessToken("real-token");
      expect(verifyAccessTokenHash("", hash)).toBe(false);
    });

    it("returns false for empty hash", () => {
      const token = generateAnonymousAccessToken();
      expect(verifyAccessTokenHash(token, "")).toBe(false);
    });

    it("is constant-time — does not short-circuit on prefix mismatch", () => {
      // This is a sanity check: verify with a hash that shares a long prefix
      // but differs at the end. A constant-time compare should still return
      // false, and should not throw.
      const token = "constant-time-test";
      const realHash = hashAccessToken(token);
      const tamperedHash = realHash.slice(0, -2) + "00";
      expect(verifyAccessTokenHash(token, tamperedHash)).toBe(false);
    });

    it("returns false when hash and token are both empty", () => {
      expect(verifyAccessTokenHash("", "")).toBe(false);
    });
  });

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