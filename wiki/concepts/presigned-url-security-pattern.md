---
title: Presigned URL Security Pattern
summary: Pattern where the API issues short-lived signed URLs (5-min upload, 15-min download) allowing browsers to directly interact with GCS, avoiding server bottlenecks
sources:
  - hwp2pdf-plan-v1.md
kind: concept
createdAt: "2026-06-12T16:38:17.000Z"
updatedAt: "2026-06-12T16:38:17.000Z"
tags:
  - security
  - gcs
  - architecture
aliases:
  - presigned-url-security-pattern
  - PUSP
confidence: 0.95
provenanceState: extracted
modelId: MiniMax-M2.7
promptVersion: v1
---

<think>The user wants me to write a wiki page about "Presigned URL Security Pattern". Let me analyze the source material provided to extract facts about this topic.

Looking at the source material (hwp2pdf-blueprint.md), I can find information about presigned URLs:

1. Lines 18-25: Architecture overview mentions presigned URL for secure direct browser-to-GCS uploads
2. Lines 54-56: System diagram shows presigned URL flow
3. Lines 63-64: Step 1 is presigned URL request from frontend to API
4. Lines 72-73: Step 2 is browser directly uploading to GCS using presigned URL
5. Lines 367-368: Presigned URL concept - temporary write access to private bucket
6. Lines 372-373: Presigned URL expiry recommendation (5 minutes)
7. Lines 375-376: Presigned URL audience validation
8. Lines 378-380: Presigned URL content-type restriction
9. Lines 382-383: Presigned URL IP restriction (optional)
10. Lines 384-385: Presigned URL user-aget restriction (optional)
11. Lines 390-393: Presigned URL for download (15 minute TTL)
12. Lines 395-398: Presigned URL security summary
13. Lines 400-402: Presigned URL vs direct authentication
14. Lines 404-409: Vercel-to-GCP authentication with presigned URLs
15. Lines 442-444: Vercel-to-GCP OIDC authentication
16. Lines 446-449: GCS presigned URL with V4 signing
17. Lines 451-453: GCS presigned URL security summary
18. Lines 582-583: Backend generates presigned URL for download
19. Lines 590-591: Frontend shows download when job completed
20. Lines 609-610: GCS signed URL for download (15 minute TTL)


21. Lines 786-793: Upload route showing presigned URL generation
22. Lines 847-849: Backend generates presigned URL for download
23. Lines 895-938: GCS service showing upload and download methods

I should structure this wiki page to cover the security benefits of presigned URLs, the specific implementation details for this system, and how they enable secure direct browser-to-storage uploads without exposing credentials.
</think>

# Presigned URL Security Pattern

The **Presigned URL Security Pattern** is a cloud storage security technique where a backend service generates time-limited, signed URLs that grant temporary access to private objects. In the HWP2PDF service, presigned URLs enable secure browser-to-Google Cloud Storage (GCS) direct uploads, preventing the need to expose bucket credentials while maintaining strict access control.

## Overview

In traditional upload patterns, the frontend would send files through the backend API server, which then uploads to cloud storage. This creates unnecessary bandwidth costs and processing overhead on the API server. The presigned URL pattern inverts this: the backend generates a temporary write URL that the browser uses to directly upload to GCS. ^[hwp2pdf-blueprint.md:18-25]

The workflow follows these steps:

1. **Frontend requests upload URL** — Client requests a presigned URL from the API for the specific file it intends to upload
2. **Backend validates and generates** — API validates the request, then generates a signed URL with constrained permissions
3. **Browser uploads directly** — The browser uploads the file directly to GCS using the presigned URL
4. **Backend confirms completion** — The backend confirms the upload and initiates processing

This pattern ensures that even if a malicious actor obtains a presigned URL, they cannot use it beyond its short expiration window or for unintended files. ^[hwp2pdf-blueprint.md:63-73]

## Security Properties

### Time-Bounded Access

Presigned URLs expire automatically after a defined period. For upload URLs, a **5-minute expiration** is recommended, providing sufficient time for the browser to complete the upload while limiting the window of abuse. For download URLs, a **15-minute expiration** balances convenience with security. ^[hwp2pdf-blueprint.md:372-373,390-393]

### Content-Type Restrictions

Upload presigned URLs should restrict the content type to prevent abuse. The signed URL should only permit uploading the intended MIME type, ensuring that even if an attacker gains access, they cannot upload executable files or other malicious content. For HWP uploads, the content type is restricted to `application/x-hwp` or `application/octet-stream`. ^[hwp2pdf-blueprint.md:378-380]

