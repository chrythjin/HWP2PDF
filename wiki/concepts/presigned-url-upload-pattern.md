---
title: Presigned URL Upload Pattern
summary: Technique to bypass serverless body size limits by having the browser upload files directly to cloud storage
sources:
  - hwp2pdf-blueprint.md
kind: concept
createdAt: "2026-06-12T16:37:31.250Z"
updatedAt: "2026-06-12T16:37:31.250Z"
tags:
  - cloud-storage
  - serverless
  - upload
aliases:
  - presigned-url-upload-pattern
  - PUUP
confidence: 0.95
provenanceState: extracted
modelId: MiniMax-M2.7
promptVersion: v1
---

<think>The user wants me to write a wiki page about "Presigned URL Upload Pattern". I need to analyze the source material provided to extract facts about this topic.

Looking at the source material (hwp2pdf-blueprint.md), I can find relevant information about presigned URLs:

Line 18 mentions: "다운로드는 짧은 TTL Signed URL 또는 프록시 다운로드 방식 사용"

Line 293 mentions: "**공식 권장: presigned URL로 브라우저→GCS 직접 업로드** (Vercel 본문 우회)"

Line 334 mentions: "**업로드 경로** | Vercel Route Handler 통과 (≤4.5MB만) | **GCS V4 Signed URL 직접 PUT** (권장) | 거의 모든 HWP가 4.5MB 초과하므로 B가 사실상 필수"

Lines 89-115 show the system architecture diagram which includes:
- "1) 업로드 요청 (presigned URL 발급)" in the flow from User Browser to API Layer
- "7) Signed URL 발급 or proxy download" in the flow back to frontend

Lines 97-113 describe the flow:
```
[User Browser]
   |
   v
[Next.js Frontend on Vercel]
   |
   | 1) 업로드 요청 (presigned URL 발급)
   v
[API Layer / Job API on Cloud Run]
   |
   | 2) 원본 파일 검증
   | 3) GCS 업로드
   | 4) Job 생성
   v
[GCS Temp Bucket] <----> [Cloud Run Converter Worker]
   |                           |
   |                           | 5) LibreOffice headless 변환
   |                           | 6) 결과 PDF 업로드
   v                           v
[Original HWP]             [Result PDF]
   |
   | 7) Signed URL 발급 or proxy download
   v
[Frontend Download]
```

Lines 379 mentions: "**Vercel Route Handler**: presigned URL 발급 (메모리/시간 부담 없음)"


Lines 379-380 describe the upload process where the Vercel Route Handler generates a presigned URL, allowing the browser to upload directly to GCS without going through the backend. Lines 929-937 in the backend code show the actual implementation of `getSignedDownloadUrl` which generates signed URLs for downloading files. The pattern involves the frontend requesting a presigned URL from the backend, then using that URL to upload directly to GCS, bypassing Vercel's body size limitations.

This approach solves several constraints: Vercel has a 4.5MB body size limit on hobby plans and 6MB on Pro plans, while HWP files with embedded images can reach tens to hundreds of megabytes. By using a presigned URL, the browser uploads directly to GCS, and the backend still handles job creation and validation. The same signed URL mechanism applies to downloads as well, with the URL expiring after 15 minutes. I'll now create a comprehensive wiki page that ties these concepts together.
</think>

# Presigned URL Upload Pattern

The **Presigned URL Upload Pattern** is an architectural approach for handling file uploads in serverless environments where direct upload to backend services is constrained by payload size limits. This pattern enables browsers to upload files directly to cloud storage by obtaining a temporary, signed URL from the backend.

## Problem Statement

Vercel serverless functions impose strict body size limitations:

- **Hobby plan**: 4.5MB maximum payload
- **Pro plan**: 6MB maximum payload

HWP (Hangul Word Processor) files commonly exceed these limits, particularly when containing embedded images. A typical HWP document with media content can reach **tens to hundreds of megabytes**, making direct upload through Vercel functions impractical for this use case. ^[hwp2pdf-blueprint.md:288-293]

## Solution Architecture

The presigned URL pattern resolves this by separating the upload workflow into two distinct phases:

