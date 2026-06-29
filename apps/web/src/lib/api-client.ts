// ---------------------------------------------------------------------------
// API client utilities.
//
// `fetchWithAuth` attaches the Firebase ID token as `Authorization: Bearer`
// when a user is logged in. For anonymous calls, pass `null` as the user
// argument and no Authorization header is added.
// ---------------------------------------------------------------------------

import type { User } from "firebase/auth";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export function buildApiUrl(route: string): string {
  return `${apiBaseUrl.replace(/\/$/, "")}${route}`;
}

/**
 * Fetch wrapper that attaches the Firebase ID token as a Bearer header
 * when a user is provided. For anonymous users, pass `null`.
 *
 * The caller MUST explicitly pass the `user` argument — this function does
 * NOT fall back to `getFirebaseAuth().currentUser` because that can cause
 * race conditions between React state and Firebase's internal state.
 *
 * @param route API route path (e.g. "/v1/me/jobs") or full URL.
 * @param user Firebase User object, or `null` for anonymous calls.
 * @param options Standard fetch options. Headers are merged.
 */
export async function fetchWithAuth(
  route: string,
  user: User | null,
  options?: RequestInit,
): Promise<Response> {
  const url = route.startsWith("http") ? route : buildApiUrl(route);
  const headers = new Headers(options?.headers);

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
