---
title: Asynchronous Job Pattern for File Processing
summary: Upload → Job creation → Status polling → Download workflow for handling long-running conversions in serverless environments
sources:
  - hwp2pdf-blueprint.md
kind: concept
createdAt: "2026-06-12T16:37:28.644Z"
updatedAt: "2026-06-12T16:37:28.644Z"
tags:
  - architecture
  - serverless
  - async
aliases:
  - asynchronous-job-pattern-for-file-processing
  - AJPFFP
confidence: 0.92
provenanceState: extracted
modelId: MiniMax-M2.7
promptVersion: v1
---

<think>The user wants me to write a wiki page about "Asynchronous Job Pattern for File Processing". I need to analyze the source material provided to extract facts about this topic.

Looking at the source material, I can find information about the asynchronous job pattern in the HWP2PDF Blueprint document:

1. Lines 48-58: Discusses the async job model recommendation
   - Upload → Job creation → Conversion progress → Frontend polling → Completion → Download
   - Advantages: more stable for serverless, natural progress display, easier retry/failure management
   - Disadvantage: slightly extended structure

2. Lines 250-268: User flow blueprint
   - Steps for the UX flow
   - Recommended status values: idle, uploading, queued, processing, completed, failed, expired

3. Lines 260-268: Job status values

4. Lines 386-388: Non-blocking pattern mentioned in Cloud Run section
   - Cloud Tasks / Pub/Sub queue + callback URL or frontend polling

5. Lines 572-614: DropzoneUploader.tsx code showing pollJobStatus implementation with 2000ms interval

6. Lines 756-783: upload.route.ts showing multer with 20MB limit

7. Lines 786-844: uploadAndConvertController showing the controller that creates jobId, uploads to GCS, converts, and returns status

8. Lines 847-893: convert.service.ts showing the conversion service

9. Lines 895-938: gcs.service.ts showing GCS upload/download/signed URL

10. Lines 989-999: Rate limiting design

11. Lines 1003-1025: GCS Auto-Cleanup design

12. Line 103: System diagram showing the async flow

13. Lines 48-58: Async job model explanation

14. Lines 252-258: User flow with status progression

Let me structure this wiki page about the Asynchronous Job Pattern for File Processing:

1. Overview
2. Why Async for File Processing


3. Job Status States
4. Workflow Flow
5. Implementation Components
6. Related Concepts
7. Sources

I should write this in a clear, well-structured markdown format with proper citations.
</think>

# Asynchronous Job Pattern for File Processing

The **Asynchronous Job Pattern for File Processing** is an architectural approach used in the HWP2PDF service where file uploads trigger background processing jobs that clients poll for completion. This pattern decouples the time-consuming conversion process from the request-response cycle, enabling stable operation in serverless environments and providing natural progress feedback to users.

## Overview

When a user uploads an HWP file for conversion to PDF, the system does not wait for the conversion to complete before returning a response. Instead, it immediately returns a job identifier and lets the client periodically check the job status until completion or failure. This pattern is particularly important for file processing because:

- **Conversion is time-consuming** — HWP to PDF conversion using LibreOffice can take 10-30 seconds or longer
- **Serverless functions have time limits** — Vercel functions have max durations, and Cloud Run has a 60-minute timeout
- **Cold starts add latency** — LibreOffice startup on Cloud Run can add 60+ seconds to processing time ^[hwp2pdf-blueprint.md:48-58]

## Job Status States

The pattern defines a set of terminal and intermediate states that represent the lifecycle of a conversion job:

| Status | Description |
|--------|-------------|
| `idle` | Initial state, no file selected |
| `uploading` | File is being transmitted to storage |
| `queued` | Job is registered but conversion has not started |
| `processing` | Conversion is actively underway |
| `completed` | PDF is ready for download |
| `failed` | Conversion encountered an error |
| `expired` | Result file was deleted per lifecycle policy |

^[hwp2pdf-blueprint.md:260-268]

## Workflow

The typical flow for an asynchronous file processing job follows these steps:

1. **Upload submission** — Client sends the file to the upload endpoint
2. **Job creation** — Server generates a unique job ID (typically a UUID) and stores job metadata
3. **File storage** — Original file is stored in temporary cloud storage (GCS)
4. **Conversion initiation** — Background worker picks up the job and begins processing
5. **Status polling** — Client periodically queries job status using the job ID
6. **Completion notification** — When status changes to `completed`, the response includes a download URL
7. **File cleanup** — After TTL expires, both original and result files are automatically deleted ^[hwp2pdf-blueprint.md:250-258]

