# Session Note: Cloud Run & Vercel Deployment & Bug Fixes

## 1. Overview
This session focused on completing the end-to-end production deployment of HWP2PDF to Google Cloud Run (Backend API) and Vercel (Next.js Frontend), diagnosing build issues, configuring Cloud Storage CORS, setting up repository permissions, and adjusting Next.js routing configuration.

---

## 2. Completed Steps

### 1) Dockerfile & LibreOffice JRE Fixes
* **Issue**: The LibreOffice extension installer (`unopkg`) failed during the API Docker build due to a missing Java Runtime Environment (JRE) environment configuration: `[JavaVirtualMachine]: An unexpected error occurred while searching for a Java 11`.
* **Fix**: Modifed the `apps/api/Dockerfile` to bypass the buggy `unopkg` command by directly extracting the `H2Orestart.oxt` extension using `unzip` into the LibreOffice shared extensions directory (`/usr/lib/libreoffice/share/extensions/H2Orestart/`). This successfully resolved the build dependency on Java.

### 2) GCP Storage & CORS Config
* **Action**: Updated `infrastructure/gcp/gcs-cors.json` to allow browser uploads from the production URL `https://hwp2pdf-phi.vercel.app`.
* **Action**: Configured the Google Cloud Storage bucket (`hwp2pdf-bucket-1014`) using:
  ```bash
  gcloud storage buckets update gs://hwp2pdf-bucket-1014 --cors-file=infrastructure/gcp/gcs-cors.json
  ```

### 3) GitHub Actions Deployment Fixes
* **Issue**: The Deployment pipeline (`deploy-api-cloud-run.yml`) failed with permission denied errors in Artifact Registry.
* **Fixes**:
  * Set IAM permissions on the Artifact Registry repository `hwp2pdf` to grant `roles/artifactregistry.writer` to the service account `hwp2pdf-runner@hwp2pdf-499911.iam.gserviceaccount.com`.
  * Updated the Actions workflow to support service account JSON keys (`credentials_json: ${{ secrets.GCP_SA_KEY }}`) instead of relying solely on Workload Identity.
  * Successfully built the image and deployed the API to Cloud Run.
  * **API URL**: `https://hwp2pdf-api-130439872251.asia-northeast3.run.app`

### 4) Vercel Frontend Configuration & Env Variables
* **Issues**: The frontend deployment showed Vercel `404: NOT_FOUND` errors.
* **Fixes**:
  * Set the API base URL environment variable on Vercel:
    `NEXT_PUBLIC_API_BASE_URL=https://hwp2pdf-api-130439872251.asia-northeast3.run.app`
  * Configured the **Root Directory** in Vercel to `apps/web`.
  * Verified that Next.js builds successfully and outputs pages.
  * Triggered a redeploy to apply the root directory and the environment variables.

---

## 3. Deployment Artifacts & Specs
* **GCP Project ID**: `hwp2pdf-499911`
* **GCS Bucket**: `gs://hwp2pdf-bucket-1014` (asia-northeast3)
* **Cloud Run API URL**: `https://hwp2pdf-api-130439872251.asia-northeast3.run.app`
* **Vercel Frontend URL**: `https://hwp2pdf-phi.vercel.app`
