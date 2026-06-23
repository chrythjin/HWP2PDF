// ---------------------------------------------------------------------------
// Firebase Admin initialization and ID token verification.
//
// This module centralizes Firebase Admin SDK lifecycle so middleware and
// other services can share a single initialized app. It supports three
// initialization modes (decision D1/D13):
//
//   - "adc": Application Default Credentials (Cloud Run / GCE production).
//   - "service-account": Service account key file fallback (local/non-GCP).
//   - "mock": Test mode — no real Firebase calls. verifyIdToken is stubbed
//     and accepts tokens prefixed with `mock_id_token_`. The role claim is
//     parsed from the JSON payload segment.
//
// Guardrail: tokens are never logged in plaintext. Error messages and logs
// use redacted values only.
// ---------------------------------------------------------------------------

import { config } from "../config.js";
import { redactToken } from "../utils/access-token.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Decoded Firebase ID token shape (subset we consume). */
export interface DecodedFirebaseToken {
  uid: string;
  email?: string;
  name?: string;
  /** Firebase custom claim: full admin. */
  admin?: boolean;
  /** Firebase custom claim: board moderator. */
  boardModerator?: boolean;
}

/** Function that verifies a Firebase ID token and returns decoded claims. */
export type TokenVerifier = (idToken: string) => Promise<DecodedFirebaseToken>;

// ---------------------------------------------------------------------------
// Test override
// ---------------------------------------------------------------------------

let testVerifier: TokenVerifier | null = null;

/**
 * Inject a mock token verifier for unit tests.
 *
 * When set, this bypasses firebase-admin entirely, so tests never need real
 * Firebase credentials or network access. Pass null to reset.
 */
export function setTokenVerifierForTesting(verifier: TokenVerifier | null): void {
  testVerifier = verifier;
}

// ---------------------------------------------------------------------------
// Firebase Admin initialization (lazy singleton)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let firebaseApp: { auth: () => { verifyIdToken: TokenVerifier } } | any = null;
let initAttempted = false;

/**
 * Resolve the credential for Firebase Admin initialization.
 *
 * - ADC mode: returns undefined — firebase-admin auto-discovers credentials.
 * - Service-account mode: loads the key from FIREBASE_PRIVATE_KEY_PATH or
 *   from GOOGLE_APPLICATION_CREDENTIALS_JSON (inline JSON string).
 */
function resolveCredential(): unknown {
  if (config.firebaseAdminMode === "adc") {
    return undefined;
  }

  if (config.firebaseAdminMode === "service-account") {
    // Priority: file path > inline JSON env var.
    if (config.firebasePrivateKeyPath) {
      try {
        // Dynamic import deferred to init time so tests don't need the file.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fs = require("node:fs");
        const key = JSON.parse(fs.readFileSync(config.firebasePrivateKeyPath, "utf8"));
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const admin = require("firebase-admin");
        return admin.credential.cert(key);
      } catch {
        // If the key file is missing/invalid, fall back to inline JSON or ADC.
      }
    }

    if (config.googleApplicationCredentialsJson) {
      try {
        const raw = config.googleApplicationCredentialsJson;
        // Support base64-encoded JSON (for safe env var transport) or raw JSON.
        const jsonStr = raw.trim().startsWith("{")
          ? raw
          : Buffer.from(raw, "base64").toString("utf8");
        const key = JSON.parse(jsonStr);
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const admin = require("firebase-admin");
        return admin.credential.cert(key);
      } catch {
        // If the inline JSON is invalid, fall back to ADC.
      }
    }
  }

  return undefined;
}

/**
 * Initialize the Firebase Admin SDK and return the app instance.
 * Called lazily on first token verification.
 */
async function initializeFirebaseApp(): Promise<void> {
  if (initAttempted) return;
  initAttempted = true;

  try {
    const admin = await import("firebase-admin");
    const credential = resolveCredential();
    if (credential) {
      firebaseApp = admin.initializeApp({
        credential: credential as never,
        projectId: config.firebaseProjectId || undefined,
        databaseURL: config.firebaseDatabaseUrl || undefined,
      });
    } else {
      firebaseApp = admin.initializeApp({
        projectId: config.firebaseProjectId || undefined,
        databaseURL: config.firebaseDatabaseUrl || undefined,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    console.error(
      JSON.stringify({
        level: "error",
        message: "Firebase Admin initialization failed",
        detail: redactToken(message),
      }),
    );
    throw new Error("Firebase Admin initialization failed");
  }
}

/**
 * Resolve the current Firebase Admin mode dynamically.
 *
 * Checks `process.env.FIREBASE_ADMIN_MODE` first (allows tests to override
 * at runtime), then falls back to the static config value.
 */
function getFirebaseAdminMode(): string {
  return process.env.FIREBASE_ADMIN_MODE ?? config.firebaseAdminMode;
}

/**
 * Get the token verifier function.
 *
 * Priority:
 *   1. Test override (setTokenVerifierForTesting)
 *   2. Mock mode verifier (accepts `mock_id_token_` prefixed tokens)
 *   3. Real firebase-admin verifyIdToken
 */
export async function getTokenVerifier(): Promise<TokenVerifier> {
  if (testVerifier) {
    return testVerifier;
  }

  if (getFirebaseAdminMode() === "mock") {
    return mockVerifyIdToken;
  }

  await initializeFirebaseApp();

  if (!firebaseApp) {
    throw new Error("Firebase Admin is not initialized");
  }

  return firebaseApp.auth().verifyIdToken as TokenVerifier;
}

// ---------------------------------------------------------------------------
// Mock token verifier (for FIREBASE_ADMIN_MOCK=true mode)
// ---------------------------------------------------------------------------

const MOCK_TOKEN_PREFIX = "mock_id_token_";

/**
 * Mock verifyIdToken implementation for test mode.
 *
 * Accepts tokens of the form:
 *   mock_id_token_<base64url-encoded-json-payload>
 *
 * The JSON payload must contain at least `uid`. Optional fields: `email`,
 * `name`, `admin`, `boardModerator`.
 *
 * Any token not matching the prefix or containing invalid JSON is rejected.
 */
async function mockVerifyIdToken(idToken: string): Promise<DecodedFirebaseToken> {
  if (!idToken.startsWith(MOCK_TOKEN_PREFIX)) {
    const err = new Error("mock: token does not have mock_id_token_ prefix");
    (err as Error & { code?: string }).code = "auth/invalid-id-token";
    throw err;
  }

  const payloadB64 = idToken.slice(MOCK_TOKEN_PREFIX.length);
  let payload: DecodedFirebaseToken;
  try {
    const json = Buffer.from(payloadB64, "base64url").toString("utf8");
    payload = JSON.parse(json) as DecodedFirebaseToken;
  } catch {
    const err = new Error("mock: token payload is not valid JSON");
    (err as Error & { code?: string }).code = "auth/invalid-id-token";
    throw err;
  }

  if (!payload.uid) {
    const err = new Error("mock: token payload missing uid");
    (err as Error & { code?: string }).code = "auth/invalid-id-token";
    throw err;
  }

  return payload;
}

/**
 * Build a mock ID token string for use in tests.
 *
 * @param payload - Decoded token claims.
 * @returns A string of the form `mock_id_token_<base64url(json)>`.
 */
export function buildMockIdToken(payload: DecodedFirebaseToken): string {
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json, "utf8").toString("base64url");
  return `${MOCK_TOKEN_PREFIX}${b64}`;
}

/**
 * Reset the lazy initialization state. Intended for test isolation only.
 */
export function resetFirebaseAdminForTesting(): void {
  firebaseApp = null;
  initAttempted = false;
}
