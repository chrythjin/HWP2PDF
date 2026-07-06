# Fix CORS Configuration for Anonymous Job Access Token Header

## Problem
Anonymous (non-logged-in) users trying to convert HWP files on the homepage encountered a token error during job polling and PDF downloads. The API returned a 401 or 403 error indicating the access token was missing or invalid. This occurred because the backend API's CORS middleware did not explicitly list the custom `X-Job-Access-Token` header in `allowedHeaders`. Consequently, the browser's preflight `OPTIONS` request blocked/stripped the custom header on cross-origin requests between the frontend and API.

## Changes

### apps/api

#### [MODIFY] [app.ts](file:///c:/NEW%20PRG/HWP2PDF/apps/api/src/app.ts)
- Imported `ANONYMOUS_ACCESS_TOKEN_HEADER` from `@hwp2pdf/shared`.
- Configured the `cors` middleware to explicitly allow `ANONYMOUS_ACCESS_TOKEN_HEADER` (`X-Job-Access-Token`), along with standard `Content-Type` and `Authorization` headers.

```typescript
  app.use(
    cors({
      origin: config.corsOrigin,
      allowedHeaders: ["Content-Type", "Authorization", ANONYMOUS_ACCESS_TOKEN_HEADER],
    }),
  );
```

## Verification

### Automated Tests
Ran the Vitest test suites across the workspace to verify compilation and that all existing tests pass:
```bash
pnpm test
```
All 41 shared tests, 283 api tests, and 79 web tests passed successfully.
