# Deployment Workflow Preflight Gates

Date: 2026-06-13

## Summary

GitHub Actions deploy runs were failing because required external deployment secrets and repository variables were not configured yet. Added preflight jobs so deployment workflows skip cleanly until the user finishes GCP/Vercel setup.

## Evidence

- `Deploy API to Cloud Run` failed in `google-github-actions/auth@v2` because neither `workload_identity_provider` nor `credentials_json` was available through secrets.
- `Deploy Web to Vercel` failed because `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` were empty.

## Changes

- Added a preflight job to `.github/workflows/deploy-api-cloud-run.yml` that checks required GCP vars/secrets and skips deploy when missing.
- Added a preflight job to `.github/workflows/deploy-web-vercel.yml` that checks required Vercel vars/secrets and skips deploy when missing.
- Updated runtime deployment documentation to explain the skip behavior before external setup is complete.

## Verification

- `pnpm -r build`: passed.
- `pnpm --filter web lint`: passed.
- `lsp_diagnostics apps/api/src`: 0 diagnostics.
- `lsp_diagnostics apps/web/src`: 0 diagnostics.
- `lsp_diagnostics packages/shared/src`: 0 diagnostics.
- `git diff --check`: passed.

## Not verified locally

- Actual deployment still requires the user to configure GCP and Vercel repository variables/secrets.