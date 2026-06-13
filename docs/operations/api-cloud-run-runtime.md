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

The checked-in `.github/workflows/deploy-api-cloud-run.yml` builds the API image, pushes it to Artifact Registry, deploys it to Cloud Run, and runs `scripts/smoke-api.mjs` against the deployed service. Configure these GitHub repository variables/secrets before enabling it:

- vars: `GCP_PROJECT_ID`, `GCP_REGION`, `CLOUD_RUN_API_SERVICE`, `WEB_ORIGIN`, `GCS_BUCKET_NAME`, `CLOUD_RUN_API_SERVICE_ACCOUNT`
- secrets: `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_SERVICE_ACCOUNT_EMAIL`

If any required deployment variable or secret is missing, the workflow preflight job succeeds and skips the deploy job instead of failing the push. Once all values are configured, the workflow deploys with `STORAGE_BACKEND=gcs` and `JOB_STORE_BACKEND=firestore`, then smoke-tests `/health`, invalid multipart upload handling, and direct-upload URL initiation.

## Current limitation

Local Windows QA still cannot verify successful HWP conversion because LibreOffice/H2Orestart is not installed in this environment. Use the Docker/Cloud Run runtime for successful HWP-to-PDF verification.
