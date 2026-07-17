// ---------------------------------------------------------------------------
// OIDC token verification for Cloud Tasks worker endpoint (Todo 6).
//
// Cloud Tasks generates an OIDC JWT in the Authorization: Bearer header when
// invoking the worker endpoint. The worker must verify:
//   1. The token is a valid JWT signed by Google.
//   2. The audience matches the expected worker audience.
//   3. The issuer is accounts.google.com.
//   4. The email claim matches the configured service account email.
//
// In mock/test mode (FIREBASE_ADMIN_MODE=mock), the verifier accepts a
// special `mock_oidc_token_<base64url(json)>` token format for testing.
// ---------------------------------------------------------------------------

import { config } from "../config.js";
import { createInternalWorkerUrl } from "../services/cloud-tasks-dispatcher.js";
import { ApiError } from "../utils/api-error.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DecodedOidcToken {
  aud: string;
  iss: string;
  email?: string;
  sub?: string;
  exp?: number;
  iat?: number;
}

export type OidcTokenVerifier = (token: string) => Promise<DecodedOidcToken>;

// ---------------------------------------------------------------------------
// Test override
// ---------------------------------------------------------------------------

let testOidcVerifier: OidcTokenVerifier | null = null;

/**
 * Inject a mock OIDC token verifier for unit tests.
 * Pass null to reset.
 */
export function setOidcVerifierForTesting(verifier: OidcTokenVerifier | null): void {
  testOidcVerifier = verifier;
}

// ---------------------------------------------------------------------------
// Mock OIDC token verifier
// ---------------------------------------------------------------------------

const MOCK_OIDC_PREFIX = "mock_oidc_token_";

/**
 * Mock OIDC token verifier for test mode.
 *
 * Accepts tokens of the form:
 *   mock_oidc_token_<base64url-encoded-json-payload>
 *
 * The JSON payload must contain at least `aud`. Optional fields: `iss`,
 * `email`, `sub`, `exp`, `iat`.
 */
async function mockVerifyOidcToken(token: string): Promise<DecodedOidcToken> {
  if (!token.startsWith(MOCK_OIDC_PREFIX)) {
    throw new Error("mock OIDC: token does not have mock_oidc_token_ prefix");
  }

  const payloadB64 = token.slice(MOCK_OIDC_PREFIX.length);
  let payload: DecodedOidcToken;
  try {
    const json = Buffer.from(payloadB64, "base64url").toString("utf8");
    payload = JSON.parse(json) as DecodedOidcToken;
  } catch {
    throw new Error("mock OIDC: token payload is not valid JSON");
  }

  if (!payload.aud) {
    throw new Error("mock OIDC: token payload missing aud");
  }

  return payload;
}

/**
 * Build a mock OIDC token string for use in tests.
 */
export function buildMockOidcToken(payload: DecodedOidcToken): string {
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json, "utf8").toString("base64url");
  return `${MOCK_OIDC_PREFIX}${b64}`;
}

// ---------------------------------------------------------------------------
// Real OIDC token verification (production)
// ---------------------------------------------------------------------------

/**
 * Verify an OIDC JWT token using Google's public keys.
 *
 * In production, this uses the `google-auth-library` to verify the token.
 * The library is dynamically imported to avoid a hard dependency in test/dev.
 */
async function realVerifyOidcToken(token: string): Promise<DecodedOidcToken> {
  // Dynamic import via Function to avoid TypeScript module resolution
  // when google-auth-library is not installed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod = await (new Function("return import('google-auth-library')")() as Promise<any>);
  const { OAuth2Client } = mod;

  const client = new OAuth2Client();
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: getExpectedAudience(),
  });
  const payload = ticket.getPayload();
  if (!payload) {
    throw new Error("OIDC token payload is empty");
  }

  return {
    aud: payload.aud ?? "",
    iss: payload.iss ?? "",
    email: payload.email,
    sub: payload.sub,
    exp: payload.exp,
    iat: payload.iat,
  };
}

// ---------------------------------------------------------------------------
// Verifier resolution
// ---------------------------------------------------------------------------

function getFirebaseAdminMode(): string {
  return process.env.FIREBASE_ADMIN_MODE ?? config.firebaseAdminMode;
}