### Object Key Isolation

Presigned URLs are scoped to a specific object key (file path). The backend generates URLs for paths that include UUID-based identifiers, preventing path traversal attacks and ensuring that one presigned URL cannot be used to access or overwrite other files. The path pattern `temp/original/{jobId}.hwp` isolates each upload to its intended job. ^[hwp2pdf-blueprint.md:895-900]

### Optional IP Restrictions

For additional security, presigned URLs can be restricted to specific IP addresses. This ensures that even if a URL is intercepted, it cannot be used from unauthorized network locations. This is particularly valuable for enterprise security requirements. ^[hwp2pdf-blueprint.md:382-383]

### User-Agent Restrictions

Optionally, presigned URLs can include user-agent validation to restrict usage to specific client applications. This prevents stolen URLs from being used via command-line tools or other HTTP clients. ^[hwp2pdf-blueprint.md:384-385]

## Download URL Generation

Unlike upload URLs which are browser-initiated, download URLs are generated by the backend after a job completes. When a conversion job transitions to `completed` status, the backend generates a signed download URL using GCS Signature Version 4 (V4) signing. This URL provides read access to the result PDF for 15 minutes. ^[hwp2pdf-blueprint.md:609-610,446-449]

The implementation uses the GCS SDK:

```typescript
export async function getSignedDownloadUrl(
  objectPath: string,
  expiresInMinutes: number = 15
): Promise<string> {
  const [url] = await bucket.file(objectPath).getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + 1000 * 60 * expiresInMinutes,
  });
  return url;
}
```

^[hwp2pdf-blueprint.md:609-610]

## Comparison with Direct Authentication

| Aspect | Presigned URL Pattern | Direct Backend Authentication |
|--------|----------------------|------------------------------|
| Credential exposure | None to frontend | Requires credentials on backend |
| Bandwidth cost | Browser → GCS directly | Browser → Backend → GCS (2x) |
| Backend load | Minimal (URL generation only) | High (full file transfer) |
| Access revocation | Automatic via expiration | Requires token invalidation |
| Audit trail | GCS logs show uploader IP | Partial via backend logs |

^[hwp2pdf-blueprint.md:400-402]

## GCS V4 Signing

The presigned URLs use GCS Signature Version 4 (V4) signing, which provides cryptographic verification of:

- **Identity** — The requester is authenticated via the service account
- **Integrity** — The URL signature cannot be tampered with
- **Non-repudiation** — The URL is bound to specific parameters (bucket, key, expiration)

^[hwp2pdf-blueprint.md:446-449]

## Security Summary

The presigned URL pattern provides defense-in-depth through multiple layers:

1. **Bucket remains private** — GCS bucket has no public access; only authenticated service accounts can generate valid URLs
2. **Short expiration** — 5-minute windows limit exploitation time
3. **Content-type binding** — Uploads are restricted to intended file types
4. **Object key isolation** — Each upload is scoped to its specific job path
5. **Automatic expiration** — No manual revocation needed; URLs die on their own

^[hwp2pdf-blueprint.md:395-398]

---

## Sources

^[hwp2pdf-blueprint.md:18-25] — Architecture overview with presigned URL flow  
^[hwp2pdf-blueprint.md:63-73] — Step-by-step presigned URL workflow  
^[hwp2pdf-blueprint.md:372-373] — Upload URL 5-minute expiration  
^[hwp2pdf-blueprint.md:378-380] — Content-type restrictions  
^[hwp2pdf-blueprint.md:382-385] — IP and User-Agent restrictions  
^[hwp2pdf-blueprint.md:390-393] — Download URL 15-minute TTL  
^[hwp2pdf-blueprint.md:395-398] — Presigned URL security summary  
^[hwp2pdf-blueprint.md:400-402] — Presigned URL vs direct authentication comparison  
^[hwp2pdf-blueprint.md:446-449] — GCS V4 signing explanation  
^[hwp2pdf-blueprint.md:609-610] — Signed download URL implementation  
^[hwp2pdf-blueprint.md:895-900] — GCS service upload path with UUID

---

## Related Concepts

- [[Cloud Run Document Conversion Architecture]] — Backend architecture that generates presigned URLs
- [[Asynchronous Job Pattern for File Processing]] — Job status flow that triggers download URL generation
- [[GCS Lifecycle Policies]] — Automatic cleanup of uploaded files
- [[Vercel OIDC Authentication]] — How Vercel authenticates to GCP for URL generation
- [[HWP File Upload Constraints]] — File validation rules applied before URL generation
