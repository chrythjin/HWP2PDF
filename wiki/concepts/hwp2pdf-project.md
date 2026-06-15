---
title: HWP2PDF Project
summary: A pnpm monorepo project for converting HWP documents to PDF, featuring a Next.js web frontend and shared package.
sources:
  - index.md
kind: concept
createdAt: "2026-06-12T16:39:23.521Z"
updatedAt: "2026-06-12T16:39:23.521Z"
tags:
  - project-structure
  - monorepo
  - hwp-conversion
aliases:
  - hwp2pdf-project
confidence: 0.95
provenanceState: extracted
modelId: MiniMax-M2.7
promptVersion: v1
---

<think>
The user wants me to write a wiki page about "HWP2PDF Project". I need to analyze the source material provided to extract facts about this project. Let me review all the source files:

1. **index.md** - This is the main index/entry point for the HWP2PDF llm-wiki. It contains:
   - Project overview
   - Verified repository shape
   - Verified commands
   - Current known gaps

2. **agents.md** - Contains [[agentsmd-pattern|AGENTS.md Pattern]] information and verification requirements

3. **hwp2pdf-blueprint.md** - Contains the architecture blueprint for the HWP2PDF service

Let me extract the key facts from each source:

**From index.md:**
- pnpm workspace named `hwp2pdf`
- Frontend: `apps/web`, package name `web`, Next.js 16.2.9
- Shared package: `packages/shared`, package name `@hwp2pdf/shared`
- Backend conversion service: documented in specs, but no `apps/api` package found
- `pnpm -r build` passed on 2026-06-13
- Known gaps: no root README.md, apps/web/README.md is default CNA template, root scripts mention `api`/`typecheck`/`test` but not verified

**From agents.md:**
- `packages/shared` publishes TypeScript contracts as `@hwp2pdf/shared`
- [[build-verification-requirement|Build verification requirement]]: `pnpm -r build` verified on 2026-06-13
- [[cloud-run-conversion-backend|Cloud Run conversion backend]] may not be present
- Upload constraints in shared package
- Async job/status response types and polling constants

**From hwp2pdf-blueprint.md:**
- Full architecture: Next.js frontend on Vercel → Cloud Run API/Worker → GCS temp bucket
- Async job model for conversion
- [[libreoffice-headless-conversion|LibreOffice Headless Conversion]]
- File constraints: .hwp only, max 20MB
- Job status states: idle, uploading, queued, processing, completed, failed, expired


- The project converts HWP (Hangul Word Processor) files to PDF format through a serverless architecture. The system uses an asynchronous job-based approach where uploads trigger background conversion tasks, with status polling providing real-time feedback to users. LibreOffice handles the actual file transformation, while Google Cloud Run manages the conversion workload and Cloud Storage maintains temporary files throughout the process.
</think>

# HWP2PDF Project

The **HWP2PDF Project** is a serverless web service that converts HWP (Hangul Word Processor) files to PDF format. It is built as a pnpm monorepo with a Next.js frontend deployed on Vercel and a Cloud Run backend for document conversion, using Google Cloud Storage for temporary file handling.

## Project Overview

The service provides an asynchronous file conversion workflow where users upload HWP files through a web interface, receive a job identifier, and poll for conversion status until the PDF is ready for download. This architecture decouples the time-consuming conversion process from the request-response cycle, ensuring stable operation in serverless environments. ^[index.md:10, hwp2pdf-blueprint.md:48-58]

## Repository Structure

The repository is organized as a pnpm workspace named `hwp2pdf`:

```
hwp2pdf/
├─ apps/
│  └─ web/                    # Next.js frontend (Vercel)
├─ packages/
│  └─ shared/                 # Shared TypeScript types (@hwp2pdf/shared)
├─ superpowers/
│  └─ specs/                  # Architecture and implementation specs
└─ docs/
   └─ sessions/               # Dated session notes
```

^[index.md:21-22]

### Frontend Package

The frontend resides in `apps/web` with the package name `web`. It uses **Next.js 16.2.9** to serve the upload interface and poll for job status. The frontend communicates with the Cloud Run backend via REST API endpoints for job submission and status retrieval. ^[index.md:22, hwp2pdf-blueprint.md:18-25]

### Shared Package

The `packages/shared` package publishes internal TypeScript contracts as `@hwp2pdf/shared`. This package centralizes:

- **Upload constraints** — `.hwp` file extension validation, 20MB maximum file size
- **Job status response types** — Type definitions for async job states
- **Polling constants** — Timing configuration for status checks (2-second interval recommended)
- **API route paths** — Endpoint constants for frontend-backend communication ^[agents.md:16,33]

The shared package is built with `tsc` which outputs to `dist/`, and its types are consumed by both the frontend and the backend conversion service. ^[agents.md:16]

### Backend Conversion Service

The [[cloud-run-conversion-backend|Cloud Run conversion backend]] handles the actual HWP-to-PDF conversion using LibreOffice in headless mode. According to the architecture blueprint, the backend follows an asynchronous job model where:

