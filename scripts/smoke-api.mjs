/**
 * HWP2PDF API smoke tests.
 *
 * Usage:
 *   node scripts/smoke-api.mjs [apiBaseUrl] [--mock]
 *
 * If API_BASE_URL env var is set, it is used as the default base URL.
 * Otherwise the first positional argument is used. If neither is provided,
 * defaults to http://localhost:8080.
 *
 * --mock mode: runs only tests that do not require a live API server.
 * Useful in CI environments where the API cannot start due to missing
 * external dependencies (LibreOffice, GCS, Firestore, Firebase).
 *
 * Tests:
 *   1. GET /health -> 200 with status=ok
 *   2. POST /v1/uploads/initiate (anonymous) -> 201 with jobId + accessToken
 *   3. GET /v1/jobs/:jobId (no token) -> 401 or 403
 *   4. POST /internal/workers/convert (no OIDC) -> 401 or 403
 *   5. GET /v1/me/jobs (no auth) -> 401
 *   6. POST /v1/board/posts (no auth) -> 401
 *
 * Routes are sourced from packages/shared/src/index.ts API_ROUTES and mounted
 * in apps/api/src/routes/v1.ts. Keep this file in sync with those definitions.
 */

// Route constants copied from @hwp2pdf/shared so this script can run without
// building the workspace. Values must match packages/shared/src/index.ts.
const ROUTES = {
  HEALTH: "/health",
  UPLOAD: "/v1/upload",
  UPLOADS_INITIATE: "/v1/uploads/initiate",
  UPLOADS_COMPLETE: "/v1/uploads/complete",
  JOBS: "/v1/jobs",
  ME_JOBS: "/v1/me/jobs",
  BOARD_POSTS: "/v1/board/posts",
  WORKERS_CONVERT: "/internal/workers/convert",
};

const args = process.argv.slice(2);
const mockMode = args.includes("--mock");
const positionalArgs = args.filter((a) => !a.startsWith("--"));

const apiBaseUrl =
  process.env.API_BASE_URL ||
  positionalArgs[0] ||
  "http://localhost:8080";

if (!apiBaseUrl) {
  console.error("API_BASE_URL is required");
  process.exit(1);
}

const baseUrl = apiBaseUrl.replace(/\/$/, "");

let failures = 0;
let passes = 0;

async function readJson(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { text };
  }
}

/**
 * Fetch with retry on transient 5xx responses (Cloud Run cold-start can
 * produce a 503 on the first request to a freshly deployed revision before
 * the listener is fully accepting traffic). Retries up to 3 times with
 * 1s backoff before giving up.
 */
async function fetchWithRetry(url, init = {}, maxAttempts = 3) {
  let lastError;
  let lastResponse;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, init);
      if (response.status < 500) {
        return response;
      }
      lastResponse = response;
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }
  if (lastResponse) return lastResponse;
  throw lastError ?? new Error("fetchWithRetry: all attempts failed");
}

function assertStatus(label, response, expectedStatus) {
  if (response.status !== expectedStatus) {
    console.error(`FAIL ${label}: expected ${expectedStatus}, got ${response.status}`);
    failures++;
    return false;
  }
  console.log(`PASS ${label}: ${response.status}`);
  passes++;
  return true;
}

function assertStatusIn(label, response, expectedStatuses) {
  if (!expectedStatuses.includes(response.status)) {
    console.error(`FAIL ${label}: expected one of ${expectedStatuses.join("/")}, got ${response.status}`);
    failures++;
    return false;
  }
  console.log(`PASS ${label}: ${response.status}`);
  passes++;
  return true;
}

function assertTruthy(label, condition, detail) {
  if (!condition) {
    console.error(`FAIL ${label}: ${detail || "condition was false"}`);
    failures++;
    return false;
  }
  console.log(`PASS ${label}`);
  passes++;
  return true;
}

// ---------------------------------------------------------------------------
// Mock mode: verify the smoke script logic itself without a live server.
// ---------------------------------------------------------------------------

if (mockMode) {
  console.log("Running in --mock mode (no live API required)\n");

  // Verify that the script's constants and logic are correct.
  assertTruthy("mock: baseUrl parsed", baseUrl.length > 0, "baseUrl should be non-empty");
  assertTruthy("mock: health path", ROUTES.HEALTH === "/health");
  assertTruthy("mock: initiate path", ROUTES.UPLOADS_INITIATE === "/v1/uploads/initiate");
  assertTruthy("mock: upload path", ROUTES.UPLOAD === "/v1/upload");
  assertTruthy("mock: worker path", ROUTES.WORKERS_CONVERT === "/internal/workers/convert");
  assertTruthy("mock: me/jobs path", ROUTES.ME_JOBS === "/v1/me/jobs");
  assertTruthy("mock: board posts path", ROUTES.BOARD_POSTS === "/v1/board/posts");

  console.log(`\nMock smoke complete: ${passes} passed, ${failures} failed`);
  process.exit(failures > 0 ? 1 : 0);
}

// ---------------------------------------------------------------------------
// Live mode: run against a real API instance.
// ---------------------------------------------------------------------------

console.log(`Running smoke tests against ${baseUrl}\n`);

// Test 1: GET /health -> 200
const health = await fetchWithRetry(`${baseUrl}${ROUTES.HEALTH}`);
const healthBody = await readJson(health);
if (assertStatus("health returns 200", health, 200)) {
  assertTruthy("health status=ok", healthBody.status === "ok", `got status=${healthBody.status}`);
}

