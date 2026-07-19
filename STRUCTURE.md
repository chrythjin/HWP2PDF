# Codebase Structure

## Directory Layout

```
[project-root]/
├── apps/
│   ├── api/                   # Express/TypeScript conversion API
│   │   ├── src/
│   │   │   ├── middleware/    # Auth, upload, error, request-id middleware
│   │   │   ├── routes/       # Express routers (v1, board, maintenance)
│   │   │   ├── services/     # Business logic (conversion, job-store, storage, etc.)
│   │   │   ├── utils/        # ApiError, access-token, token helpers
│   │   │   ├── app.ts        # Express app factory
│   │   │   ├── config.ts     # Environment configuration
│   │   │   ├── server.ts     # Server entry point
│   │   │   └── converter-app.test.ts
│   │   └── tmp/              # Local dev upload/result directories
│   └── web/                  # Next.js frontend
│       ├── src/
│       │   ├── app/          # Next.js App Router pages
│       │   ├── auth/         # Firebase Auth client (AuthProvider, useAuth)
│       │   ├── components/    # React components (DropzoneUploader, etc.)
│       │   ├── hooks/         # Custom React hooks
│       │   └── lib/          # API client, Firebase client, utilities
│       └── public/           # Static assets
├── packages/
│   └── shared/               # Shared TypeScript contracts
│       └── src/
│           ├── index.ts      # DTOs, validation, route constants, TTL values
│           ├── job-types.ts  # Re-exports with convenience aliases
│           └── validation.ts # File/board/upload session validators
├── docs/                     # Architecture specs, session logs
├── infrastructure/           # Deployment/infrastructure configs
├── scripts/                  # Build/utility scripts
├── tmp/                      # Temporary files (git-ignored)
├── package.json              # Root workspace manifest
├── pnpm-workspace.yaml       # pnpm workspace config
└── tsconfig.json             # Root TypeScript config
```

## Directory Purposes

**`apps/api/src/`:**
- Purpose: Express API server handling file uploads, job management, conversion dispatch, and board operations
- Contains: Routes, middleware, services, config, server entry point
- Key files: `app.ts` (Express app factory), `server.ts` (listen entry), `routes/v1.ts` (main API routes)

**`apps/api/src/middleware/`:**
- Purpose: Request preprocessing and authorization
- Contains: `auth.ts` (Firebase token verification), `upload.ts` (multipart file handling), `error-handler.ts` (centralized error responses), `worker-auth.ts` (OIDC verification for internal endpoints), `maintenance-auth.ts`, `request-id.ts`

**`apps/api/src/routes/`:**
- Purpose: Express routers defining API endpoints
- Contains: `v1.ts` (upload, job status, download, member history, worker endpoint), `v1.board.ts` (CRUD for board posts), `maintenance.ts` (cleanup/maintenance endpoints)

**`apps/api/src/services/`:**
- Purpose: Core business logic
- Contains: `conversion-service.ts` (LibreOffice invocation), `job-store.ts` (JobRecord CRUD + owner-aware lookups + tombstone retention), `storage-service.ts` (GCS/local dual backend + owner verification), `cloud-tasks-dispatcher.ts` (async job queue), `board-store.ts` (board post CRUD), `firebase-admin.ts` (Firebase Admin SDK lifecycle), `maintenance-service.ts`

**`apps/api/src/utils/`:**
- Purpose: Shared utilities with no external dependencies
- Contains: `api-error.ts` (typed HTTP error), `access-token.ts` (anonymous token generation/hashing/verification), `token.ts` (redaction helpers)

**`apps/web/src/app/`:**
- Purpose: Next.js App Router page components
- Contains: `page.tsx` (home), `history/page.tsx` (member job history), `board/page.tsx` (post list), `board/[id]/page.tsx` (post detail), `board/write/page.tsx`, `board/[id]/edit/page.tsx`, `login/page.tsx`, `signup/page.tsx`, `terms/page.tsx`, `privacy/page.tsx`, `contact/page.tsx`

**`apps/web/src/auth/`:**
- Purpose: Firebase Auth client integration
- Contains: `AuthProvider.tsx` (React context provider), `useAuth.ts` (convenience hook)

**`apps/web/src/components/`:**
- Purpose: Reusable React UI components
- Contains: `DropzoneUploader.tsx` (main upload widget), `JobHistoryList.tsx`, `ConfirmationDialog.tsx`, `PageLayout.tsx`, `MobileNav.tsx`, `AuthNav.tsx`, `AdSenseAd.tsx`

