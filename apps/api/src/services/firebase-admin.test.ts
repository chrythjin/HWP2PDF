import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  buildMockIdToken,
  getTokenVerifier,
  setTokenVerifierForTesting,
  resetFirebaseAdminForTesting,
  type DecodedFirebaseToken,
} from "./firebase-admin.js";

// ---------------------------------------------------------------------------
// Firebase Admin service tests.
//
// These tests never touch real Firebase credentials. They exercise:
//   - Mock mode token verification (mock_id_token_ prefix)
//   - Test override via setTokenVerifierForTesting
//   - Invalid token rejection
//   - Role claim parsing from JSON payload
// ---------------------------------------------------------------------------

describe("firebase-admin service", () => {
  beforeEach(() => {
    setTokenVerifierForTesting(null);
    resetFirebaseAdminForTesting();
    process.env.FIREBASE_ADMIN_MODE = "mock";
  });

  afterEach(() => {
    setTokenVerifierForTesting(null);
    resetFirebaseAdminForTesting();
    delete process.env.FIREBASE_ADMIN_MODE;
  });

  // -----------------------------------------------------------------------
  // buildMockIdToken / mock verifyIdToken
  // -----------------------------------------------------------------------

  describe("mock mode token verification", () => {
    it("verifies a valid mock token and returns decoded claims", async () => {
      const payload: DecodedFirebaseToken = {
        uid: "user-001",
        email: "user@example.com",
        name: "Test User",
      };
      const token = buildMockIdToken(payload);

      const verifier = await getTokenVerifier();
      const decoded = await verifier(token);

      expect(decoded.uid).toBe("user-001");
      expect(decoded.email).toBe("user@example.com");
      expect(decoded.name).toBe("Test User");
    });

    it("parses admin and boardModerator claims from mock token", async () => {
      const payload: DecodedFirebaseToken = {
        uid: "admin-002",
        admin: true,
        boardModerator: true,
      };
      const token = buildMockIdToken(payload);

      const verifier = await getTokenVerifier();
      const decoded = await verifier(token);

      expect(decoded.uid).toBe("admin-002");
      expect(decoded.admin).toBe(true);
      expect(decoded.boardModerator).toBe(true);
    });

    it("rejects tokens without mock_id_token_ prefix", async () => {
      const verifier = await getTokenVerifier();
      await expect(verifier("some-random-token")).rejects.toThrow();
    });

    it("rejects tokens with invalid base64url payload", async () => {
      const verifier = await getTokenVerifier();
      await expect(verifier("mock_id_token_!!!notvalidbase64!!!")).rejects.toThrow();
    });

    it("rejects tokens with valid base64 but invalid JSON", async () => {
      const badJson = Buffer.from("not json", "utf8").toString("base64url");
      const verifier = await getTokenVerifier();
      await expect(verifier(`mock_id_token_${badJson}`)).rejects.toThrow();
    });

    it("rejects tokens where payload is missing uid", async () => {
      const payload = { email: "no-uid@example.com" };
      const token = buildMockIdToken(payload as DecodedFirebaseToken);
      const verifier = await getTokenVerifier();
      await expect(verifier(token)).rejects.toThrow();
    });

    it("accepts token with only uid (minimal valid token)", async () => {
      const payload: DecodedFirebaseToken = { uid: "minimal-003" };
      const token = buildMockIdToken(payload);

      const verifier = await getTokenVerifier();
      const decoded = await verifier(token);

      expect(decoded.uid).toBe("minimal-003");
      expect(decoded.admin).toBeUndefined();
      expect(decoded.boardModerator).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // Test override
  // -----------------------------------------------------------------------

  describe("setTokenVerifierForTesting override", () => {
    it("uses the injected verifier instead of mock mode", async () => {
      const customVerifier = async (idToken: string): Promise<DecodedFirebaseToken> => {
        if (idToken === "custom-test-token") {
          return { uid: "custom-user", admin: true };
        }
        throw new Error("not found");
      };
      setTokenVerifierForTesting(customVerifier);

      const verifier = await getTokenVerifier();
      const decoded = await verifier("custom-test-token");

      expect(decoded.uid).toBe("custom-user");
      expect(decoded.admin).toBe(true);
    });

    it("resets to mock mode when null is passed", async () => {
      setTokenVerifierForTesting(async () => ({ uid: "temp" }));
      setTokenVerifierForTesting(null);

      const verifier = await getTokenVerifier();
      // Should fall back to mock mode behavior.
      const token = buildMockIdToken({ uid: "after-reset" });
      const decoded = await verifier(token);
      expect(decoded.uid).toBe("after-reset");
    });
  });

  // -----------------------------------------------------------------------
  // buildMockIdToken
  // -----------------------------------------------------------------------

  describe("buildMockIdToken", () => {
    it("produces a token with the mock_id_token_ prefix", () => {
      const token = buildMockIdToken({ uid: "test" });
      expect(token.startsWith("mock_id_token_")).toBe(true);
    });

    it("round-trips through mock verification", async () => {
      const payload: DecodedFirebaseToken = {
        uid: "roundtrip-004",
        email: "rt@example.com",
        name: "Round Trip",
        admin: false,
        boardModerator: true,
      };
      const token = buildMockIdToken(payload);

      const verifier = await getTokenVerifier();
      const decoded = await verifier(token);

      expect(decoded).toEqual(payload);
    });
  });
});