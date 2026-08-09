# GitHub Actions pnpm Drift Repair

## Request

Investigate and repair the failed GitHub Actions deployment notifications after the production converter repair was pushed.

## Cause

The root manifest declared `pnpm@10.16.1` and required pnpm 10, while the committed lockfile uses pnpm 8 format (`lockfileVersion: '6.0'`), the Vercel deployment workflow explicitly installs pnpm 8.15.1, and the API Dockerfile activates pnpm 8.15.1. GitHub Actions rejected the web deployment before dependency installation because of the conflicting pnpm declarations. The API image build failed within the same incompatible toolchain boundary.

## Change

Restored the root `packageManager` and engine constraints to the established pnpm 8.15.1 / Node 20-or-newer contract. This keeps the lockfile, Vercel workflow, and API Dockerfile on one reproducible version line without regenerating the lockfile.

## Verification

- Confirmed the failed Vercel run stopped at `Set up pnpm` with the pnpm 8.15.1 versus pnpm 10.16.1 conflict.
- Confirmed the failed API run authenticated to Google Cloud and Artifact Registry before failing in `Build and push API image`.
- The detailed API Actions log archive is restricted by GitHub and returned HTTP 403 to unauthenticated public API retrieval.