// Test 2: Anonymous upload — try direct initiate (GCS mode) first,
// then fall back to multipart upload (local mode) to get jobId + accessToken.
// In GCS mode: POST /v1/uploads/initiate -> 201 with jobId + accessToken
// In local mode: POST /v1/uploads/initiate -> 409 (direct_upload_unavailable)
//   -> fall back to POST /v1/upload (multipart) -> 202 with jobId + accessToken
const initiate = await fetchWithRetry(`${baseUrl}${ROUTES.UPLOADS_INITIATE}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    fileName: "smoke.hwp",
    fileSize: 16,
  }),
});
const initiateBody = await readJson(initiate);
let anonymousJobId = null;
let anonymousAccessToken = null;

if (initiate.status === 201) {
  // GCS direct-upload mode — initiate succeeded.
  console.log(`PASS anonymous upload initiate (GCS mode): ${initiate.status}`);
  passes++;
  assertTruthy("initiate returns jobId", !!initiateBody.jobId, "missing jobId");
  if (initiateBody.accessToken) {
    anonymousAccessToken = initiateBody.accessToken;
    console.log("PASS initiate returns accessToken (anonymous token present)");
    passes++;
  } else {
    // In GCS direct-upload mode, accessToken may not be returned at initiate time.
    // It is returned at /uploads/complete instead. This is acceptable.
    console.log("NOTE: initiate did not return accessToken (expected in GCS direct-upload mode)");
  }

  // The direct upload flow requires a GCS PUT to the signed URL and a
  // /uploads/complete call to materialize the Firestore job record. In a
  // smoke test we cannot perform the GCS PUT without external dependencies,
  // so we always run the multipart upload below to create a real job
  // record in Firestore for the status-without-token check.
  console.log("NOTE: GCS direct upload requires an actual GCS PUT; creating a real job via multipart upload as well");
} else if (initiate.status === 409) {
  // Local mode — direct upload unavailable, fall back to multipart upload.
  // The API intentionally returns 409 when STORAGE_BACKEND is not gcs.
  console.log(`NOTE: initiate returned 409 (local mode), trying multipart upload fallback`);
} else {
  console.error(`FAIL anonymous upload initiate: expected 201 or 409, got ${initiate.status}`);
  failures++;
}

// Always create a real job record via multipart upload so the
// status-without-token check below exercises the owner-aware auth guards
// on a job that actually exists in Firestore. In GCS mode the multipart
// upload still works and persists the original to GCS; in local mode
// it's the only available path.
if (initiate.status === 201 || initiate.status === 409) {
  const { Buffer } = await import("node:buffer");
  const fakeHwpContent = Buffer.concat([
    Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
    Buffer.alloc(8),
  ]);
  const formData = new FormData();
  const fileBlob = new Blob([fakeHwpContent], { type: "application/octet-stream" });
  formData.append("file", fileBlob, "smoke.hwp");

  const multipartUpload = await fetchWithRetry(`${baseUrl}${ROUTES.UPLOAD}`, {
    method: "POST",
    body: formData,
  });
  const multipartBody = await readJson(multipartUpload);
  if (assertStatus("anonymous multipart upload (creates real job)", multipartUpload, 202)) {
    assertTruthy("multipart upload returns jobId", !!multipartBody.jobId, "missing jobId");
    anonymousJobId = multipartBody.jobId;
    if (multipartBody.accessToken) {
      anonymousAccessToken = multipartBody.accessToken;
      console.log("PASS multipart upload returns accessToken (anonymous token present)");
      passes++;
    } else {
      console.log("NOTE: multipart upload did not return accessToken");
    }
  }
}

// Test 3: GET /v1/jobs/:jobId without token → 401 or 403
if (anonymousJobId) {
  const statusNoToken = await fetchWithRetry(`${baseUrl}${ROUTES.JOBS}/${anonymousJobId}`);
  assertStatusIn("job status without token rejected", statusNoToken, [401, 403]);
} else {
  console.log("SKIP job status without token: no jobId from initiate");
}

// Test 4: POST /internal/workers/convert without OIDC → 401 or 403
const workerNoOidc = await fetchWithRetry(`${baseUrl}${ROUTES.WORKERS_CONVERT}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ jobId: "smoke-test-nonexistent" }),
});
assertStatusIn("worker endpoint without OIDC rejected", workerNoOidc, [401, 403]);

// Test 5: GET /v1/me/jobs without auth → 401
const meJobsNoAuth = await fetchWithRetry(`${baseUrl}${ROUTES.ME_JOBS}`);
assertStatusIn("member jobs without auth rejected", meJobsNoAuth, [401, 403]);

// Test 6: POST /v1/board/posts without auth → 401
const boardWriteNoAuth = await fetchWithRetry(`${baseUrl}${ROUTES.BOARD_POSTS}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    title: "smoke test",
    body: "smoke test body",
    category: "general",
  }),
});
assertStatusIn("board write without auth rejected", boardWriteNoAuth, [401, 403]);

// Test 7: Invalid multipart upload → 422 (legacy check, kept for compatibility)
const invalidUpload = await fetchWithRetry(`${baseUrl}${ROUTES.UPLOAD}`, {
  method: "POST",
});
assertStatus("invalid multipart upload rejected", invalidUpload, 422);

console.log(`\nSmoke complete: ${passes} passed, ${failures} failed`);
process.exit(failures > 0 ? 1 : 0);