1. **Request phase** — Frontend requests a presigned URL from the backend API
2. **Direct upload phase** — Browser uploads the file directly to cloud storage using the signed URL

This approach bypasses the Vercel function body size limit entirely, as the file payload is sent directly to Google Cloud Storage rather than through the serverless function. ^[hwp2pdf-blueprint.md:293]

## Upload Flow

```
[User Browser]
    │
    │ 1) Request presigned URL
    ▼
[Next.js Frontend on Vercel]
    │
    │ 2) Issue presigned URL
    ▼
[API Layer / Job API on Cloud Run]
    │
    │ 3) Return signed URL
    ▼
[User Browser]
    │
    │ 4) PUT file directly to GCS
    ▼
[GCS Temp Bucket]
```

## Download Flow

The same pattern applies for downloads, where the backend generates a signed URL with a short time-to-live (TTL) for secure, time-limited access to generated files. ^[hwp2pdf-blueprint.md:18]

```
[GCS Temp Bucket]
    │
    │ Request signed URL
    ▼
[API Layer / Job API on Cloud Run]
    │
    │ Generate signed URL (15min TTL)
    ▼
[User Browser]
    │
    │ Direct download from GCS
    ▼
[Frontend Download]
```

## Implementation in HWP2PDF

### Backend Signed URL Generation

The backend service generates V4 signed URLs for both upload and download operations. The following implementation illustrates the download URL generation pattern:

```typescript
export async function getSignedDownloadUrl(objectPath: string) {
  const [url] = await bucket.file(objectPath).getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + 1000 * 60 * 15, // 15-minute TTL
  });
  return url;
}
```

^[hwp2pdf-blueprint.md:929-937]

### Frontend Upload Component

The DropzoneUploader component in the Next.js frontend handles the upload flow by first obtaining a presigned URL from the backend, then uploading the file directly using the signed URL via XMLHttpRequest. ^[hwp2pdf-blueprint.md:526-570]

### GCS Bucket Structure

The HWP2PDF architecture uses a temporary bucket with lifecycle rules:

- **Original files**: `temp/original/{jobId}.hwp`
- **Result files**: `temp/result/{jobId}.pdf`

Files are automatically deleted after 1 day via [[gcs-lifecycle-rules|GCS Lifecycle Rules]]. ^[hwp2pdf-blueprint.md:1007-1025]

## Security Considerations

### Short TTL

Signed URLs should use short expiration times to limit exposure. A 15-minute TTL is recommended for download URLs, balancing usability with security. ^[hwp2pdf-blueprint.md:933]

### Bucket Access Control

The GCS bucket should have public access disabled. All access must go through signed URLs generated by the backend service, ensuring that only authenticated requests can access uploaded files. ^[hwp2pdf-blueprint.md:70]

### UUID-Based Object Keys

Uploaded files should be stored with UUID-based object keys rather than preserving the original filename. This prevents path traversal attacks and ensures unique, unpredictable object names. ^[hwp2pdf-blueprint.md:69]

## Related Concepts

- [[Vercel Serverless Functions Limitations]] — Platform constraints that necessitate this pattern
- [[GCS V4 Signed URLs]] — The signing mechanism used
- [[Async Job Processing]] — Job creation following successful upload
- [[Cloud Run Backend]] — The API layer that issues signed URLs
- [[GCS Lifecycle Rules]] — Automatic cleanup of temporary files
- [[File Upload Security]] — Security considerations for file uploads

---

## Sources

^[hwp2pdf-blueprint.md:18] — Short TTL signed URL or proxy download recommendation  
^[hwp2pdf-blueprint.md:288-293] — Vercel body size limitations and presigned URL solution  
^[hwp2pdf-blueprint.md:293] — Official recommendation for presigned URL browser-to-GCS upload  
^[hwp2pdf-blueprint.md:334] — Upload path tradeoff table  
^[hwp2pdf-blueprint.md:379] — Vercel Route Handler for presigned URL issuance  
^[hwp2pdf-blueprint.md:929-937] — Backend signed URL implementation  
^[hwp2pdf-blueprint.md:1007-1025] — [[gcs-lifecycle-rules|GCS Lifecycle Rules]] for temp files
