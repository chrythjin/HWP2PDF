# Session Note: Vercel 404 Fix and Cloud Run Rate-Limit Fix

## 1. Overview

Two production issues were diagnosed and fixed during this session:

1. Vercel frontend at `https://hwp2pdf-phi.vercel.app` served `404 NOT_FOUND` even though the Cloud Run API was healthy.
2. After the frontend was fixed, HWP uploads failed with a server error caused by `express-rate-limit` rejecting Cloud Run's `X-Forwarded-For` header.

Both issues are now resolved in code and deployed (or queued for deployment).

---

## 2. Vercel 404 fix

### Initial symptom

- `GET https://hwp2pdf-phi.vercel.app/` returned Vercel `404 NOT_FOUND`.
- Cloud Run API `/health` returned `200 OK` and `/v1/uploads/initiate` returned `201 Created`.

### Root causes

1. The GitHub repository's active branch was `master`, but the Vercel project was deploying a different branch (`main`) from a collaborator's connected repository view (`github.com/K1859/hwp2pdf`).
2. Vercel project settings were incorrect:
   - **Framework Preset** was `Other` instead of `Next.js`.
   - **Build Command** used the wrong filter `pnpm --filter shared build` instead of `pnpm --filter @hwp2pdf/shared build`.
3. `vercel.json` did not exist in `apps/web`, so the dashboard overrides were the only source of truth.

### Fixes applied

- Created `apps/web/vercel.json` with:
  ```json
  {
    "$schema": "https://openapi.vercel.sh/vercel.json",
    "framework": "nextjs",
    "buildCommand": "pnpm --filter @hwp2pdf/shared build && pnpm --filter web build",
    "outputDirectory": ".next",
    "installCommand": "pnpm install"
  }
  ```
- Created a `main` branch on GitHub and pushed the same code, because Vercel was tracking `main`.
- Updated Vercel dashboard settings:
  - **Framework Preset**: `Next.js`
  - **Build Command**: `pnpm --filter @hwp2pdf/shared build && pnpm --filter web build`
  - **Output Directory**: `.next`
  - **Install Command**: left default
- Disabled all overrides after the correct settings were confirmed.

### Verification

- `curl -I https://hwp2pdf-phi.vercel.app/` returned `HTTP/2 200`.
- Browser loaded the HWP2PDF upload page successfully.

---

## 3. Cloud Run rate-limit fix

### Initial symptom

- HWP file upload reached the frontend successfully.
- `POST /v1/uploads/complete` returned HTTP `500`.
- Cloud Run logs showed:
  ```
  ValidationError: The 'Forwarded' header (standardized X-Forwarded-For) is set but currently being ignored.
  Add a custom keyGenerator to use a value from this header.
  ```

### Root cause

`express-rate-limit` v8 does not trust `X-Forwarded-For` by default. Because Cloud Run sits behind Google Frontend, every request carries `X-Forwarded-For`. Without a custom `keyGenerator`, the library throws a validation error that becomes a `500` response.

### Fix applied

Updated `apps/api/src/app.ts` to use the first IP from `X-Forwarded-For` as the rate-limit key:

```typescript
app.use(
  rateLimit({
    windowMs: config.rateLimitWindowMs,
    limit: config.rateLimitMax,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: (request) => {
      const forwarded = request.headers["x-forwarded-for"];
      if (typeof forwarded === "string") {
        return forwarded.split(",")[0].trim();
      }
      return request.ip ?? "unknown";
    },
    message: {
      error: {
        code: "rate_limit_exceeded",
        message: "요청 한도를 초과했습니다. 잠시 후 다시 시도하세요.",
      },
    },
  }),
);
```

### Verification

- `pnpm --filter api build` passed locally.
- Committed as `f3f20e5` and pushed to both `main` and `master`.
- GitHub Actions `deploy-api-cloud-run.yml` started automatically (`run 27834351449`).

---

## 4. Remaining work

After the Cloud Run deployment finishes, test the full flow:

1. Open `https://hwp2pdf-phi.vercel.app/`.
2. Upload a small `.hwp` file.
3. Confirm `/v1/uploads/initiate` returns `201`.
4. Confirm the browser PUT to GCS succeeds.
5. Confirm `/v1/uploads/complete` returns `202`.
6. Poll `/v1/jobs/:jobId` until status is `completed`.
7. Download the generated PDF from the signed URL.

If any step still fails, capture the Cloud Run logs and continue from there.

---

## 5. Related artifacts

- `apps/web/vercel.json`
- `apps/api/src/app.ts`
- `.github/workflows/deploy-web-vercel.yml`
- `.github/workflows/deploy-api-cloud-run.yml`
- `docs/sessions/20260619_232000_vercel-404-diagnosis.md` - earlier diagnosis note.
