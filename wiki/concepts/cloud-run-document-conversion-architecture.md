---
title: Cloud Run Document Conversion Architecture
summary: Serverless container pattern for running LibreOffice headless conversion with cold start mitigation strategies
sources:
  - hwp2pdf-blueprint.md
kind: concept
createdAt: "2026-06-12T16:37:55.528Z"
updatedAt: "2026-06-12T16:37:55.528Z"
tags:
  - gcp
  - cloud-run
  - serverless
  - conversion
aliases:
  - cloud-run-document-conversion-architecture
  - CRDCA
confidence: 0.9
provenanceState: merged
modelId: MiniMax-M2.7
promptVersion: v1
---

<think>The user wants me to write a wiki page about "Cloud Run Document Conversion Architecture". I need to analyze the source material provided to extract facts about this topic.

Looking at the source material (hwp2pdf-blueprint.md), I can find information about Cloud Run Document Conversion Architecture:

1. Lines 18-25: Architecture overview - Next.js frontend on Vercel → Cloud Run API/Worker → GCS temp bucket
2. Lines 48-58: Async job model recommendation
3. Lines 91-115: System diagram showing the architecture
4. Lines 119-243: Project folder structure showing apps/web and apps/api
5. Lines 295-306: Cloud Run + LibreOffice cold start issues
6. Lines 382-389: Cloud Run conversion service requirements
7. Lines 160-198: apps/api folder structure (Cloud Run backend)
8. Lines 756-973: Backend API code (upload routes, controllers, services)

Key architectural points:
- Frontend: Next.js on Vercel
- Backend: Cloud Run API/Worker for conversion
- Storage: GCS temp bucket
- LibreOffice headless for conversion
- Async job model with polling
- Gotenberg or unoserver for listener mode
- Cold start issues and solutions (min-instances=1, Startup CPU Boost)
- Memory requirements (2GiB minimum)
- Rate limiting with Redis/Upstash

Let me write a clear, well-structured markdown page about this architecture.
</think>

# Cloud Run Document Conversion Architecture

The **Cloud Run Document Conversion Architecture** is the backend infrastructure design for the HWP2PDF service, where heavy document conversion workloads are offloaded from the serverless frontend to containerized Cloud Run workers. This separation ensures that CPU and memory-intensive LibreOffice operations do not impact frontend performance or hit Vercel's function limitations.

## Architecture Overview

The recommended architecture follows a three-tier model:

1. **Frontend Tier** — Next.js application deployed on Vercel, providing the upload UX
2. **API/Worker Tier** — Cloud Run container handling file validation, job management, and document conversion
3. **Storage Tier** — Google Cloud Storage (GCS) temporary bucket for original files and converted PDFs

^[hwp2pdf-blueprint.md:18-25]

```
[User Browser]
   |
   v
[Next.js Frontend on Vercel]
   |
   | 1) Upload request (presigned URL issuance)
   v
[API Layer / Job API on Cloud Run]
   |
   | 2) Original file validation
   | 3) GCS upload
   | 4) Job creation
   v
[GCS Temp Bucket] <----> [Cloud Run Converter Worker]
   |                           |
   |                           | 5) [[libreoffice-headless-conversion|LibreOffice Headless Conversion]]
   |                           | 6) Result PDF upload
   v                           v
[Original HWP]             [Result PDF]
   |
   | 7) Signed URL issuance or proxy download
   v
[Frontend Download]
```

^[hwp2pdf-blueprint.md:91-115]

## Why Cloud Run for Conversion

Vercel functions are unsuitable for document conversion due to payload size limits and execution timeouts. The Hobby plan limits payloads to 4.5MB, and the Pro plan to 6MB — insufficient for typical HWP files which commonly reach tens or hundreds of megabytes with embedded images. Additionally, Vercel's maximum duration limits would be exceeded by conversion processing times. Cloud Run provides the containerized, stateless execution environment needed for LibreOffice-based conversion without these constraints. ^[hwp2pdf-blueprint.md:288-293]

## Project Structure

The architecture uses a pnpm monorepo with two primary application packages:

```
hwp2pdf/
├─ apps/
│  ├─ web/                    # Next.js frontend (Vercel)
│  └─ api/                    # Cloud Run backend
│       ├─ src/
│       │  ├─ app.ts          # Express entrypoint
│       │  ├─ routes/         # upload, jobs, download, health
│       │  ├─ controllers/    # Business logic handlers
│       │  ├─ services/       # GCS, conversion, job, rate-limit
│       │  ├─ middleware/     # multer, error handling, rate-limit
│       │  └─ lib/            # Logger, env, errors
│       └─ Dockerfile
├─ packages/
│  └─ shared/                 # Shared TypeScript types
└─ infrastructure/
   └─ gcp/
       ├─ cloud-run.yaml      # Cloud Run service config
       └─ bucket-lifecycle.json
```

^[hwp2pdf-blueprint.md:119-198]

