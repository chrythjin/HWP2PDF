---
title: HWP2PDF Service Architecture
summary: Serverless architecture for converting HWP documents to PDF via drag-and-drop upload, featuring presigned URL direct uploads, Redis job tracking, and Google Cloud Run processing
sources:
  - hwp2pdf-plan-v1.md
kind: concept
createdAt: "2026-06-12T16:38:37.445Z"
updatedAt: "2026-06-12T16:38:37.445Z"
tags:
  - architecture
  - cloud
  - file-conversion
aliases:
  - hwp2pdf-service-architecture
  - HSA
confidence: 0.95
provenanceState: extracted
modelId: MiniMax-M2.7
promptVersion: v1
---

<think>
The user wants me to write a wiki page about "HWP2PDF Service Architecture". I need to analyze the source material provided to extract facts about this topic.

Looking at the source material, I can find relevant information from the HWP2PDF Plan v1 document:

1. Lines 49-89: System Architecture Diagram showing the components
2. Lines 91-111: Technology stack details by layer
3. Lines 53-89: The ASCII architecture diagram showing:
   - User Browser → Next.js Frontend (Vercel) → API Gateway (Cloud Run) → GCS (temp bucket) → Cloud Run Converter Worker

Let me also check the hwp2pdf-blueprint.md for more details:
- Lines 103: System diagram showing upload → async job → Cloud Run conversion
- Lines 48-58: Async job model recommendation
- Various other technical details

The architecture involves:
1. Next.js Frontend on Vercel
2. Cloud Run API Gateway
3. GCS temp bucket
4. Cloud Run Converter Worker with LibreOffice

Let me write a clear, well-structured markdown page about the HWP2PDF Service Architecture.
</think>

# HWP2PDF Service Architecture

The **HWP2PDF Service Architecture** is a serverless cloud-native design that converts Hangul Word Processor (HWP) files to PDF format through a series of interconnected components. The architecture prioritizes simplicity, security through automatic file deletion, and stability through asynchronous job processing.

## High-Level Overview

The system follows a three-tier model:

```
[사용자 브라우저]
    │
    ▼
┌─────────────────────────────────────┐
│  Next.js Frontend (Vercel)          │
│  - 랜딩 페이지 + Dropzone UI         │
│  - 진행 상태 표시                    │
│  - 다운로드 링크 제공                │
└─────────────────────────────────────┘
    │ ① presigned URL 요청
    ▼
┌─────────────────────────────────────┐
│  API Gateway (Cloud Run)            │
│  - 파일 검증                         │
│  - GCS presigned URL 발급           │
│  - Job 생성/상태 조회               │
│  - Rate Limiting (Redis)            │
└─────────────────────────────────────┘
    │ ② 브라우저 → GCS 직접 업로드
    ▼
┌─────────────────────────────────────┐
│  Google Cloud Storage (temp bucket) │
│  - 원본 HWP 저장 (temp/original/)   │
│  - 결과 PDF 저장 (temp/result/)     │
│  - 30분 후 자동 삭제 (Lifecycle)    │
└─────────────────────────────────────┘
    │ ③ 변환 작업 트리거
    ▼
┌─────────────────────────────────────┐
│  Cloud Run Converter Worker         │
│  - LibreOffice Headless + H2Orestart│
│  - HWP → PDF 변환                    │
│  - 결과 GCS 업로드                   │
│  - 로컬 임시 파일 즉시 삭제          │
└─────────────────────────────────────┘
```

^[hwp2pdf-plan-v1.md:49-89]

## Component Layers

### Frontend Layer

| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | Next.js 14 (App Router) | SSR/ISR, Vercel optimization |
| Styling | Tailwind CSS v3.4 | Rapid UI development |
| File Upload | react-dropzone v14 | Drag-and-drop interface |
| Language | TypeScript v5 | Type safety |

The frontend serves as the user-facing interface, providing a landing page, drag-and-drop upload zone, and progress status display. It does not handle file conversion directly. ^[hwp2pdf-plan-v1.md:95-98]

### API Gateway Layer

| Component | Technology | Purpose |
|-----------|------------|---------|
| Runtime | Node.js + Express v20 LTS | Lightweight, Cloud Run friendly |
| File Upload | Multer v1.4 | Multipart upload handling |
| Storage SDK | Google Cloud Storage SDK | GCS integration |
| Rate Limiting | Upstash Redis | Request throttling |

The API Gateway handles presigned URL generation, file validation, job creation, and rate limiting. It acts as the orchestration layer between the frontend and backend services. ^[hwp2pdf-plan-v1.md:99-102,109]

### Conversion Engine Layer

| Component | Technology | Purpose |
|-----------|------------|---------|
| Conversion | LibreOffice 7.6.x | HWP to PDF conversion |
| HWP Support | [[h2orestart-extension|H2Orestart Extension]] | HWP v5.0 compatibility |
| Fonts | fonts-nanum, Noto CJK | Korean character rendering |

The conversion worker runs LibreOffice in headless mode with the [[h2orestart-extension|H2Orestart Extension]] for improved HWP compatibility. All temporary local files are deleted immediately after processing. ^[hwp2pdf-plan-v1.md:103-105,87]

