# apps/api/src/routes/AGENTS.md

Express router surface. Parent `AGENTS.md` covers package layout.

## Files

| File | Surface |
|---|---|
| `v1.ts` | All public v1 endpoints: `/v1/upload`, `/v1/uploads/initiate`, `/v1/uploads/complete`, `/v1/jobs/:jobId`, `/v1/jobs/:jobId/download`, `/v1/me/jobs*`, plus `/internal/workers/convert` |
| `v1.board.ts` | Board CRUD: `/v1/board/posts[/:id]`, member-scoped, admin/`boardModerator` claims required for PATCH/DELETE |
| `maintenance.ts` | `/internal/maintenance/run` with OIDC + Cloud Scheduler wiring |

## Pattern

```ts
router.post(API_ROUTES.X, optionalAuth, async (request, response, next) => {
  try { ... } catch (error) { next(error); }
});
```

- Use `requireAuth` (member only) / `optionalAuth` (member or anonymous) / `requireWorkerOidc` (Cloud Tasks) per route.
- Throw `ApiError(statusCode, code, koreanMessage)` for every business failure — the central error handler maps to `{ error: { code, message } }`.
- Return only DTOs from `@hwp2pdf/shared`. No raw service objects in HTTP responses.
- For status 202 (async result), include `Location: ${API_ROUTES.JOBS}/${jobId}`.

## Anti-patterns

- Don't log raw `error.message`; convert to a safe diagnostic before logging.
- Don't bypass owner verification — `optionalAuth` is not equivalent to no-auth, and download routes still need the token check.
- Don't pass file paths as URL parameters (memory #325 — secret/path leakage).
- Don't add rate limit exemptions in routes; configure in `app.ts`.

## Conventions

- All routes import `API_ROUTES` constants from `@hwp2pdf/shared` — never hardcode `/v1/...` literals.
- Routes are append-only in v1; breaking changes add v2.
- Tests live as `v1.<feature>.test.ts` next to `v1.ts`.