**`apps/web/src/lib/`:**
- Purpose: Client-side utilities and API client
- Contains: `api-client.ts` (fetchWithAuth wrapper), `download-file.ts`, `firebase.ts`, `upload-token.ts` (sessionStorage token persistence)

**`packages/shared/src/`:**
- Purpose: Single source of truth for shared TypeScript contracts
- Contains: `index.ts` (UploadResponse, JobStatusResponse, BoardPost, API_ROUTES, validation helpers, TTL constants), `job-types.ts` (re-exports), `validation.ts` (validateFile, validateBoardPost, validateUploadSession)

## Key File Locations

**Entry Points:**
- API server: `apps/api/src/server.ts` — creates app, listens on `PORT`
- Next.js: `apps/web/src/app/layout.tsx` — root layout with `<AuthProvider>`

**Configuration:**
- Root workspace: `pnpm-workspace.yaml`
- API config: `apps/api/src/config.ts` — all environment variables with smart defaults
- Next.js env: `apps/web/.env.local` / `NEXT_PUBLIC_API_BASE_URL`

**Core Logic:**
- Upload handling: `apps/api/src/routes/v1.ts` (`POST /v1/upload`, `POST /v1/uploads/initiate`, `POST /v1/uploads/complete`)
- Job CRUD: `apps/api/src/services/job-store.ts` (`createJob`, `getJob`, `updateJob`, `claimQueuedJobForProcessing`)
- Conversion: `apps/api/src/services/conversion-service.ts` (`convertJobToPdf`, `runLibreOffice`)
- Storage abstraction: `apps/api/src/services/storage-service.ts` (`shouldUseGcs`, `createOwnerVerifier`, `getProtectedDownloadUrl`)
- Job dispatch: `apps/api/src/services/cloud-tasks-dispatcher.ts` (`enqueueConversionJob`)
- Board CRUD: `apps/api/src/services/board-store.ts`

**Shared Contracts:**
- `packages/shared/src/index.ts`: All shared types, DTOs, route constants, TTL values, validation helpers

**Tests:**
- Co-located with source as `*.test.ts` / `*.test.tsx` (e.g., `apps/api/src/routes/v1.upload-ownership.test.ts`)
- Test config: `vitest.config.ts`

## Naming Conventions

**Files:**
- TypeScript source: `kebab-case.ts` (e.g., `conversion-service.ts`, `cloud-tasks-dispatcher.ts`)
- React components: `PascalCase.tsx` (e.g., `DropzoneUploader.tsx`, `JobHistoryList.tsx`)
- Test files: `*.test.ts` or `*.test.tsx` suffix (e.g., `api-client.auth.test.ts`)
- Next.js pages: `page.tsx` or `[param]/page.tsx`

**Directories:**
- kebab-case throughout (e.g., `job-store`, `cloud-tasks-dispatcher`)

**Exports:**
- Named exports preferred; re-exported types via `export type { ... }` for clarity

## Where to Add New Code

**New API route:**
- Add route handler to `apps/api/src/routes/v1.ts` or create a new router file in `apps/api/src/routes/`
- Follow existing patterns: use `requireAuth`/`optionalAuth` middleware, throw `ApiError` on failure, return typed responses

**New service:**
- Create `apps/api/src/services/[service-name].ts`
- Export interface and implementations if dual-backend (MemoryXxx / FirestoreXxx)
- Register in the store selection section of the appropriate file

**New middleware:**
- Create `apps/api/src/middleware/[middleware-name].ts`
- Follow Express middleware signature: `(req, res, next) => void` or async equivalent

**New shared contract:**
- Add types/DTOs to `packages/shared/src/index.ts`
- Re-export with aliases in `packages/shared/src/job-types.ts` if needed
- Validation helpers also go in `packages/shared/src/validation.ts`

**New Next.js page:**
- Add `page.tsx` to `apps/web/src/app/[route]/`
- Use `@/` path alias for imports from `apps/web/src/`
- Access auth via `useAuth()` hook (requires `<AuthProvider>` in layout)

**New React component:**
- Add to `apps/web/src/components/`
- Use `"use client"` directive for client-side interactivity
- Follow existing component patterns (TypeScript props, accessibility attributes)

**New Firebase custom claim:**
- Add to `AuthenticatedUser` interface in `apps/api/src/middleware/auth.ts`
- Add claim verification in `firebase-admin.ts` decode logic
- Update client-side type if needed

**New environment variable:**
- Add to `apps/api/src/config.ts` with type and default value
- Document in `AGENTS.md` if it affects verified commands