### Storage Layer

| Component | Technology | Purpose |
|-----------|------------|---------|
| Temporary Storage | GCS Standard | Original and result file storage |
| Lifecycle | [[gcs-lifecycle-rules|GCS Lifecycle Rules]] | Automatic deletion after 30 minutes |
| Path Strategy | UUID-based naming | Prevent filename collisions and path disclosure |

^[hwp2pdf-plan-v1.md:108,78-79,110-111]

## Data Flow

### Upload Flow

1. User drags and drops an HWP file onto the frontend
2. Frontend requests a presigned upload URL from the API Gateway
3. API Gateway validates the request, checks rate limits, and generates a presigned URL
4. Browser uploads the file directly to GCS using the presigned URL
5. Frontend receives confirmation and initiates job polling

This presigned URL approach avoids Vercel's function size limit (4.5MB) by bypassing the serverless function for large file transfers. ^[hwp2pdf-plan-v1.md:73,932]

### Conversion Flow

1. API Gateway creates a job record and returns a job ID to the frontend
2. Cloud Run Converter Worker polls for new jobs or receives a trigger
3. Worker downloads the HWP file from GCS
4. LibreOffice (headless) converts HWP to PDF using H2Orestart filter
5. Result PDF is uploaded to GCS with a UUID-based path
6. Job status is updated to `completed` with a signed download URL

^[hwp2pdf-plan-v1.md:83-88,462-558]

### Polling Flow

The frontend polls the job status endpoint every 2 seconds using `setInterval`:

```typescript
const interval = setInterval(async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/jobs/${currentJobId}`);
  const data = await res.json();

  if (data.status === "completed") {
    setDownloadUrl(data.downloadUrl ?? null);
    clearInterval(interval);
  }
  // ...
}, 2000);
```

This provides natural progress display and handles job state transitions gracefully. ^[hwp2pdf-blueprint.md:572-614]

## Security Architecture

### File Access Control

| Security Measure | Implementation |
|------------------|----------------|
| Bucket Access | GCS bucket is private, no public access |
| Upload Authentication | Presigned URLs with short TTL (5 minutes) |
| Download Authentication | Signed URLs with 15-minute TTL |
| Filename Protection | UUID-based object names prevent path traversal |

^[hwp2pdf-plan-v1.md:955-977]

### Rate Limiting

Rate limiting uses Upstash Redis with a sliding window algorithm:

- **Limit**: 60 requests per IP per hour
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- **429 Response**: Includes `Retry-After` header

^[hwp2pdf-plan-v1.md:622-687,989-993]

### Automatic Deletion

Temporary files are automatically deleted by GCS Lifecycle policies after a short retention period. This is enforced at the storage layer, not in application code, ensuring deletion occurs regardless of application state. ^[hwp2pdf-plan-v1.md:78-79,930]

## Deployment Architecture

| Environment | Platform | Configuration |
|-------------|----------|--------------|
| Frontend | Vercel Pro | Global CDN, automatic scaling |
| API Gateway | Cloud Run | min-instances=1, max-instances=10, 2GiB memory |
| Converter Worker | Cloud Run | concurrency=1, timeout=300s |
| Storage | GCS Standard | Lifecycle rules for auto-cleanup |

^[hwp2pdf-plan-v1.md:106-111,822-831]

## Monorepo Structure

The project uses a [[pnpm-workspace-monorepo|pnpm workspace monorepo]] structure:

```
hwp2pdf/
├── pnpm-workspace.yaml
├── packages/
│   └── shared/           # @hwp2pdf/shared - shared types and utilities
└── apps/
    ├── web/             # Next.js frontend
    └── api/            # Express backend (Cloud Run)
```

This structure ensures that shared types are built before dependent packages, and allows independent deployment of frontend and backend. ^[hwp2pdf-plan-v1.md:269-279]

---

## Sources

^[hwp2pdf-plan-v1.md:49-89] — System architecture ASCII diagram and component overview  
^[hwp2pdf-plan-v1.md:91-111] — Technology stack by layer  
^[hwp2pdf-plan-v1.md:269-279] — Monorepo workspace configuration  
^[hwp2pdf-plan-v1.md:622-687] — Rate limiting implementation  
^[hwp2pdf-plan-v1.md:955-977] — Security checklist  
^[hwp2pdf-plan-v1.md:822-831] — Cloud Run deployment configuration  
^[hwp2pdf-blueprint.md:572-614] — Frontend polling implementation  

---

## Related Concepts

- [[Async Job Pattern for File Processing]] — Job status polling mechanism
- [[GCS Lifecycle Rules]] — Automatic file cleanup
- [[HWP File Upload Constraints]] — File validation rules
- [[Rate Limiting Design]] — Upstash Redis rate limiting
- [[LibreOffice Headless Conversion]] — Conversion engine details
- [[@hwp2pdf/shared Package]] — [[shared-typescript-contracts|Shared TypeScript Contracts]]
- [[Cloud Run conversion backend]] — Backend service details
- [[Build verification requirement]] — Build system practices
