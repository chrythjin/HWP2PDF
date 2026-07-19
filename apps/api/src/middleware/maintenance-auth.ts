import type { NextFunction, Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import { ApiError } from "../utils/api-error.js";

export interface DecodedMaintenanceOidcToken {
  aud: string | string[];
  iss: string;
  sub?: string;
}

export type MaintenanceOidcVerifier = (
  token: string,
  audience: string,
) => Promise<DecodedMaintenanceOidcToken>;

let testVerifier: MaintenanceOidcVerifier | null = null;
const googleOidcClient = new OAuth2Client();

export function setMaintenanceOidcVerifierForTesting(
  verifier: MaintenanceOidcVerifier | null,
): void {
  testVerifier = verifier;
}

async function verifyGoogleOidcToken(
  token: string,
  audience: string,
): Promise<DecodedMaintenanceOidcToken> {
  const ticket = await googleOidcClient.verifyIdToken({
    idToken: token,
    audience,
  });
  const payload = ticket.getPayload();
  if (!payload?.aud || !payload.iss) {
    throw new Error("OIDC payload is missing required claims");
  }
  return { aud: payload.aud, iss: payload.iss, sub: payload.sub };
}

function hasExpectedAudience(actual: string | string[], expected: string): boolean {
  return Array.isArray(actual) ? actual.includes(expected) : actual === expected;
}

function isNumericSubject(subject: string): boolean {
  return /^\d+$/.test(subject);
}

export async function requireMaintenanceOidc(
  request: Request,
  _response: Response,
  next: NextFunction,
): Promise<void> {
  const authorization = request.header("authorization");
  if (!authorization?.startsWith("Bearer ") || !authorization.slice(7).trim()) {
    next(new ApiError(401, "unauthorized", "Maintenance 인증이 필요합니다."));
    return;
  }

  const audience = process.env.MAINTENANCE_OIDC_AUDIENCE?.trim();
  const subject = process.env.MAINTENANCE_OIDC_SUBJECT?.trim();
  const issuer = process.env.MAINTENANCE_OIDC_ISSUER?.trim() || "https://accounts.google.com";
  if (!audience || !subject || !isNumericSubject(subject)) {
    next(new ApiError(503, "maintenance_not_configured", "Maintenance 인증이 구성되지 않았습니다."));
    return;
  }

  try {
    const verify = testVerifier ?? verifyGoogleOidcToken;
    const decoded = await verify(authorization.slice(7).trim(), audience);
    if (!hasExpectedAudience(decoded.aud, audience)) {
      next(new ApiError(403, "forbidden", "Maintenance token audience가 일치하지 않습니다."));
      return;
    }
    if (decoded.iss !== issuer) {
      next(new ApiError(403, "forbidden", "Maintenance token issuer가 일치하지 않습니다."));
      return;
    }
    if (decoded.sub !== subject) {
      next(new ApiError(403, "forbidden", "Maintenance token subject가 일치하지 않습니다."));
      return;
    }
    next();
  } catch {
    next(new ApiError(403, "forbidden", "Maintenance 인증 토큰이 유효하지 않습니다."));
  }
}
