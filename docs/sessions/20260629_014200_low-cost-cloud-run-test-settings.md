# Low-cost Cloud Run test settings

Date: 2026-06-29

## User request

The user clarified that HWP-to-PDF conversion speed is less important than keeping cost minimal because the environment is only for testing.

## Decision

Do not use LLM conversion, Cloud Run `min-instances=1`, or any always-warm worker for this test environment. Those options trade money for latency and are not aligned with the current goal.

The test profile intentionally accepts slow cold starts and serialized conversions to minimize surprise spend.

## Live GCP changes

- Updated Cloud Tasks queue `conversion-queue` in `asia-northeast3`:
  - `maxConcurrentDispatches=1`
  - `maxDispatchesPerSecond=0.1`
  - `maxAttempts=3`
- Updated Cloud Run service `hwp2pdf-api` in `asia-northeast3`:
  - `min-instances=0`
  - `max-instances=1` on the latest ready revision
  - `concurrency=1`
  - `timeout=300s`

## Repository changes

- `.github/workflows/deploy-api-cloud-run.yml`
  - Added `CLOUD_RUN_MAX_INSTANCES`, defaulting to `1`.
  - Deploys with `--max-instances "${CLOUD_RUN_MAX_INSTANCES}"` so the next workflow run does not revert the test environment to 10 max instances.
- `docs/operations/api-cloud-run-runtime.md`
  - Documented the low-cost test profile.
  - Changed Cloud Tasks setup example to one-at-a-time dispatch and three retry attempts.

## Verification

- Cloud Run latest ready revision reported `maxScale=1`, `concurrency=1`, and Ready status `True`.
- Cloud Tasks queue reported `maxConcurrentDispatches=1`, `maxDispatchesPerSecond=0.1`, and `maxAttempts=3`.
- Live API health check returned `{"status":"ok"}`.
- `pnpm --filter api typecheck` passed.
- `git diff --check` passed for the changed workflow and docs.

## Tradeoff

This can make conversions slower under concurrent use. That is expected for the test environment: queueing one conversion at a time is the safer default until the project has production traffic or a user-facing latency target.
