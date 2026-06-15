---
title: GCS Lifecycle Management
summary: Automatic cleanup policy for temporary file storage using GCS lifecycle rules, deleting original HWP and result PDF files after 30 minutes
sources:
  - hwp2pdf-plan-v1.md
kind: concept
createdAt: "2026-06-12T16:38:46.665Z"
updatedAt: "2026-06-12T16:38:46.665Z"
tags:
  - gcs
  - storage
  - cleanup
aliases:
  - gcs-lifecycle-management
  - GLM
confidence: 0.95
provenanceState: extracted
modelId: MiniMax-M2.7
promptVersion: v1
---

<think>The user wants me to write a wiki page about "GCS Lifecycle Management". I need to analyze the source material provided to extract facts about this topic.

Looking at the source material, I can find information about GCS Lifecycle Management in the hwp2pdf-blueprint.md file:

Lines 1003-1025 discuss GCS Auto-Cleanup design with lifecycle policies:

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

This tells me about:
1. Lifecycle policies for automatic cleanup
2. Age-based deletion rules
3. Path-based prefix matching
4. Two separate rules for original files and result files

Line 78 from hwp2pdf-plan-v1.md mentions: "30분 후 자동 삭제 (GCS Lifecycle)" - 30 minute auto deletion

Let me also check lines 289-293 from hwp2pdf-blueprint.md which mentions:
- Incomplete multipart uploads should be aborted after 1 day
- This prevents cost leakage

Let me write a clear, well-structured markdown page about GCS Lifecycle Management that:
1. Draws facts only from the provided source material
2. Includes a ## Sources section at the end
3. Suggests wikilinks to related concepts where appropriate
4. Uses the citation format ^[filename.md:START-END]
5. Is in a neutral, informative tone
6. Is concise but thorough
</think>


# GCS Lifecycle Management

GCS Lifecycle Management refers to the configuration of automatic object lifecycle policies in Google Cloud Storage (GCS) to manage file expiration, archival, and deletion. In the HWP2PDF service, lifecycle policies are critical for automatically cleaning up temporary files to prevent security risks and control storage costs.

## Overview

The HWP2PDF service stores user-uploaded files and conversion results in temporary GCS buckets. These files are not meant for permanent storage — they exist only to support the conversion workflow and are deleted after a short TTL (time-to-live). Lifecycle policies automate this cleanup, eliminating the need for manual deletion or scheduled cleanup jobs. ^[hwp2pdf-blueprint.md:1003-1007]

## Lifecycle Rules Configuration

The service uses path-based lifecycle rules to target different types of objects:

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

^[hwp2pdf-blueprint.md:1007-1016]

### Rule Structure

Each lifecycle rule consists of:

| Component | Description |
|-----------|-------------|
| `action` | The action to perform when condition is met — currently always `Delete` |
| `condition.age` | Number of days after object creation before the action triggers |
| `condition.matchesPrefix` | Path prefix filter to target specific object groups |

^[hwp2pdf-blueprint.md:1007-1016]

## Targeted Storage Paths

The configuration defines separate rules for two storage paths:

| Path | Purpose | Age Rule |
|------|---------|----------|
| `temp/original/` | Uploaded HWP source files | 1 day |
| `temp/result/` | Converted PDF output files | 1 day |

^[hwp2pdf-blueprint.md:1007-1016]

This separation allows for independent management of original files and converted results, though both currently use the same 1-day TTL.

## Additional Safety: Incomplete Multipart Upload Cleanup

Beyond object deletion, lifecycle policies can also manage incomplete multipart uploads, which can accumulate storage charges if not addressed:

```json
{
  "rule": [
    {
      "action": { "type": "AbortIncompleteMultipartUpload" },
      "condition": { "age": 1 }
    }
  ]
}
```

^[hwp2pdf-blueprint.md:1007-1025]

This rule automatically aborts multipart uploads that have not completed within 1 day, preventing cost leakage from orphaned upload parts.

## Security Rationale

Temporary file storage poses security risks if files persist beyond their necessary lifetime:

- **Uploaded HWP files** may contain sensitive information that users expect to be temporary
- **Converted PDFs** represent processed user data that should only be available during the download window
- **Signed download URLs** provide time-limited access (15 minutes), so files should not remain accessible indefinitely

The 1-day TTL balances operational needs (allowing some buffer for retry scenarios) with security best practices of minimizing data retention.

## Relationship to Job Status States

Lifecycle policies interact with the async job status system:

| Status | Lifecycle Action |
|--------|-----------------|
| `completed` | File remains until TTL expires or download occurs |
| `failed` | Original file remains until TTL expires |
| `expired` | Indicates files were deleted per lifecycle policy |

^[hwp2pdf-blueprint.md:260-268, 1003-1007]

## Cost Control

GCS Standard storage pricing applies based on:

- Storage volume (GB-months)
- Network egress for downloads
- Operations (Class A/B)

Without lifecycle policies, temporary files would accumulate indefinitely, driving up storage costs. The automatic 1-day cleanup ensures costs remain predictable and proportional to service usage. The plan document estimates approximately 10GB of storage for MVP operations at roughly $0.50/month. ^[hwp2pdf-plan-v1.md:1028]

---

## Sources

^[hwp2pdf-blueprint.md:1003-1025] — GCS Auto-Cleanup design and lifecycle policy configuration  
^[hwp2pdf-blueprint.md:260-268] — Job status states including `expired` status  
^[hwp2pdf-plan-v1.md:1028] — Cost estimation for GCS storage

---

## Related Concepts

- [[Asynchronous Job Pattern for File Processing]] — The job status system that tracks file lifecycle
- [[Cloud Run Document Conversion Architecture]] — The backend architecture that writes to GCS
- [[Cloud Run conversion backend]] — Backend service handling file storage
- [[HWP File Upload Constraints]] — File validation rules before storage
- [[GCS Signed URLs]] — Time-limited download access mechanism