## Conversion Engine

The conversion service uses **LibreOffice in headless mode** to transform HWP files to PDF. For HWP v5.0 (the current mainstream version released in 2010) and HWPX files, the **H2Orestart extension** is required to avoid silent corruption bugs present in LibreOffice's built-in HWP filter. This extension is installed via `unopkg add --shared` and invoked with the `--infilter="Hwp2002_File"` parameter. ^[hwp2pdf-blueprint.md:276-281]

### Cold Start Challenges

LibreOffice starts fresh for each request in stateless mode, causing Cloud Run cold starts of 60 seconds or more. The recommended solution is **listener mode** using either unoserver (Python) or Gotenberg (Go), which reduces CPU load by 50-75% and increases throughput by 2-4x. ^[hwp2pdf-blueprint.md:295-306]

### Resource Requirements

Minimum memory allocation of **2GiB** is recommended based on observed usage where a 90MB DOCX file consumed over 2GB during conversion. LibreOffice is a single-process CPU consumer, so increasing concurrency requires proportional memory increases. ^[hwp2pdf-blueprint.md:298-299]

## Async Job Processing

Cloud Run conversion uses an asynchronous job model where:

1. The frontend submits an upload request
2. The API creates a job with a UUID identifier and stores metadata
3. The response returns the job ID immediately
4. The frontend polls job status at regular intervals (recommended: every 2 seconds)
5. Upon completion, the response includes a signed download URL ^[hwp2pdf-blueprint.md:48-58]

### Job Status States

| Status | Description |
|--------|-------------|
| `idle` | No file selected |
| `uploading` | File transmission in progress |
| `queued` | Job registered, awaiting conversion |
| `processing` | Conversion actively underway |
| `completed` | PDF ready for download |
| `failed` | Conversion error occurred |
| `expired` | Result file deleted per lifecycle policy |

^[hwp2pdf-blueprint.md:260-268]

## Cloud Run Configuration

The recommended Cloud Run service configuration includes:

- **min-instances=1** — Prevents cold starts at a cost of approximately $3.24/month in memory charges
- **Startup CPU Boost** — Doubles CPU for 10 seconds after a request arrives
- **concurrency=1** — Single-process LibreOffice requires serialized execution
- **timeout=300-600s** — Accounting for cold start delays within Cloud Run's 60-minute maximum
- **memory=2GiB** — Minimum to handle large documents with embedded images ^[hwp2pdf-blueprint.md:382-388,304-305]

## GCS Storage Integration

Files are stored in GCS using UUID-based object keys to prevent filename collisions and path disclosure:

- Original files: `temp/original/{jobId}.hwp`
- Result PDFs: `temp/result/{jobId}.pdf`

Automatic cleanup is enforced via lifecycle policies that delete files after a short TTL (typically 1 day), and incomplete multipart uploads are aborted after 1 day to prevent cost leakage. ^[hwp2pdf-blueprint.md:1007-1025]

## Authentication

Vercel to Cloud Run authentication uses **OIDC Federation**, eliminating the need for long-lived credentials. The Vercel OIDC token is exchanged via Google Workload Identity Federation, with the calling service account granted the `roles/run.invoker` role on Cloud Run. The audience in the token must exactly match the Cloud Run service URL. ^[hwp2pdf-blueprint.md:313-316]

---

## Sources

^[hwp2pdf-blueprint.md:18-25] — Architecture rationale and tier breakdown  
^[hwp2pdf-blueprint.md:91-115] — System diagram showing data flow  
^[hwp2pdf-blueprint.md:119-198] — Project folder structure  
^[hwp2pdf-blueprint.md:260-268] — Job status state definitions  
^[hwp2pdf-blueprint.md:276-281] — [[h2orestart-extension|H2Orestart Extension]] for HWP v5.0 support  
^[hwp2pdf-blueprint.md:288-293] — Vercel payload and duration limitations  
^[hwp2pdf-blueprint.md:295-306] — Cold start challenges and listener mode solution  
^[hwp2pdf-blueprint.md:382-388] — Cloud Run service configuration checklist  
^[hwp2pdf-blueprint.md:1007-1025] — GCS lifecycle auto-cleanup rules  
^[hwp2pdf-blueprint.md:313-316] — Vercel OIDC to GCP authentication

---

## Related Concepts

- [[Asynchronous Job Pattern for File Processing]] — The polling-based job lifecycle
- [[HWP File Upload Constraints]] — File validation rules (20MB, .hwp only)
- [[GCS Lifecycle Policies]] — Automatic file cleanup mechanisms
- [[LibreOffice Headless Conversion]] — The conversion engine implementation
- [[Async Job Processing]] — Pattern used for conversion requests
- [[@hwp2pdf/shared Package]] — Shared types consumed by the backend
- [[Build verification requirement]] — Commands must be verified before use
- [[Cloud Run conversion backend]] — Backend service documentation
