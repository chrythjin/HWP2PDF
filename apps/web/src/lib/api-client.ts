// ---------------------------------------------------------------------------
// API client utilities.
//
// `fetchWithAuth` attaches the Firebase ID token as `Authorization: Bearer`
// when a user is logged in. For anonymous calls, no Authorization header
// is added. The token is fetched fresh on each call via `getIdToken()`.
// ---------------------------------------------------------------------------

import { getFirebaseAuth } from "./firebase";
import type { User } from "firebase/auth";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export function buildApiUrl(route: string): string {
  return `${apiBaseUrl.replace(/\/$/, "")}${route}`;
}

/**
 * Fetch wrapper that attaches the Firebase ID token as a Bearer header
 * when Firebase Auth has a current user. For anonymous users, no Authorization
 * header is added.
 *
 * @param route API route path (e.g. "/v1/me/jobs") or full URL.
 * @param options Standard fetch options. Headers are merged.
 */
export function fetchWithAuth(route: string, options?: RequestInit): Promise<Response>;
export function fetchWithAuth(route: string, user: User | null, options?: RequestInit): Promise<Response>;
export async function fetchWithAuth(
  route: string,
  userOrOptions?: User | null | RequestInit,
  maybeOptions?: RequestInit,
): Promise<Response> {
  const url = route.startsWith("http") ? route : buildApiUrl(route);
  const hasExplicitUserArg = arguments.length >= 3 || userOrOptions === null;
  const explicitUser = hasExplicitUserArg ? (userOrOptions as User | null) : undefined;
  const options = ((hasExplicitUserArg ? maybeOptions : userOrOptions) ?? {}) as RequestInit;
  const headers = new Headers(options.headers);

  const user = explicitUser ?? getFirebaseAuth().currentUser;
  if (user) {
    const token = await user.getIdToken();
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(url, { ...options, headers });
}

/**
 * Get the current Firebase ID token for a user, or null if no user.
 * Useful for components that need to pass the token to other libraries.
 */
export async function getIdTokenOrNull(user: User | null): Promise<string | null> {
  if (!user) {
    return null;
  }
  return user.getIdToken();
}