## Client-Side Implementation

The frontend implements polling with a fixed interval to check job status. A typical implementation uses a `setInterval` that fires every 2 seconds to query the status endpoint:

```ts
const pollJobStatus = async (currentJobId: string) => {
  const interval = setInterval(async () => {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/jobs/${currentJobId}`,
      { cache: "no-store" }
    );

    const data = await res.json();

    if (data.status === "completed") {
      setDownloadUrl(data.downloadUrl ?? null);
      clearInterval(interval);
    }

    if (data.status === "failed") {
      setErrorMessage(data.message ?? "변환에 실패했습니다.");
      clearInterval(interval);
    }
  }, 2000);
};
```

^[hwp2pdf-blueprint.md:572-614]

## Backend Components

### Upload Route

The upload endpoint accepts the file, validates constraints, and initiates the job. File validation (extension and size) occurs before processing:

```ts
const upload = multer({
  dest: path.join(os.tmpdir(), "uploads"),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
  },
  fileFilter: (_req, file, cb) => {
    const isHwp = file.originalname.toLowerCase().endsWith(".hwp");
    if (!isHwp) {
      return cb(new Error("Only .hwp files are allowed"));
    }
    cb(null, true);
  },
});
```

^[hwp2pdf-blueprint.md:767-779]

### Storage Service

Files are uploaded to cloud storage (GCS) with UUID-based object keys to prevent filename collisions and path disclosure:

```ts
const jobId = crypto.randomUUID();
const originalObjectPath = `temp/original/${jobId}.hwp`;
await uploadOriginalToGCS(tempInputPath, originalObjectPath);
```

^[hwp2pdf-blueprint.md:809-816]

### Conversion Service

The actual file conversion runs as a background process, typically using LibreOffice in headless mode:

```ts
export async function convertHwpToPdf({
  inputPath,
  outputDir,
}: ConvertParams): Promise<string> {
  await execFileAsync(
    sofficeBinary,
    [
      "--headless",
      "--convert-to",
      "pdf",
      "--outdir",
      outputDir,
      inputPath,
    ],
    {
      timeout: 1000 * 60 * 2, // 2 minutes
    }
  );
  return pdfPath;
}
```

^[hwp2pdf-blueprint.md:862-892]

## Benefits of This Pattern

| Benefit | Explanation |
|---------|-------------|
| **Serverless compatibility** | Long-running conversions don't block HTTP request handlers |
| **Progress visibility** | Users see status progression rather than a blank loading screen |
| **Retry-friendly** | Failed jobs can be retried without re-uploading the source file |
| **Resource control** | Queue-based systems can limit concurrent conversions |
| **Fault isolation** | Worker failures don't affect the API response path |

^[hwp2pdf-blueprint.md:48-58]

## Automatic Cleanup

Since temporary files pose a security risk, the pattern includes automatic cleanup via storage lifecycle policies. Files are deleted after a short TTL (typically 30 minutes to 24 hours):

```json
{
  "rule": [
    {
      "action": { "type": "Delete" },
      "condition": { "age": 1, "matchesPrefix": ["temp/original/"] }
    },
    {
      "action": { "type": "Delete" },
      "condition": { "age": 1, "matchesPrefix": ["temp/result/"] }
    }
  ]
}
```

^[hwp2pdf-blueprint.md:1007-1025]

## Related Concepts

- [[HWP File Upload Constraints]] — Validation rules applied before job creation
- [[@hwp2pdf/shared Package]] — Shared types including job status definitions
- [[GCS Lifecycle Policies]] — Automatic file cleanup mechanisms
- [[LibreOffice Headless Conversion]] — The conversion engine used in the worker
- [[Polling Constants]] — Timing configuration for status checks
- [[Rate Limiting for Async Jobs]] — Protecting the job queue from abuse

---

## Sources

^[hwp2pdf-blueprint.md:48-58] — Async job model rationale and workflow  
^[hwp2pdf-blueprint.md:250-268] — User flow and status state definitions  
^[hwp2pdf-blueprint.md:572-614] — Client-side polling implementation  
^[hwp2pdf-blueprint.md:767-779] — Upload route with validation  
^[hwp2pdf-blueprint.md:809-816] — Job creation and GCS upload  
^[hwp2pdf-blueprint.md:862-892] — Conversion service implementation  
^[hwp2pdf-blueprint.md:1007-1025] — GCS lifecycle cleanup configuration
