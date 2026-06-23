import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/api-error.js";
import {
  requireAuth,
  optionalAuth,
  requireBoardRole,
  setTokenVerifierForTesting,
  type AuthenticatedUser,
} from "./auth.js";

// ---------------------------------------------------------------------------
// Mock Firebase token verifier.
//
// Tests never touch real Firebase credentials. We inject a stub verifier
// via setTokenVerifierForTesting so the middleware can be exercised in unit
// tests without network calls.
// ---------------------------------------------------------------------------

interface MockDecodedToken {
  uid: string;
  email?: string;
  name?: string;
  admin?: boolean;
  boardModerator?: boolean;
}

function createMockVerifier(tokens: Record<string, MockDecodedToken>) {
  return async (idToken: string): Promise<MockDecodedToken> => {
    if (idToken === "throw-token") {
      throw new Error("network error");
    }
    const decoded = tokens[idToken];
    if (!decoded) {
      const err = new Error("Firebase ID token has invalid signature");
      (err as Error & { code?: string }).code = "auth/invalid-id-token";
      throw err;
    }
    return decoded;
  };
}

const mockTokens: Record<string, MockDecodedToken> = {
  "valid-user-token": {
    uid: "user-123",
    email: "user@example.com",
    name: "Test User",
  },
  "valid-admin-token": {
    uid: "admin-456",
    email: "admin@example.com",
    name: "Admin User",
    admin: true,
  },
  "valid-moderator-token": {
    uid: "mod-789",
    email: "mod@example.com",
    name: "Mod User",
    boardModerator: true,
  },
  "valid-admin-and-mod-token": {
    uid: "super-001",
    email: "super@example.com",
    name: "Super User",
    admin: true,
    boardModerator: true,
  },
};

function createMockRequest(headers: Record<string, string | undefined> = {}): Request {
  return {
    headers,
    header(name: string) {
      const lower = name.toLowerCase();
      return headers[lower] ?? headers[name] ?? undefined;
    },
  } as unknown as Request;
}

function createMockResponse(): Response & { statusCode: number; body: unknown } {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    locals: {} as Record<string, unknown>,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: unknown) {
      this.body = data;
      return this;
    },
    setHeader() {
      return this;
    },
  };
  return res as unknown as Response & { statusCode: number; body: unknown };
}

function callMiddleware(
  middleware: (req: Request, res: Response, next: NextFunction) => void,
  req: Request,
): Promise<{ res: Response & { statusCode: number; body: unknown }; nextError: unknown }> {
  const res = createMockResponse();
  let nextError: unknown = undefined;
  return new Promise((resolve) => {
    middleware(req, res, (err?: unknown) => {
      nextError = err;
      resolve({ res: res as Response & { statusCode: number; body: unknown }, nextError });
    });
  });
}

