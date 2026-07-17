// ---------------------------------------------------------------------------
// API client utilities.
//
// `fetchWithAuth` attaches the Firebase ID token as `Authorization: Bearer`
// when a user is logged in. For anonymous calls, pass `null` as the user
// argument and no Authorization header is added.
// ---------------------------------------------------------------------------

import type { User } from "firebase/auth";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export type ApiClientErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "server_error"
  | "http_error"
  | "network_error"
  | "malformed_body";

export type ApiPageState =
  | "idle"
  | "loading"
  | "success"
  | "empty"
  | "error"
  | "stale";

const ERROR_MESSAGES: Record<ApiClientErrorCode, string> = {
  unauthorized: "인증이 필요합니다.",
  forbidden: "접근 권한이 없습니다.",
  not_found: "요청한 리소스를 찾을 수 없습니다.",
  conflict: "요청을 현재 상태에서 처리할 수 없습니다.",
  rate_limited: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
  server_error: "서버에서 요청을 처리하지 못했습니다.",
  http_error: "요청을 처리하지 못했습니다.",
  network_error: "네트워크 연결을 확인해 주세요.",
  malformed_body: "서버 응답 형식이 올바르지 않습니다.",
};

export class ApiClientError extends Error {
  readonly code: ApiClientErrorCode;
  readonly status: number | null;

  constructor(code: ApiClientErrorCode, status: number | null = null) {
    super(ERROR_MESSAGES[code]);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
  }
}

export type ApiResponseGuard<T> = (value: unknown) => value is T;

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

function getHttpError(response: Response): ApiClientError | null {
  if (response.ok) return null;
  if (response.status === 401) return new ApiClientError("unauthorized", response.status);
  if (response.status === 403) return new ApiClientError("forbidden", response.status);
  if (response.status === 404) return new ApiClientError("not_found", response.status);
  if (response.status === 409) return new ApiClientError("conflict", response.status);
  if (response.status === 429) return new ApiClientError("rate_limited", response.status);
  if (response.status >= 500) return new ApiClientError("server_error", response.status);
  return new ApiClientError("http_error", response.status);
}

async function requestWithAuth(
  route: string,
  user: User | null,
  options?: RequestInit,
): Promise<Response> {
  let response: Response;
  try {
    response = await fetchWithAuth(route, user, options);
  } catch {
    throw new ApiClientError("network_error");
  }

  const httpError = getHttpError(response);
  if (httpError) throw httpError;
  return response;
}

export async function fetchJsonWithAuth<T>(
  route: string,
  user: User | null,
  guard: ApiResponseGuard<T>,
  options?: RequestInit,
): Promise<T> {
  const response = await requestWithAuth(route, user, options);

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiClientError("malformed_body", response.status);
  }

  if (!guard(body)) {
    throw new ApiClientError("malformed_body", response.status);
  }
  return body;
}

const ALLOWED_DOWNLOAD_CONTENT_TYPES = new Set([
  "application/pdf",
  "application/octet-stream",
]);

function hasAllowedDownloadContentType(response: Response): boolean {
  const contentType = response.headers.get("Content-Type");
  if (!contentType) return false;

  const mediaType = contentType.split(";", 1)[0]?.trim().toLowerCase();
  return mediaType !== undefined && ALLOWED_DOWNLOAD_CONTENT_TYPES.has(mediaType);
}

export async function fetchBlobWithAuth(
  route: string,
  user: User | null,
  options?: RequestInit,
): Promise<Blob> {
  const response = await requestWithAuth(route, user, options);

  if (!hasAllowedDownloadContentType(response)) {
    throw new ApiClientError("malformed_body", response.status);
  }

  let body: Blob;
  try {
    body = await response.blob();
  } catch {
    throw new ApiClientError("malformed_body", response.status);
  }

  if (body.size === 0) {
    throw new ApiClientError("malformed_body", response.status);
  }
  return body;
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
