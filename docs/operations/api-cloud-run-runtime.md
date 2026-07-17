# API Cloud Run Runtime

This document records the current production packaging contract for `apps/api`.

## Container image

Build from the repository root so the API package can include the shared workspace package:

```powershell
docker build -f apps/api/Dockerfile -t hwp2pdf-api:local .
```

The image uses a multi-stage build:

1. installs pnpm workspace dependencies with the lockfile,
2. builds `@hwp2pdf/shared` and `api`,
3. deploys only the production API package into `/app`,
4. installs LibreOffice, Korean fonts, and the H2Orestart extension in the runtime layer,
5. runs as the non-root `hwp2pdf` user.

## HWP conversion runtime

The container installs H2Orestart `v0.7.12` from `H2ORESTART_URL` during image build and registers it with `unopkg add --shared`. The API invokes LibreOffice with `--infilter=Hwp2002_File` and a job-scoped `UserInstallation` profile directory so HWP v5/HWPX conversion uses the intended filter and avoids shared profile state between conversions.

H2Orestart is GPL-3.0. Before public production launch, confirm the project's SaaS/runtime distribution policy accepts this dependency or switch the conversion boundary to a licensed commercial engine.

## Runtime environment

| Variable | Default | Purpose |
|---|---:|---|
| `PORT` | `8080` | Cloud Run listener port. |
| `LIBREOFFICE_BIN` | `soffice` | Binary invoked by the conversion service. The historical plan used `LIBREOFFICE_BINARY`, but current executable code reads `LIBREOFFICE_BIN`. |
| `H2ORESTART_URL` | H2Orestart v0.7.12 release URL | Build-time extension download URL used by the Dockerfile. |
| `UPLOAD_DIR` | `/tmp/hwp2pdf/uploads` | Ephemeral upload directory inside the container. |
| `RESULT_DIR` | `/tmp/hwp2pdf/results` | Ephemeral PDF output directory inside the container. |
| `RESULT_URL_BASE` | `http://localhost:8080/v1/results` | Public base URL used only when `STORAGE_BACKEND=local`. Set this to the deployed API origin plus `/v1/results` for local-result mode. |
| `STORAGE_BACKEND` | `local` or `gcs` when `GCS_BUCKET_NAME` exists | Selects local static result URLs or GCS object persistence with signed result URLs. |
| `GCS_BUCKET_NAME` | none | Private bucket used when the GCS backend is enabled. |
| `GCS_PROJECT_ID` | ADC default | Optional project ID for the Google Cloud Storage client. |
| `GCS_ORIGINAL_PREFIX` | `staging` | Prefix for uploaded original HWP objects. |
| `GCS_RESULT_PREFIX` | `output` | Prefix for converted PDF objects. |
| `SIGNED_DOWNLOAD_URL_TTL_MINUTES` | `15` | TTL for V4 signed result download URLs. |
| `JOB_RETENTION_MINUTES` | `30` | Job polling and local-result download retention. Expired jobs return `expired`; local result downloads return HTTP 410. |
| `JOB_STORE_BACKEND` | `memory` or `firestore` when `FIRESTORE_JOBS_COLLECTION` exists | Selects in-memory local job state or Firestore durable polling state. |
| `FIRESTORE_PROJECT_ID` | ADC default | Optional project ID for the Firestore client. |
| `FIRESTORE_DATABASE_ID` | `(default)` | Firestore database ID. |
| `FIRESTORE_JOBS_COLLECTION` | `jobs` | Collection used for job status documents. |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed frontend origin. Set this to the deployed web origin. |
| `FIREBASE_PROJECT_ID` | ADC default | Firebase/GCP project ID for Firebase Admin SDK initialization. In Cloud Run, ADC infers this automatically; set explicitly if different from the GCS/Firestore project. |
| `FIREBASE_ADMIN_MODE` | `adc` | Firebase Admin initialization mode: `adc` (Cloud Run production default), `service-account` (local fallback via `FIREBASE_PRIVATE_KEY_PATH`), `mock` (test mode, no real Firebase calls). |
| `FIREBASE_PRIVATE_KEY_PATH` | none | Path to service account JSON key file. Used only when `FIREBASE_ADMIN_MODE=service-account`. Local/non-GCP fallback only — never use in production. |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | none | Inline service account JSON key (raw JSON or base64-encoded). Fallback when `FIREBASE_PRIVATE_KEY_PATH` is not available (e.g. Cloud Run secret passed as env var). Local/non-GCP fallback only — ADC is preferred in production. |
| `FIREBASE_AUTH_EMULATOR_HOST` | none | Firebase Auth Emulator host for local development/testing (e.g. `localhost:9099`). |
| `CONVERSION_DISPATCHER` | auto | Conversion dispatch mode: `cloud-tasks` (production) or `inline` (local/dev fallback). Auto-resolves to `cloud-tasks` when all Cloud Tasks env vars are present, else `inline`. |
| `CLOUD_TASKS_QUEUE_NAME` | none | Cloud Tasks queue name (e.g. `conversion-queue`). Create with `gcloud tasks queues create conversion-queue --location=$REGION`. |
| `CLOUD_TASKS_LOCATION` | none | Cloud Tasks queue location (e.g. `asia-northeast3`). Should match the API region. |
| `CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL` | none | Service account email used by Cloud Tasks to generate OIDC tokens for the worker endpoint. Must have Cloud Run Invoker role on the API service. |
| `INTERNAL_WORKER_URL` | auto | Full URL of the internal worker endpoint (`/internal/workers/convert`). If not set, constructed from the service's public URL or `INTERNAL_API_URL`. |
| `INTERNAL_WORKER_AUDIENCE` | auto | Expected OIDC audience for the worker endpoint. Cloud Tasks generates a token with this audience; the worker verifies it matches. Defaults to the worker URL itself. |
| `INTERNAL_WORKER_ISSUER` | `https://accounts.google.com` | Expected OIDC issuer for worker token verification. |
| `MAINTENANCE_OIDC_AUDIENCE` | none | Exact audience accepted by `POST /internal/maintenance/run`. Configure Cloud Scheduler to mint its OIDC token with this same endpoint-specific value. |
| `MAINTENANCE_OIDC_SUBJECT` | none | Exact Google service-account subject (`sub`, the immutable numeric unique ID), not an email address. Requests are rejected when this is absent or does not match. |
| `MAINTENANCE_OIDC_ISSUER` | `https://accounts.google.com` | Exact issuer accepted for Scheduler OIDC tokens. |
| `MAINTENANCE_BATCH_LIMIT` | `100` | Maximum stale jobs and expired upload sessions scanned per maintenance invocation. |
| `STUCK_JOB_THRESHOLD_MINUTES` | `10` | Stuck-job recovery threshold. Jobs stuck in `queued` or `processing` longer than this may be re-enqueued by a cleanup task. |
| `FIRESTORE_BOARD_POSTS_COLLECTION` | `boardPosts` | Firestore collection for board posts. |