/**
 * Get the OIDC token verifier function.
 *
 * Priority:
 *   1. Test override (setOidcVerifierForTesting)
 *   2. Mock mode verifier (FIREBASE_ADMIN_MODE=mock)
 *   3. Real google-auth-library verifier
 */
export async function getOidcTokenVerifier(): Promise<OidcTokenVerifier> {
  if (testOidcVerifier) {
    return testOidcVerifier;
  }

  if (getFirebaseAdminMode() === "mock") {
    return mockVerifyOidcToken;
  }

  return realVerifyOidcToken;
}

// ---------------------------------------------------------------------------
// Audience/issuer helpers
// ---------------------------------------------------------------------------

/**
 * The expected OIDC audience for the worker endpoint.
 * Defaults to the worker URL if not explicitly configured.
 */
export function getExpectedAudience(): string {
  return (
    process.env.INTERNAL_WORKER_AUDIENCE
    || config.internalWorkerAudience
    || createInternalWorkerUrl()
  );
}

/**
 * The expected OIDC issuer. Defaults to the standard Google issuer.
 */
export function getExpectedIssuer(): string {
  return process.env.INTERNAL_WORKER_ISSUER || config.internalWorkerIssuer || "https://accounts.google.com";
}

/**
 * The expected service account email. Converter-only mode must configure this
 * value; the public monolith keeps its legacy compatibility behavior until a
 * separate converter is cut over.
 */
export function getExpectedServiceAccountEmail(): string | null {
  return process.env.CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL || config.cloudTasksServiceAccountEmail || null;
}

// ---------------------------------------------------------------------------
// Express middleware: requireWorkerOidc
// ---------------------------------------------------------------------------

const BEARER_PREFIX = "Bearer ";

/**
 * Require a valid Cloud Tasks OIDC token in the Authorization header.
 *
 * Verifies:
 *   1. Bearer token is present.
 *   2. Token is a valid JWT signed by Google.
 *   3. Audience matches the expected worker audience.
 *   4. Issuer matches the expected Google issuer.
 *   5. Email matches the configured service account email (if set).
 *
 * Rejects with:
 *   - 401 if no Authorization header or no Bearer token.
 *   - 403 if token is invalid, audience/issuer/email mismatch.
 */
export async function requireWorkerOidc(
  req: import("express").Request,
  _res: import("express").Response,
  next: import("express").NextFunction,
): Promise<void> {
  const authHeader = req.header("authorization");
  if (!authHeader || !authHeader.startsWith(BEARER_PREFIX)) {
    next(new ApiError(401, "unauthorized", "Worker 인증이 필요합니다."));
    return;
  }

  const token = authHeader.slice(BEARER_PREFIX.length).trim();
  if (!token) {
    next(new ApiError(401, "unauthorized", "Worker 인증 토큰이 비어있습니다."));
    return;
  }

  try {
    const verify = await getOidcTokenVerifier();
    const decoded = await verify(token);

    // Verify audience
    const expectedAudience = getExpectedAudience();
    if (decoded.aud !== expectedAudience) {
      next(new ApiError(403, "forbidden", "Worker 토큰 audience가 일치하지 않습니다."));
      return;
    }

    // Verify issuer
    const expectedIssuer = getExpectedIssuer();
    if (!decoded.iss || decoded.iss !== expectedIssuer) {
      next(new ApiError(403, "forbidden", "Worker 토큰 issuer가 일치하지 않습니다."));
      return;
    }

    // A converter that cannot identify its Cloud Tasks OIDC subject must never
    // accept a worker request. This prevents a deployment configuration error
    // from silently weakening the audience/issuer/email triple match.
    const expectedEmail = getExpectedServiceAccountEmail();
    if ((process.env.CONVERTER_ONLY === "true" || config.converterOnly) && !expectedEmail) {
      next(new ApiError(503, "worker_identity_unavailable", "Worker 서비스 계정 설정이 필요합니다."));
      return;
    }

    // Verify service account email when configured.
    if (expectedEmail && decoded.email !== expectedEmail) {
      next(new ApiError(403, "forbidden", "Worker 서비스 계정이 일치하지 않습니다."));
      return;
    }

    next();
  } catch {
    next(new ApiError(403, "forbidden", "Worker 인증 토큰이 유효하지 않습니다."));
  }
}
