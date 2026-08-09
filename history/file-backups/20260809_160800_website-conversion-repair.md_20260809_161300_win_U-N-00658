# Website Conversion Repair

## Request

Verify the public website and make the conversion path work end-to-end.

## Cause

- The public API allowed only the retired Vercel origin, so the current web origin's upload preflight was rejected by CORS.
- The API deployment image omitted the runtime `@hwp2pdf/shared` workspace package after `pnpm deploy`, preventing new revisions from starting.
- The API deployment workflow configured the API itself as the Cloud Tasks worker rather than preserving the dedicated converter's OIDC endpoint. It also omitted persistent-backend project identifiers and the Debian `soffice` path used by the working deployment.

## Changes

- Preserved `@hwp2pdf/shared` in the final API image.
- Made the Cloud Build definition use the current API Dockerfile and a caller-supplied image tag.
- Added the current Vercel origin to the GCS CORS policy and applied that policy to the production bucket.
- Updated the API deployment workflow to retain Firestore, GCS, Cloud Tasks project IDs, `/usr/bin/soffice`, the dedicated converter target, and its declared OIDC URL/audience.
- Set the deployment workflow's CORS fallback to the current Vercel production origin so a missing repository variable cannot restore the retired origin.

## Verification

- Production API preflight from `https://hwp2pdf-six.vercel.app` returned `204` with `Access-Control-Allow-Origin` for that origin.
- Production anonymous upload of the independent `pyhwp` `aligns.hwp` HWP V5 control document returned `202`, completed at progress `100`, and its protected download followed to a 36,418-byte file beginning with `%PDF-`.
- `corepack pnpm --filter api typecheck` and `corepack pnpm --filter api test` passed; the test suite reported 390 passing tests.

## Remaining External Condition

AdSense requests still depend on Google approval/ad serving and are separate from the verified conversion flow.
