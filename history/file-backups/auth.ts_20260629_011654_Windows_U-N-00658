// ---------------------------------------------------------------------------
// Firebase Admin auth middleware for Express.
//
// Provides requireAuth, optionalAuth, and requireBoardRole middleware that
// verify Firebase ID tokens via the centralized firebase-admin service.
// Custom claims (admin, boardModerator) are surfaced on req.user.
//
// Initialization strategy (decision D1/D13):
//   - ADC by default (Cloud Run / GCE production).
//   - Service account key file fallback for local/non-GCP.
//   - Mock/test mode: no real Firebase calls; verifyIdToken is stubbed via
//     setTokenVerifierForTesting.
//
// Guardrail: tokens are never logged in plaintext. Error messages and logs
// use redacted values only.
// ---------------------------------------------------------------------------

import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/api-error.js";
import { redactToken } from "../utils/access-token.js";
import {
  getTokenVerifier,
  setTokenVerifierForTesting,
  type DecodedFirebaseToken,
} from "../services/firebase-admin.js";

// Re-export for backwards compatibility with existing test imports.
export { setTokenVerifierForTesting };
export type { DecodedFirebaseToken };

// ---------------------------------------------------------------------------
// Type augmentation: extend Express Request with `user`.
// ---------------------------------------------------------------------------

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  name?: string;
  /** Firebase custom claim: full admin. */
  admin: boolean;
  /** Firebase custom claim: board moderator. */
  boardModerator: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

// ---------------------------------------------------------------------------
// Token extraction and verification.
// ---------------------------------------------------------------------------

const BEARER_PREFIX = "Bearer ";

/**
 * Extract the Bearer token from the Authorization header.
 * Returns null if the header is missing or not a Bearer token.
 */
function extractBearerToken(req: Request): string | null {
  const authHeader = req.header("authorization");
  if (!authHeader) {
    return null;
  }

  if (!authHeader.startsWith(BEARER_PREFIX)) {
    return null;
  }

  const token = authHeader.slice(BEARER_PREFIX.length).trim();
  if (!token) {
    return null;
  }

  return token;
}

/**
 * Verify a Firebase ID token and return an AuthenticatedUser.
 * Throws ApiError(401) on any verification failure.
 */
async function verifyToken(token: string): Promise<AuthenticatedUser> {
  let decoded: DecodedFirebaseToken;
  try {
    const verify = await getTokenVerifier();
    decoded = await verify(token);
  } catch {
    // Never include the token in error messages or logs.
    throw new ApiError(401, "unauthorized", "인증 토큰이 유효하지 않습니다.");
  }

  if (!decoded.uid) {
    throw new ApiError(401, "unauthorized", "인증 토큰에 사용자 식별자가 없습니다.");
  }

  return {
    uid: decoded.uid,
    email: decoded.email,
    name: decoded.name,
    admin: decoded.admin === true,
    boardModerator: decoded.boardModerator === true,
  };
}

// ---------------------------------------------------------------------------
// Middleware: requireAuth
// ---------------------------------------------------------------------------

/**
 * Require a valid Firebase ID token. Sets req.user on success.
 * Rejects with 401 if the token is missing, malformed, or invalid.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = extractBearerToken(req);
  if (!token) {
    next(new ApiError(401, "unauthorized", "인증이 필요합니다."));
    return;
  }

  try {
    req.user = await verifyToken(token);
    next();
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Middleware: optionalAuth
// ---------------------------------------------------------------------------

/**
 * Optionally verify a Firebase ID token. Sets req.user on success.
 * If no Authorization header is present, proceeds without req.user.
 * If a Bearer token is present but invalid, rejects with 401 —
 * an explicitly invalid token is worse than no token.
 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = extractBearerToken(req);
  if (!token) {
    // No token present — proceed anonymously.
    next();
    return;
  }

  try {
    req.user = await verifyToken(token);
    next();
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Middleware: requireBoardRole
// ---------------------------------------------------------------------------

/**
 * Board role requirement:
 * - "admin": requires the `admin` custom claim.
 * - "boardModerator": requires `boardModerator` claim (admin implies this).
 * - "any": requires any authenticated user (just req.user being set).
 */
export type BoardRole = "admin" | "boardModerator" | "any";

/**
 * Require a specific board role (custom claim) on req.user.
 *
 * Must be used after requireAuth. If req.user is not set, returns 401.
 * If the user lacks the required claim, returns 403.
 *
 * - "admin": requires the `admin` claim.
 * - "boardModerator": requires `boardModerator` claim; admin satisfies this.
 * - "any": any authenticated user passes (just needs req.user).
 *
 * Admin claim satisfies any boardModerator requirement (admin has full
 * moderation powers). boardModerator does NOT satisfy admin requirements.
 */
export function requireBoardRole(role: BoardRole) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new ApiError(401, "unauthorized", "인증이 필요합니다."));
      return;
    }

    // "any" just requires an authenticated user.
    if (role === "any") {
      next();
      return;
    }

    const hasAdmin = req.user.admin;
    const hasModerator = req.user.boardModerator;

    if (role === "admin") {
      if (!hasAdmin) {
        next(new ApiError(403, "forbidden", "관리자 권한이 필요합니다."));
        return;
      }
    } else if (role === "boardModerator") {
      // admin implies moderator access.
      if (!hasAdmin && !hasModerator) {
        next(new ApiError(403, "forbidden", "게시판 조작 권한이 필요합니다."));
        return;
      }
    }

    next();
  };
}

// Re-export redactToken for convenience.
export { redactToken };