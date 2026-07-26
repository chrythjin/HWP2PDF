# apps/api/src/middleware/AGENTS.md

Request pipeline. Parent `AGENTS.md` covers the broader Express flow.

## Files

| File | Role |
|---|---|
| `auth.ts` | `requireAuth` (member-only) / `optionalAuth` (member-or-anonymous) — Firebase ID token verify, attaches `AuthenticatedUser` to `request.auth` |
| `upload.ts` | Multer multipart handler — size/extension/OLE signature gate |
| `error-handler.ts` | Central error responder — `ApiError` → user-safe JSON; non-`ApiError` → 500 with diagnostic logging |
| `worker-auth.ts` | OIDC token verify for `/internal/workers/convert` (Cloud Tasks) |
| `maintenance-auth.ts` | OIDC verify for `/internal/maintenance/run` |
| `request-id.ts` | Assigns/propagates `X-Request-Id`, attaches `response.locals.requestId` for logging |

## Ordering in `app.ts`

1. `requestId` → 2. `helmet` → 3. `cors` → 4. JSON body → 5. `rateLimit` → 6. `requestIdMiddleware` (id inheritance happens before logging) → 7. routes → 8. `notFoundHandler` → 9. `errorHandler`. Don't reorder.

## Anti-patterns

- Don't log `error.message` raw — `error-handler.ts` already enforces safe-summary logging (errorName + requestId only).
- Don't skip `requestIdMiddleware` — every log line depends on `response.locals.requestId` for correlation.
- Don't add custom rate limit logic in routes — configure global skip rules in `app.ts`.

## Invariants

- `requireAuth` rejects when `request.auth.userId` is missing → 401.
- `optionalAuth` always populates `request.auth` (member or anonymous) when a valid token is present, never throws.
- OIDC token verifier for worker endpoints must validate audience against `INTERNAL_WORKER_AUDIENCE` (configured at deploy time).
