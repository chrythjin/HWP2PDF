# Session: Beginner-friendly deployment guide

- Date: 2026-06-18
- Scope: documentation only (no code changes)

## What changed

- Added `docs/DEPLOYMENT_GUIDE.md` — end-to-end beginner deployment guide covering GCP project setup, Cloud Run API deployment, Vercel web deployment, CORS, and verification.
- Updated `docs/INDEX.md` start-here list to surface the new guide above the technical operations doc.

## Why

User asked for a one-by-one, easy-to-follow deployment manual after the previous discussion about deployment readiness and architecture. The existing `USER_SETUP_CHECKLIST.md` is a terse checklist; the new guide is a tutorial walkthrough that explains the *why* behind each prerequisite and shows the exact screens and CLI steps.

## Contents of the new guide

1. **Architecture overview** — Vercel + Cloud Run + GCS diagram
2. **Estimated time** per step (~1.5h total)
3. **Account prerequisites** — GitHub, GCP, Vercel with cost notes
4. **Step 1: Google Cloud** — project, 5 APIs, service account with 3 IAM roles, GCS bucket (uniform access, asia-northeast3), Firestore, CORS placeholder
5. **Step 2: Cloud Run API** — Workload Identity pool + GitHub Actions provider, GitHub secrets/variables, first push, smoke test, URL extraction
6. **Step 3: Vercel Web** — project import with Root Directory = `apps/web`, env var `NEXT_PUBLIC_API_BASE_URL`, token issuance, automatic deploy via git push
7. **Step 4: Connect** — update GCS CORS with real Vercel origin, update `WEB_ORIGIN`, redeploy
8. **Step 5: Verify** — page opens, real HWP converts in 10–30s, debugging matrix
9. **FAQ** — 403/CORS, custom domain, cost, GPL-3.0 note for H2Orestart, public access

## Verification

- File written: `docs/DEPLOYMENT_GUIDE.md` (Korean, ~9KB, 0 broken internal links)
- `docs/INDEX.md` updated with link to the new guide
- No code changes — build/typecheck/test status unchanged from previous session (11/11 pass)

## Not verified

- User has not followed the guide yet, so end-to-end success in a real GCP project is unverified.
- Guide screenshots are referenced by description only; no images were captured.

## Related

- Supersedes (in usability, not replacement) `docs/USER_SETUP_CHECKLIST.md` for first-time deployers.
- Complements `docs/operations/api-cloud-run-runtime.md` (technical contract) and `.github/workflows/deploy-web-vercel.yml` / `deploy-api-cloud-run.yml` (executable source of truth).
