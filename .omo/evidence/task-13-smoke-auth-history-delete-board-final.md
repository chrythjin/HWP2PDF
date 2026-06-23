# Smoke API verification

Date: 2026-06-23T00:39:05.733Z
Command: node scripts/smoke-api.mjs http://localhost:18082

## Result

Exit code: 0

`
Running smoke tests against http://localhost:18082

PASS health returns 200: 200
PASS health status=ok
NOTE: initiate returned 409 (local mode), trying multipart upload fallback
PASS anonymous multipart upload (local mode fallback): 202
PASS multipart upload returns jobId
PASS multipart upload returns accessToken (anonymous token present)
PASS job status without token rejected: 401
PASS worker endpoint without OIDC rejected: 401
PASS member jobs without auth rejected: 401
PASS board write without auth rejected: 401
PASS invalid multipart upload rejected: 422

Smoke complete: 10 passed, 0 failed

`