describe("auth middleware", () => {
  beforeEach(() => {
    setTokenVerifierForTesting(createMockVerifier(mockTokens));
  });

  afterEach(() => {
    setTokenVerifierForTesting(null);
  });

  // -----------------------------------------------------------------------
  // requireAuth
  // -----------------------------------------------------------------------

  describe("requireAuth", () => {
    it("rejects requests with no Authorization header", async () => {
      const req = createMockRequest({});
      const { res, nextError } = await callMiddleware(requireAuth, req);

      expect(nextError).toBeInstanceOf(ApiError);
      const err = nextError as ApiError;
      expect(err.statusCode).toBe(401);
      expect(err.code).toBe("unauthorized");
    });

    it("rejects requests with non-Bearer Authorization header", async () => {
      const req = createMockRequest({ authorization: "Basic abc123" });
      const { nextError } = await callMiddleware(requireAuth, req);

      expect(nextError).toBeInstanceOf(ApiError);
      expect((nextError as ApiError).statusCode).toBe(401);
    });

    it("rejects requests with malformed Bearer header (no token)", async () => {
      const req = createMockRequest({ authorization: "Bearer " });
      const { nextError } = await callMiddleware(requireAuth, req);

      expect(nextError).toBeInstanceOf(ApiError);
      expect((nextError as ApiError).statusCode).toBe(401);
    });

    it("rejects requests with invalid Firebase ID token", async () => {
      const req = createMockRequest({ authorization: "Bearer invalid-token" });
      const { nextError } = await callMiddleware(requireAuth, req);

      expect(nextError).toBeInstanceOf(ApiError);
      expect((nextError as ApiError).statusCode).toBe(401);
    });

    it("rejects requests when verifier throws a network/internal error", async () => {
      const req = createMockRequest({ authorization: "Bearer throw-token" });
      const { nextError } = await callMiddleware(requireAuth, req);

      expect(nextError).toBeInstanceOf(ApiError);
      expect((nextError as ApiError).statusCode).toBe(401);
    });

    it("accepts valid Firebase ID token and sets req.user", async () => {
      const req = createMockRequest({ authorization: "Bearer valid-user-token" });
      const { nextError } = await callMiddleware(requireAuth, req);

      expect(nextError).toBeUndefined();
      expect(req.user).toBeDefined();
      expect(req.user?.uid).toBe("user-123");
      expect(req.user?.email).toBe("user@example.com");
      expect(req.user?.name).toBe("Test User");
    });

    it("surfaces admin custom claim on req.user", async () => {
      const req = createMockRequest({ authorization: "Bearer valid-admin-token" });
      await callMiddleware(requireAuth, req);

      expect(req.user?.uid).toBe("admin-456");
      expect(req.user?.admin).toBe(true);
      expect(req.user?.boardModerator).toBe(false);
    });

    it("surfaces boardModerator custom claim on req.user", async () => {
      const req = createMockRequest({ authorization: "Bearer valid-moderator-token" });
      await callMiddleware(requireAuth, req);

      expect(req.user?.uid).toBe("mod-789");
      expect(req.user?.boardModerator).toBe(true);
      expect(req.user?.admin).toBe(false);
    });

    it("surfaces both admin and boardModerator claims", async () => {
      const req = createMockRequest({ authorization: "Bearer valid-admin-and-mod-token" });
      await callMiddleware(requireAuth, req);

      expect(req.user?.admin).toBe(true);
      expect(req.user?.boardModerator).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // optionalAuth
  // -----------------------------------------------------------------------

  describe("optionalAuth", () => {
    it("proceeds without req.user when no Authorization header", async () => {
      const req = createMockRequest({});
      const { nextError } = await callMiddleware(optionalAuth, req);

      expect(nextError).toBeUndefined();
      expect(req.user).toBeUndefined();
    });

    it("proceeds without req.user when Authorization header is malformed", async () => {
      const req = createMockRequest({ authorization: "Basic abc" });
      const { nextError } = await callMiddleware(optionalAuth, req);

      expect(nextError).toBeUndefined();
      expect(req.user).toBeUndefined();
    });

    it("sets req.user when valid Bearer token is present", async () => {
      const req = createMockRequest({ authorization: "Bearer valid-user-token" });
      const { nextError } = await callMiddleware(optionalAuth, req);

      expect(nextError).toBeUndefined();
      expect(req.user?.uid).toBe("user-123");
    });

    it("rejects with 401 when Bearer token is present but invalid", async () => {
      const req = createMockRequest({ authorization: "Bearer invalid-token" });
      const { nextError } = await callMiddleware(optionalAuth, req);

      // optionalAuth should still reject an explicitly invalid token —
      // a malformed token is worse than no token.
      expect(nextError).toBeInstanceOf(ApiError);
      expect((nextError as ApiError).statusCode).toBe(401);
    });
  });

  // -----------------------------------------------------------------------
  // requireBoardRole
  // -----------------------------------------------------------------------

  describe("requireBoardRole", () => {
    it("rejects when req.user is not set (no prior auth)", async () => {
      const req = createMockRequest({});

      // requireBoardRole expects requireAuth to have run first.
      // If req.user is missing, it should return 401.
      const { nextError } = await callMiddleware(requireBoardRole("admin"), req);

      expect(nextError).toBeInstanceOf(ApiError);
      expect((nextError as ApiError).statusCode).toBe(401);
    });

    it("rejects when user lacks required admin claim", async () => {
      const req = createMockRequest({ authorization: "Bearer valid-user-token" });
      await callMiddleware(requireAuth, req);

      const { nextError } = await callMiddleware(requireBoardRole("admin"), req);

      expect(nextError).toBeInstanceOf(ApiError);
      expect((nextError as ApiError).statusCode).toBe(403);
      expect((nextError as ApiError).code).toBe("forbidden");
    });

    it("accepts when user has required admin claim", async () => {
      const req = createMockRequest({ authorization: "Bearer valid-admin-token" });
      await callMiddleware(requireAuth, req);

      const { nextError } = await callMiddleware(requireBoardRole("admin"), req);

      expect(nextError).toBeUndefined();
    });

    it("rejects when user lacks required boardModerator claim", async () => {
      const req = createMockRequest({ authorization: "Bearer valid-user-token" });
      await callMiddleware(requireAuth, req);

      const { nextError } = await callMiddleware(requireBoardRole("boardModerator"), req);

      expect(nextError).toBeInstanceOf(ApiError);
      expect((nextError as ApiError).statusCode).toBe(403);
    });

    it("accepts when user has required boardModerator claim", async () => {
      const req = createMockRequest({ authorization: "Bearer valid-moderator-token" });
      await callMiddleware(requireAuth, req);

      const { nextError } = await callMiddleware(requireBoardRole("boardModerator"), req);

      expect(nextError).toBeUndefined();
    });

    it("accepts admin when requireBoardRole('boardModerator') — admin implies moderator access", async () => {
      const req = createMockRequest({ authorization: "Bearer valid-admin-token" });
      await callMiddleware(requireAuth, req);

      const { nextError } = await callMiddleware(requireBoardRole("boardModerator"), req);

      // Admin claim should satisfy boardModerator requirement (admin has full moderation).
      expect(nextError).toBeUndefined();
    });

    it("rejects moderator when requireBoardRole('admin') — moderator does not imply admin", async () => {
      const req = createMockRequest({ authorization: "Bearer valid-moderator-token" });
      await callMiddleware(requireAuth, req);

      const { nextError } = await callMiddleware(requireBoardRole("admin"), req);

      expect(nextError).toBeInstanceOf(ApiError);
      expect((nextError as ApiError).statusCode).toBe(403);
    });

    it("accepts any authenticated user when requireBoardRole('any')", async () => {
      const req = createMockRequest({ authorization: "Bearer valid-user-token" });
      await callMiddleware(requireAuth, req);

      const { nextError } = await callMiddleware(requireBoardRole("any"), req);

      expect(nextError).toBeUndefined();
    });

    it("accepts admin when requireBoardRole('any')", async () => {
      const req = createMockRequest({ authorization: "Bearer valid-admin-token" });
      await callMiddleware(requireAuth, req);

      const { nextError } = await callMiddleware(requireBoardRole("any"), req);

      expect(nextError).toBeUndefined();
    });

    it("accepts moderator when requireBoardRole('any')", async () => {
      const req = createMockRequest({ authorization: "Bearer valid-moderator-token" });
      await callMiddleware(requireAuth, req);

      const { nextError } = await callMiddleware(requireBoardRole("any"), req);

      expect(nextError).toBeUndefined();
    });

    it("rejects with 401 when requireBoardRole('any') and no prior auth", async () => {
      const req = createMockRequest({});

      const { nextError } = await callMiddleware(requireBoardRole("any"), req);

      expect(nextError).toBeInstanceOf(ApiError);
      expect((nextError as ApiError).statusCode).toBe(401);
    });
  });

  // -----------------------------------------------------------------------
  // Log redaction
  // -----------------------------------------------------------------------

  describe("log redaction", () => {
    it("error messages do not contain the raw token", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const req = createMockRequest({ authorization: "Bearer invalid-token" });

      const { nextError } = await callMiddleware(requireAuth, req);

      expect(nextError).toBeInstanceOf(ApiError);
      // The error message should not leak the token value.
      const err = nextError as ApiError;
      expect(err.message).not.toContain("invalid-token");

      // Console output (if any) should not contain the token.
      const consoleCalls = consoleSpy.mock.calls.map((c) => JSON.stringify(c));
      for (const call of consoleCalls) {
        expect(call).not.toContain("invalid-token");
      }

      consoleSpy.mockRestore();
    });
  });
});