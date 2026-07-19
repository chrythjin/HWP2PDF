# packages/shared/src/AGENTS.md

Single source of truth for DTOs, validation, route constants, and TTL values. Published as `@hwp2pdf/shared` after `tsc` builds `dist/`. Parent `AGENTS.md` covers the build order.

## Files

| File | Surface |
|---|---|
| `index.ts` | DTOs (`UploadResponse`, `JobStatusResponse`, `BoardPost`, `BoardUpdatePostRequest`), constants (`API_ROUTES`, `ALLOWED_EXTENSIONS`, `MAX_POLLING_TIME`), validators (`validateFile`, `validateUploadSession`) |
| `validation.ts` | File/board/upload validators + `getFileExtension`, `isHwpFile` |
| `job-types.ts` | Convenience type aliases re-exported from `index.ts` |

## Rules

- Add a new shared DTO → export from `index.ts` and re-export through `job-types.ts` only if it adds semantic value.
- Add a new route constant → `API_ROUTES` only. Routes import the constant; never hardcode `/v1/...` strings.
- Update a retention/TTL value → edit `index.ts` once. Values: `DEFAULT_DOWNLOAD_TTL_MS` (1h), `DEFAULT_METADATA_RETENTION_MS` (30d), `TOMBSTONE_RETENTION_MS` (30d) — memory #638.
- Update a validator → keep error codes aligned with API error middleware. PATCH validators must use `unknown` input with explicit runtime type checks; reject null/number/object/array as 422 (memory #644).

## Anti-patterns

- Don't import `firebase-admin` here — shared is pure TypeScript with no runtime dependencies.
- Don't put business logic in this package. Pure types/constants/helpers only.
- Don't add a runtime dep to shared without first evaluating whether it can live in the consumer package.

## Tests

- `index.test.ts` exercises constants and DTO shape defaults.
- `validation.test.ts` covers validator edge cases (case-insensitive `.HWP`, OLE signature mismatch, oversize).
