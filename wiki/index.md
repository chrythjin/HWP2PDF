# Knowledge Wiki

## Concepts

- **[[hwp2pdfshared-package|@hwp2pdf/shared Package]]** — Shared TypeScript package with .hwp file upload validation (20MB max), job status types, API routes, and polling constants
- **[[agentsmd-pattern|AGENTS.md Pattern]]** — Documentation file pattern for providing compact, verified guidance to AI coding agents at project root
- **[[asynchronous-job-pattern-for-file-processing|Asynchronous Job Pattern for File Processing]]** — Upload → Job creation → Status polling → Download workflow for handling long-running conversions in serverless environments
- **[[build-verification-requirement|Build verification requirement]]** — Commands must be verified as working before being documented; pnpm -r build was verified on 2026-06-13 to build shared then web packages
- **[[cloud-run-conversion-backend|Cloud Run conversion backend]]** — Backend conversion service (potentially Cloud Run) that may not be present in current workspace; verify before using dev:api/build:api scripts
- **[[cloud-run-document-conversion-architecture|Cloud Run Document Conversion Architecture]]** — Serverless container pattern for running LibreOffice headless conversion with cold start mitigation strategies
- **[[documentation-gaps|Documentation Gaps]]** — Known missing documentation includes root README.md, project-specific apps/web/README.md, and unverified api/typecheck/test scripts.
- **[[gcs-lifecycle-management|GCS Lifecycle Management]]** — Automatic cleanup policy for temporary file storage using GCS lifecycle rules, deleting original HWP and result PDF files after 30 minutes
- **[[gcs-lifecycle-rules|GCS Lifecycle Rules]]** — Storage bucket policies that automatically delete temporary files after a specified age, ensuring data cleanup without application logic
- **[[h2orestart-extension|H2Orestart Extension]]** — LibreOffice extension that enables HWP v5.0 file conversion by replacing the broken native HWP filter
- **[[hwp-file-format-conversion-challenges|HWP File Format Conversion Challenges]]** — Technical complexity of HWP format conversion including v5.0 support issues, font dependencies, and quality verification requirements
- **[[hwp-file-upload-constraints|HWP File Upload Constraints]]** — The system accepts only .hwp files with a 20MB size limit, using async job/status response types and polling
- **[[hwp-file-upload-validation|HWP file upload validation]]** — Upload validation enforces 20MB maximum file size and validates .hwp file format through centralized validation logic in the shared package
- **[[hwp2pdf-project|HWP2PDF Project]]** — A pnpm monorepo project for converting HWP documents to PDF, featuring a Next.js web frontend and shared package.
- **[[hwp2pdf-service-architecture|HWP2PDF Service Architecture]]** — Serverless architecture for converting HWP documents to PDF via drag-and-drop upload, featuring presigned URL direct uploads, Redis job tracking, and Google Cloud Run processing
- **[[libreoffice-headless-conversion|LibreOffice Headless Conversion]]** — Server-side document conversion using LibreOffice in headless mode with Korean locale support, UTF-8 encoding enforcement, and 3-minute timeout protection
- **[[llm-wiki-documentation-system|llm-wiki Documentation System]]** — A repo-local wiki entry point for OpenCode sessions, organized with compact operating guides, blueprints, and session notes.
- **[[llm-wiki-repository-structure|llm-wiki Repository Structure]]** — Monorepo with pnpm workspace containing apps/* and packages/* directories for a wiki documentation system
- **[[monorepo-workspace-scripts|Monorepo workspace scripts]]** — Root package.json declares workspace-level scripts and package manager configuration for coordinating across the monorepo
- **[[nextjs-16-frontend|Next.js 16 Frontend]]** — Frontend web application package using Next.js 16.2.9 in the apps/web directory
- **[[nextjs-16-frontend-package|Next.js 16 frontend package]]** — The frontend is implemented as a Next.js 16.2.9 application in apps/web, with its own AGENTS.md guidance file for framework-specific development
- **[[nextjs-1629-frontend|Next.js 16.2.9 frontend]]** — The web frontend is a Next.js application located at apps/web, requiring reading installed docs before changing Next-specific APIs
- **[[nextjs-frontend-application|Next.js Frontend Application]]** — The web frontend lives in apps/web using Next.js 16.2.9, with source under src/app and src/components
- **[[pnpm-monorepo-structure|pnpm Monorepo Structure]]** — Project organization using pnpm workspaces with apps/web, apps/api, and packages/shared packages for shared TypeScript types and validation logic
- **[[pnpm-monorepo-workspace-configuration|pnpm monorepo workspace configuration]]** — The llm-wiki project uses pnpm workspaces with a root pnpm-workspace.yaml that includes apps/* and packages/* directories, requiring Node >=20 and pnpm@8.15.0
- **[[pnpm-recursive-build-verification|pnpm recursive build verification]]** — Build verification uses 'pnpm -r build' to recursively build all workspace packages, which passed for packages/shared and apps/web
- **[[pnpm-workspace-architecture|pnpm Workspace Architecture]]** — The monorepo uses pnpm workspaces with root package 'hwp2pdf', frontend at 'apps/web', and shared utilities at 'packages/shared'.
- **[[pnpm-workspace-configuration|pnpm Workspace Configuration]]** — Workspace setup using pnpm-workspace.yaml with pnpm@8.15.0 and Node >=20 requirement
- **[[pnpm-workspace-monorepo|pnpm workspace monorepo]]** — HWP2PDF uses pnpm workspaces declared in pnpm-workspace.yaml, organizing packages under apps/* and packages/* directories
- **[[presigned-url-security-pattern|Presigned URL Security Pattern]]** — Pattern where the API issues short-lived signed URLs (5-min upload, 15-min download) allowing browsers to directly interact with GCS, avoiding server bottlenecks
- **[[presigned-url-upload-pattern|Presigned URL Upload Pattern]]** — Technique to bypass serverless body size limits by having the browser upload files directly to cloud storage
- **[[redis-job-queue-system|Redis Job Queue System]]** — Redis-based job state management with 2-hour TTL, tracking HWP-to-PDF conversion through states: UPLOADING → QUEUED → PROCESSING → COMPLETED/FAILED
- **[[serverless-rate-limiting|Serverless Rate Limiting]]** — Redis-based rate limiting pattern (Upstash) designed for stateless serverless environments where in-memory solutions fail
- **[[session-documentation-rule|Session documentation rule]]** — After successful code/config changes, developers must add session notes under docs/sessions/YYYYMMDD_HHMMSS_<task-name>.md and update docs/INDEX.md
- **[[session-based-documentation|Session-Based Documentation]]** — Dated session notes in the sessions/ directory track completed implementation and documentation changes for future reference.
- **[[shared-package-architecture|Shared package architecture]]** — The @hwp2pdf/shared package centralizes core functionality including .hwp upload validation, job status types, API routes, and polling constants, built with tsc
- **[[shared-typescript-contracts|Shared TypeScript Contracts]]** — packages/shared publishes @hwp2pdf/shared containing centralized upload constraints (.hwp only, max 20MB) and async job/status types
- **[[shared-typescript-contracts-package|Shared TypeScript contracts package]]** — @hwp2pdf/shared publishes internal TypeScript contracts including upload constraints (.hwp only, max 20MB) and async job/status response types
- **[[upstash-rate-limiting|Upstash Rate Limiting]]** — IP-based rate limiting using Upstash Redis sliding window algorithm, capped at 60 requests per hour with Retry-After headers on 429 responses
- **[[vercel-oidc-federation|Vercel OIDC Federation]]** — Identity federation pattern allowing Vercel deployments to authenticate to GCP services without long-lived credentials
- **[[verified-build-commands|Verified Build Commands]]** — Documented build commands include 'pnpm -r build' as the primary workspace build and targeted builds via package filters.

_41 pages | Generated 2026-06-12T16:40:09.497Z_
