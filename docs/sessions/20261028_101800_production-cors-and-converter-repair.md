# Production CORS and Converter Verification Repair

## Date
2026-10-28

## Context
User reported that the website was not functioning. Investigation focused on frontend-to-API communication, CORS preflight policies, background converter pipelines, and GitHub deployment workflows.

## Root Causes Identified
1. **Cloud Run API CORS Rejection**:
   - The production website origin is `https://hwp2pdf-six.vercel.app`.
   - The Cloud Run API (`hwp2pdf-api`) service configuration had `CORS_ORIGIN="https://hwp2pdf-phi.vercel.app"`, which caused browser `OPTIONS` preflight requests to fail with HTTP 500 (`Origin not allowed by CORS`), completely blocking uploads and API communication from the live site.
2. **Stale GitHub Secret**:
   - GitHub Secret `WEB_ORIGIN` was set to the retired domain `https://hwp2pdf-phi.vercel.app` on 2026-06-19.
   - When commit `848346c` pushed changes to `package.json`, `.github/workflows/deploy-api-cloud-run.yml` ran and injected the stale secret value into Cloud Run, overriding the working origin.

## Remediation Actions
1. **Cloud Run API Updated**:
   - Deployed revision `hwp2pdf-api-00082-bhk` with `CORS_ORIGIN="https://hwp2pdf-six.vercel.app"`.
2. **GitHub Secret Updated**:
   - Updated GitHub repository secret `WEB_ORIGIN` to `https://hwp2pdf-six.vercel.app` using `gh secret set`.
3. **End-to-End Pipeline Verification**:
   - Verified CORS preflight `OPTIONS /v1/uploads/initiate` returns `204 No Content` with `Access-Control-Allow-Origin: https://hwp2pdf-six.vercel.app` and correct headers.
   - Simulated full browser flow with `Origin: https://hwp2pdf-six.vercel.app`:
     - `POST /v1/uploads/initiate` -> `201 Created`
     - Direct GCS `PUT` -> `200 OK`
     - `POST /v1/uploads/complete` -> `202 Accepted`
     - Cloud Tasks dispatch -> `hwp2pdf-converter` -> LibreOffice conversion -> completed at progress `100`
     - Protected download URL generated and verified.
