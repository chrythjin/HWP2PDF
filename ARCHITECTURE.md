# Architecture

## Pattern Overview

**Overall:** Async job-based conversion service with owner-aware access control, organized as a pnpm workspace monorepo.

**Key Characteristics:**
- Multi-package workspace: `apps/web` (Next.js frontend), `apps/api` (Express API), `packages/shared` (shared contracts)
- Owner-aware job access: Firebase-authenticated members vs. anonymous token-holding users
- Dual backends: local development (memory + filesystem) / production (GCS + Firestore + Cloud Tasks)
- Asynchronous conversion pipeline: upload → queue → worker process → poll status → download
- Strict owner verification for all job operations; no jobId-alone access

## Layers

**Frontend (Next.js):**
- Purpose: React UI for HWP upload, conversion status polling, PDF download, member job history, and community board
- Location: `apps/web/src/`
- Contains: Next.js App Router pages, React components, Firebase Auth client, API client
- Depends on: `@hwp2pdf/shared` (shared contracts), Firebase Client SDK
- Used by: End users via browser

**API (Express/TypeScript):**
- Purpose: REST API for file upload, job management, conversion dispatch, and board operations
- Location: `apps/api/src/`
- Contains: Express routes, middleware, services, job/store implementations
- Depends on: `@hwp2pdf/shared`, Firebase Admin SDK, Google Cloud Storage, Firestore, Cloud Tasks
- Used by: Frontend (`apps/web`), internal worker endpoints, Cloud Tasks

**Shared Contracts:**
- Purpose: Single source of truth for DTOs, validation helpers, route constants, and retention policy constants
- Location: `packages/shared/src/`
- Contains: TypeScript interfaces/types, validation functions, API route constants, polling/retention TTL values
- Depends on: None (pure TypeScript)
- Used by: `apps/api`, `apps/web`

## Data Flow

**Anonymous HWP Upload → PDF Download:**

1. `POST /v1/upload` (multipart) — `apps/api/src/routes/v1.ts`
2. Anonymous access token generated (plaintext returned once, SHA-256 hash stored) — `apps/api/src/utils/access-token.ts`
3. Job created with `ownerType: "anonymous"` — `apps/api/src/services/job-store.ts`
4. Conversion job enqueued (Cloud Tasks or inline) — `apps/api/src/services/cloud-tasks-dispatcher.ts`
5. Worker claims job via `POST /internal/workers/convert` — `apps/api/src/routes/v1.ts`
6. `convertJobToPdf()` runs LibreOffice (`soffice`) — `apps/api/src/services/conversion-service.ts`
7. Status polled via `GET /v1/jobs/:jobId` with `X-Job-Access-Token` header — `apps/api/src/routes/v1.ts`
8. Download via `GET /v1/jobs/:jobId/download` (owner verification → signed URL or file stream) — `apps/api/src/routes/v1.ts`

**Member Upload Flow:**

1. `POST /v1/upload` with `Authorization: Bearer <Firebase-ID-token>` — `apps/api/src/routes/v1.ts`
2. Firebase ID token verified via `requireAuth` middleware — `apps/api/src/middleware/auth.ts`
3. Job created with `ownerType: "user"` and `userId` — `apps/api/src/services/job-store.ts`
4. Same conversion pipeline as anonymous
5. Member job history via `GET /v1/me/jobs` — `apps/api/src/routes/v1.ts`
6. Member soft-delete via `DELETE /v1/me/jobs/:jobId` — `apps/api/src/routes/v1.ts`

**Board Post Flow:**

1. `POST /v1/board/posts` with `requireAuth` — `apps/api/src/routes/v1.board.ts`
2. Post stored via `boardStore.createPost()` — `apps/api/src/services/board-store.ts`
3. Owner/admin/moderator edit via `PATCH /v1/board/posts/:postId` — `apps/api/src/routes/v1.board.ts`
4. Delete with role check (owner, admin, or moderator) — `apps/api/src/routes/v1.board.ts`

## Key Abstractions

**JobRecord:**
- Purpose: Core job entity with owner awareness, retention/tombstone fields
- Location: `apps/api/src/services/job-store.ts`
- Pattern: Interface with `MemoryJobStore` / `FirestoreJobStore` implementations

**UploadSession:**
- Purpose: Server-side binding for direct-to-GCS upload initiate → complete ownership
- Location: `packages/shared/src/index.ts` (type), `apps/api/src/services/job-store.ts` (storage)
- Pattern: Initiate (returns signed URL + plaintext token once) → complete (verifies session ownership)

**OwnerVerifier:**
- Purpose: Constant-time token comparison for anonymous jobs; Firebase UID equality for member jobs
- Location: `apps/api/src/services/storage-service.ts`
- Pattern: Factory function returning a verifier closure bound to a job's ownership metadata