## Storage and job modes

The API supports two upload paths: direct browser-to-GCS upload in GCS mode and multipart API upload as the local/dev fallback.

1. In GCS mode, the web client calls `POST /v1/uploads/initiate` with file metadata and receives a V4 signed `PUT` URL for `GCS_ORIGINAL_PREFIX/{jobId}/{safeFileName}`.
2. The browser uploads the HWP directly to GCS, then calls `POST /v1/uploads/complete` with the job ID and object path.
3. The API downloads the uploaded original from GCS into the container temp directory, creates the job, and starts conversion.
4. In local/dev mode, `POST /v1/uploads/initiate` returns `409 direct_upload_unavailable`, and the web client falls back to multipart `POST /v1/upload`.
5. Job metadata is written through the selected job store. Production should use `JOB_STORE_BACKEND=firestore` so polling works across Cloud Run instances.
6. LibreOffice converts from the local temp file.
7. If `STORAGE_BACKEND=gcs`, the PDF is uploaded to `GCS_RESULT_PREFIX/{jobId}/{jobId}.pdf` and the job receives a 15-minute V4 signed URL.
8. Each job records `expiresAt = createdAt + JOB_RETENTION_MINUTES`. Polling an expired job returns `status: "expired"` and hides the download URL.
9. If the local backend is active, the job receives the existing `RESULT_URL_BASE/{jobId}.pdf` URL. Downloads are served through the job-aware `/v1/results/{jobId}.pdf` route, which returns HTTP 410 after expiry instead of exposing stale files through static serving.