1. The frontend submits an upload and receives a job ID
2. The backend stores the original file in GCS and creates a job record
3. A worker picks up the conversion job and processes it
4. The frontend polls status updates using the job ID
5. Upon completion, a signed download URL is returned ^[hwp2pdf-blueprint.md:48-58]

**Note:** The architecture is documented in the specs, but during the initial repository setup, no `apps/api` package was found in the workspace. Verification is required before using `dev:api` or `build:api` scripts. ^[index.md:24, agents.md:34]

## [[verified-build-commands|Verified Build Commands]]

The following commands have been verified as working:

| Command | Verification Date | Result |
|---------|------------------|--------|
| `pnpm -r build` | 2026-06-13 | Passed — builds `packages/shared` with `tsc`, then `apps/web` with `next build` |

^[index.md:28, agents.md:23]

Individual package builds can be run directly:

- `pnpm --filter web build`
- `pnpm --filter @hwp2pdf/shared build`

^[index.md:29]

## File Upload Constraints

The service enforces the following upload constraints, centralized in `packages/shared/src/index.ts`:

| Constraint | Value |
|------------|-------|
| File extension | `.hwp` only |
| Maximum file size | 20MB |
| Result format | PDF |

^[agents.md:33, hwp2pdf-blueprint.md:756-779]

## Architecture Diagram

```
[User Browser]
   |
   v
[Next.js Frontend on Vercel]
   |
   | 1) Upload request (presigned URL or direct upload)
   v
[Cloud Run API/Worker]
   |
   | 2) File validation (extension, size)
   | 3) GCS upload (temp/original/{jobId}.hwp)
   | 4) Job creation
   v
[GCS Temp Bucket] <----> [Cloud Run Converter Worker]
   |                           |
   |                           | 5) [[libreoffice-headless-conversion|LibreOffice Headless Conversion]]
   |                           | 6) Result PDF upload (temp/result/{jobId}.pdf)
   v                           v
[Original HWP]             [Result PDF]
```

^[hwp2pdf-blueprint.md:91-115]

## Job Status States

The conversion lifecycle progresses through the following states:

| Status | Description |
|--------|-------------|
| `idle` | Initial state, no file selected |
| `uploading` | File is being transmitted |
| `queued` | Job registered, awaiting conversion |
| `processing` | Conversion actively underway |
| `completed` | PDF ready for download |
| `failed` | Conversion encountered an error |
| `expired` | Result file deleted per lifecycle policy |

^[hwp2pdf-blueprint.md:260-268]

## Known Gaps

The following issues were identified during repository initialization:

- **No root `README.md`** — Project-specific documentation is missing at the root level
- **`apps/web/README.md`** — Contains the default Create Next App template, not project-specific content
- **Backend scripts unverified** — Root scripts mention `api`, `typecheck`, and `test`, but these have not been verified as usable across the workspace

^[index.md:32-35]

## Documentation Structure

Project documentation is organized as follows:

| Path | Purpose |
|------|---------|
| `AGENTS.md` | Compact operating guide for AI agents |
| `superpowers/specs/HWP2PDF-Blueprint.md` | Product and architecture blueprint |
| `superpowers/specs/HWP2PDF-Plan-v1.md` | Detailed implementation plan |
| `docs/sessions/` | Dated session notes for completed changes |

^[index.md:14-17]

---

## Sources

^[index.md:10,21-22] — Repository structure and entry point  
^[index.md:24] — Backend package absence note  
^[index.md:28-29] — [[verified-build-commands|Verified Build Commands]]  
^[index.md:32-35] — Known [[documentation-gaps|Documentation Gaps]]  
^[agents.md:16,33] — Shared package contents and constraints  
^[agents.md:23] — Build verification date  
^[agents.md:34] — Backend verification requirement  
^[hwp2pdf-blueprint.md:18-25] — Architecture overview  
^[hwp2pdf-blueprint.md:48-58] — Async job model  
^[hwp2pdf-blueprint.md:91-115] — System diagram  
^[hwp2pdf-blueprint.md:260-268] — Job status states  
^[hwp2pdf-blueprint.md:756-779] — Upload route validation  
^[hwp2pdf-blueprint.md:1007-1025] — GCS lifecycle cleanup

---

## Related Concepts

- [[AGENTS.md Pattern]] — Documentation pattern for AI agent guidance
- [[Asynchronous Job Pattern for File Processing]] — Job-based workflow for conversions
- [[Cloud Run Document Conversion Architecture]] — Backend infrastructure design
- [[Build verification requirement]] — Practice of verifying commands before documentation
- [[@hwp2pdf/shared Package]] — [[shared-typescript-contracts|Shared TypeScript Contracts]] and types
- [[HWP File Upload Constraints]] — File validation rules
- [[Async Job Processing]] — Pattern used for conversion requests