**JobStore interface:**
- Purpose: Abstract job CRUD with owner-aware lookups and tombstone retention
- Location: `apps/api/src/services/job-store.ts`
- Pattern: `MemoryJobStore` (local dev) / `FirestoreJobStore` (production)

**StorageService:**
- Purpose: Dual-backend storage abstraction (local filesystem vs. GCS)
- Location: `apps/api/src/services/storage-service.ts`
- Pattern: GCS for production originals/results; local `tmp/uploads` / `tmp/results` for dev

**BoardStore interface:**
- Purpose: Abstract board post CRUD
- Location: `apps/api/src/services/board-store.ts`
- Pattern: `MemoryBoardStore` / `FirestoreBoardStore`

**CloudTasksDispatcher:**
- Purpose: Durable async conversion job dispatch
- Location: `apps/api/src/services/cloud-tasks-dispatcher.ts`
- Pattern: "cloud-tasks" (production) / "inline" (local dev) / "mock" (tests)

**FirebaseAdmin:**
- Purpose: Centralized Firebase Admin SDK lifecycle with three initialization modes
- Location: `apps/api/src/services/firebase-admin.ts`
- Pattern: Lazy singleton; ADC / service-account / mock modes

**ApiError:**
- Purpose: Typed HTTP error with status code, error code, and user-safe message
- Location: `apps/api/src/utils/api-error.ts`
- Pattern: Custom `Error` subclass thrown/caught at route level

## Entry Points

**API Server:**
- Location: `apps/api/src/server.ts`
- Triggers: `node server.ts` or `pnpm dev:api`
- Responsibilities: Creates Express app via `createApp()`, binds routes/middleware, listens on `PORT`

**API App Factory:**
- Location: `apps/api/src/app.ts`
- Triggers: Called by `server.ts`
- Responsibilities: Express middleware setup (CORS, rate-limiting, helmet), route mounting, error handlers

**Conversion Worker Endpoint:**
- Location: `apps/api/src/routes/v1.ts` (`POST /internal/workers/convert`)
- Triggers: Cloud Tasks HTTP invocation with OIDC service account token
- Responsibilities: Idempotent job claim, LibreOffice conversion, status update

**Next.js App Layout:**
- Location: `apps/web/src/app/layout.tsx`
- Triggers: Any page navigation
- Responsibilities: Root layout with `<AuthProvider>`, fonts, global CSS

**DropzoneUploader Component:**
- Location: `apps/web/src/components/DropzoneUploader.tsx`
- Triggers: User drops/selects an HWP file
- Responsibilities: File validation, upload (multipart or direct-to-GCS signed URL), polling, download

## Error Handling

**Strategy:** Structured `ApiError` with typed codes; centralized error middleware; safe public error messages via `PUBLIC_CONVERSION_ERRORS`; no token/path leakage in logs or responses.

**Conversion errors:** Classified as retryable (ETIMEDOUT, ECONNRESET, spawn failures) or terminal (corrupt HWP, invalid format). Cloud Tasks retries on 5xx for retryable; returns 200 for terminal.

**Upload session errors:** ObjectPath/fileName/size mismatch returns 403; expired session returns 409; missing token returns 401.

**Download errors:** Expired → 410; result not ready → 409; ownership denied → 401/403.

**API error format:**
```json
{ "error": { "code": "string", "message": "Korean user-safe message" } }
```

## Cross-Cutting Concerns

**Logging:** Structured JSON logs via `console.error(JSON.stringify({ level: "error", ... }))`. Tokens redacted via `redactToken()`. Request IDs via `requestIdMiddleware`.

**Caching:** No HTTP caching. Job status polled every 2s by frontend (MAX_POLLING_TIME: 5 minutes).

**Storage:**
- Local mode: `tmp/uploads` (originals), `tmp/results` (PDFs)
- GCS mode: Originals in `{gcsOriginalPrefix}/{jobId}/{filename}`; results in `{gcsResultPrefix}/{jobId}/{jobId}.pdf`

**Authentication:**
- Members: Firebase ID token (Bearer) verified via `firebase-admin` SDK (ADC or service-account)
- Anonymous: SHA-256 hashed access token in `X-Job-Access-Token` header; constant-time comparison
- Board roles: Custom claims (`admin`, `boardModerator`) on Firebase tokens

**Rate limiting:** 60 requests per hour per IP (configurable); health checks and polling excluded.

**Retention:**
- Anonymous results: 30 minutes (configurable `JOB_RETENTION_MINUTES`)
- Member metadata: 30 days (`DEFAULT_METADATA_RETENTION_MS`)
- Tombstone after delete: 30 days (`TOMBSTONE_RETENTION_MS`)