Cloud Run should grant the service account the minimum bucket and Firestore permissions required to create/read/update job documents, create/download objects, and sign GCS V4 URLs. In Cloud Run ADC, signed URL creation may require IAM signBlob permission such as Service Account Token Creator on the runtime service account. Use a private bucket; do not make the result prefix public. Direct browser uploads require bucket CORS allowing `PUT` from the deployed Vercel origin; edit `infrastructure/gcp/gcs-cors.json` and apply `infrastructure/gcp/apply-gcs-cors.sh` after the web domain is known.

## GCS lifecycle and CORS

Apply the checked-in lifecycle and CORS rules after creating the private bucket:

```powershell
$env:GCS_BUCKET_NAME = "YOUR_PRIVATE_BUCKET"
bash infrastructure/gcp/apply-gcs-lifecycle.sh
bash infrastructure/gcp/apply-gcs-cors.sh
```

The lifecycle rule in `infrastructure/gcp/gcs-lifecycle.json` deletes objects under `staging/` and `output/` after one day. This is the closest bucket-native setting to the 30-minute product goal; use a scheduled cleanup job if exact 30-minute deletion is required.

For member files, the application attempts immediate deletion when a user requests deletion. The GCS lifecycle policy serves as a safety net for orphaned objects. Member metadata (without file content) is retained in Firestore for 30 days as tombstones before hard deletion.

The CORS rule in `infrastructure/gcp/gcs-cors.json` must use the real Vercel web origin before applying. It allows browser `PUT` uploads to signed GCS URLs.

## Local container QA

When Docker is available:

```powershell
docker run --rm -p 8080:8080 `
  -e CORS_ORIGIN=http://localhost:3000 `
  -e RESULT_URL_BASE=http://localhost:8080/v1/results `
  hwp2pdf-api:local
```

Then verify LibreOffice and the shared extension registration before API requests:

```powershell
docker run --rm hwp2pdf-api:local soffice --version
docker run --rm hwp2pdf-api:local unopkg list --shared
Invoke-RestMethod http://localhost:8080/health
```

For GCS/Firestore mode, also run the container with `STORAGE_BACKEND=gcs`, `GCS_BUCKET_NAME`, `JOB_STORE_BACKEND=firestore`, and credentials provided through Cloud Run service account or local ADC.

Upload and conversion should be tested through the web uploader. In GCS mode the frontend uses direct signed upload first; in local mode it automatically falls back to multipart `POST /v1/upload`.

## Cloud Run deployment

The checked-in `.github/workflows/deploy-api-cloud-run.yml` builds the API image, pushes it to Artifact Registry, deploys it to Cloud Run, grants Cloud Tasks Enqueuer and Cloud Run Invoker IAM roles, and runs `scripts/smoke-api.mjs` against the deployed service. Configure these GitHub repository variables/secrets before enabling it:

- vars: `GCP_PROJECT_ID`, `GCP_REGION`, `CLOUD_RUN_API_SERVICE`, `WEB_ORIGIN`, `GCS_BUCKET_NAME`, `CLOUD_RUN_API_SERVICE_ACCOUNT`, `CLOUD_TASKS_QUEUE_NAME`, `CLOUD_TASKS_LOCATION`, `FIRESTORE_JOBS_COLLECTION`, `FIRESTORE_BOARD_POSTS_COLLECTION`
- secrets: `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_SERVICE_ACCOUNT_EMAIL`, `CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL`, `CLOUD_RUN_WORKER_AUDIENCE` (optional, defaults to worker URL)

If any required deployment variable or secret is missing, the workflow preflight job succeeds and skips the deploy job instead of failing the push. Once all values are configured, the workflow deploys with `STORAGE_BACKEND=gcs`, `JOB_STORE_BACKEND=firestore`, `CONVERSION_DISPATCHER=cloud-tasks`, and `FIREBASE_ADMIN_MODE=adc`, then smoke-tests `/health`, anonymous upload initiate, token-required status, worker OIDC rejection, member endpoint rejection, and board write rejection.

For the current test environment, keep Cloud Run at `--min-instances=0`, `--concurrency=1`, and `CLOUD_RUN_MAX_INSTANCES=1` to avoid idle spend and prevent multiple LibreOffice conversions from scaling out. Raising `CLOUD_RUN_MAX_INSTANCES` improves throughput but can multiply conversion cost during bursts.

## Firebase Admin authentication

The API uses Firebase Admin SDK to verify Firebase ID tokens from the client. In Cloud Run production, ADC (Application Default Credentials) is the default and preferred mode — no service account key file is needed. The runtime service account must have Firebase Admin permissions (typically available by default in the Firebase project).

### Required IAM roles for the Cloud Run service account

| Role | Purpose |
|---|---|
| `roles/cloudtasks.enqueuer` | Create HTTP tasks on the Cloud Tasks queue |
| `roles/run.invoker` | (Granted to the Cloud Tasks service account, not the API SA) Allow Cloud Tasks to invoke the worker endpoint |
| `roles/storage.objectAdmin` | GCS original/result object create/read/delete |
| `roles/datastore.user` | Firestore job and board post read/write |
| `roles/iam.serviceAccountTokenCreator` | GCS V4 signed URL generation |

### Cloud Tasks queue setup

Before deploying with `CONVERSION_DISPATCHER=cloud-tasks`, create the queue:

```bash
gcloud tasks queues create conversion-queue \
  --location=asia-northeast3 \
  --max-concurrent-dispatches=1 \
  --max-attempts=3 \
  --max-backoff=300s \
  --max-dispatches-per-second=0.1
