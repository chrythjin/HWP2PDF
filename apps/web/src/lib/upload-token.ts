// ---------------------------------------------------------------------------
// Anonymous upload access token storage/recovery helpers.
//
// The API returns a plaintext `accessToken` exactly once at upload initiate
// time for anonymous users (decision D13). The client must persist it
// somewhere to survive page reloads, then send it back as the
// `X-Job-Access-Token` header on status/download calls.
//
// Storage strategy: sessionStorage keyed by jobId. sessionStorage is
// tab-scoped and cleared when the tab closes — appropriate for ephemeral
// anonymous access. We never put the token in the URL or query string.
// ---------------------------------------------------------------------------

const STORAGE_KEY_PREFIX = "hwp2pdf-job-";

/**
 * Build the sessionStorage key for a given jobId.
 * Exported for testing.
 */
export function buildJobTokenStorageKey(jobId: string): string {
  return `${STORAGE_KEY_PREFIX}${jobId}`;
}

/**
 * Persist the anonymous access token for a jobId to sessionStorage.
 * No-ops gracefully if sessionStorage is unavailable (SSR, disabled storage).
 */
export function saveJobAccessToken(jobId: string, accessToken: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(buildJobTokenStorageKey(jobId), accessToken);
  } catch {
    // sessionStorage may be full or disabled — silently ignore.
  }
}

/**
 * Read the persisted anonymous access token for a jobId from sessionStorage.
 * Returns null if not found or storage unavailable.
 */
export function loadJobAccessToken(jobId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(buildJobTokenStorageKey(jobId));
  } catch {
    return null;
  }
}

/**
 * Remove the persisted anonymous access token for a jobId.
 * Called after the job is completed/failed/expired or on reset.
 */
export function clearJobAccessToken(jobId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(buildJobTokenStorageKey(jobId));
  } catch {
    // ignore
  }
}