```

These queue defaults intentionally favor low test cost over speed: at most one conversion is dispatched at a time, at most one new task every 10 seconds, and failed jobs are retried only three times.

The Cloud Tasks service account (`CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL`) must have `roles/run.invoker` on the Cloud Run API service so it can call the internal worker endpoint with an OIDC token.

### Worker endpoint security

The internal worker endpoint (`POST /internal/workers/convert`) is protected by OIDC token verification. Cloud Tasks generates an OIDC token with the configured audience (`INTERNAL_WORKER_AUDIENCE` or the worker URL). The API verifies the token's audience, issuer, and service account email before processing. Requests without a valid OIDC token are rejected with 401/403.

The Cloud Run service is deployed with `--allow-unauthenticated` so that public API endpoints (health, upload, jobs) are accessible, but the worker endpoint is protected at the application layer by OIDC verification.

### Scheduler maintenance endpoint

`POST /internal/maintenance/run` runs the transaction-protected stale-processing recovery and expired upload-session cleanup primitives. It enqueues only jobs returned by a successful recovery claim and deletes only the exact object path returned by a successful one-time cleanup claim. Its response and structured completion log contain counts and pagination flags only; bearer tokens, job IDs, object paths, signed URLs, access tokens, and raw exceptions are not serialized.

The endpoint fails closed unless both `MAINTENANCE_OIDC_AUDIENCE` and `MAINTENANCE_OIDC_SUBJECT` are configured. Scheduler must send a Google-signed OIDC bearer token whose `aud`, `iss`, and `sub` exactly match the configured values. Do not add a query-string cron secret or expose an unauthenticated maintenance route.

Creating the Scheduler job, selecting its OIDC service account, reading that account's immutable subject ID, granting Cloud Run invocation permissions, and changing Cloud Run environment variables are production IAM/deployment actions. They are intentionally not automated by this repository change and require explicit user approval plus a staging verification window. A future approved setup must use an endpoint-specific audience and must not reuse a public client audience.

## Firestore TTL and cleanup

Member job metadata is retained for 30 days (`DEFAULT_METADATA_RETENTION_MS`). Deleted member jobs are tombstoned for 30 days (`TOMBSTONE_RETENTION_MS`) before hard deletion. Anonymous job metadata follows `JOB_RETENTION_MINUTES` (default 30 minutes).

Firestore does not have native TTL policies for individual documents in the default mode. Cleanup of expired/tombstoned documents should be handled by:

1. A scheduled Cloud Function or Cloud Run job that queries for documents past their retention period and deletes them.
2. Application-level lazy cleanup: when a user queries their history, expired/tombstoned entries are filtered out and optionally batch-deleted.

GCS object cleanup is handled by the bucket lifecycle policy (see below).

## GCS lifecycle and CORS

## Current limitation

Local Windows QA still cannot verify successful HWP conversion because LibreOffice/H2Orestart is not installed in this environment. Use the Docker/Cloud Run runtime for successful HWP-to-PDF verification.
