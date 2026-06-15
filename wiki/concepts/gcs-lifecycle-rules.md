---
title: GCS Lifecycle Rules
summary: Storage bucket policies that automatically delete temporary files after a specified age, ensuring data cleanup without application logic
sources:
  - hwp2pdf-blueprint.md
kind: concept
createdAt: "2026-06-12T16:37:44.525Z"
updatedAt: "2026-06-12T16:37:44.525Z"
tags:
  - gcp
  - cloud-storage
  - security
aliases:
  - gcs-lifecycle-rules
  - GLR
confidence: 0.92
provenanceState: extracted
modelId: MiniMax-M2.7
promptVersion: v1
---

<think>The user wants me to write a wiki page about "GCS Lifecycle Rules" based on the provided source material. Let me analyze what information is available in the source material about GCS Lifecycle Rules.

From the hwp2pdf-blueprint.md source, I can find relevant information:

1. Lines 307-311: GCS Lifecycle rules information
   - `age` condition + `Delete` action, or `AbortIncompleteMultipartUpload` (easy to miss, causes cost leaks)
   - `SetStorageClass` is Nearline(30일)/Coldline(90일)/Archive(365일) minimum storage → early deletion still incurs minimum fees
   - Recommended pattern: `matchesPrefix: ["uploads/tmp/"]` + `age: 1`

2. Lines 1003-1025: GCS Auto-Cleanup design
   - Temporary files should be kept for 30 minutes, then auto-deleted
   - Actual deletion may be slightly delayed due to GCS Lifecycle evaluation cycle
   - JSON configuration example with rules for `temp/original/` and `temp/result/` prefixes
   - `AbortIncompleteMultipartUpload` condition

3. Line 1004-1005: Mentions "임시 파일은 30분 보존 정책을 기준으로 자동 삭제되며, 실제 삭제 시점은 GCS Lifecycle 평가 주기에 따라 약간 지연될 수 있다."

4. Line 74: Mentions security requirement about auto-deletion of files

5. Line 24: Mentions that deletion is guaranteed by "스토리지 정책 자체로 보장" (storage policy itself)

6. Line 212: `bucket-lifecycle.json` in infrastructure/gcp/

7. Line 377: Checklist item mentions "버킷 라이프사이클 JSON 명세 작성" (both include `AbortIncompleteMultipartUpload`)


Now I have enough information to construct a comprehensive wiki page covering the lifecycle rules, auto-cleanup mechanisms, and security considerations for GCS bucket management in this project.
</think>

# GCS Lifecycle Rules

**GCS Lifecycle Rules** are bucket-level policies in Google Cloud Storage that automatically manage object storage classes, deletion timing, and cleanup of incomplete uploads based on age or prefix conditions. In the HWP2PDF service, lifecycle rules enforce automatic deletion of temporary files to meet the security requirement that uploaded files are deleted after a defined retention period without relying on application logic.

## Overview

GCS Lifecycle rules are evaluated asynchronously (approximately once per day), meaning actual deletion may be slightly delayed beyond the configured age threshold. Despite this delay, using storage-level lifecycle policies is preferred over application-level cleanup because:

- **Policy enforcement is guaranteed** — deletion happens even if application crashes
- **No additional code required** — the storage system handles cleanup automatically
- **Cost control** — prevents orphaned objects from accumulating charges

^[hwp2pdf-blueprint.md:307-311]

## Lifecycle Rule Actions

GCS supports three primary lifecycle actions:

| Action | Description |
|--------|-------------|
| `Delete` | Permanently deletes the object |
| `SetStorageClass` | Transitions object to a different storage class (Nearline, Coldline, Archive) |
| `AbortIncompleteMultipartUpload` | Cancels incomplete multipart uploads that are wasting storage |

^[hwp2pdf-blueprint.md:309-310]

## Rule Conditions

Objects are evaluated against conditions to determine when actions should apply:

| Condition | Description |
|-----------|-------------|
| `age` | Number of days since object creation |
| `createdBefore` | Date threshold for object creation |
| `isLive` | Matches objects that match the current storage class |
| `matchesPrefix` | Object name prefix filter (e.g., `temp/original/`) |
| `matchesSuffix` | Object name suffix filter |
| `numberOfNewerVersions` | For versioned buckets, how many newer versions to preserve |

^[hwp2pdf-blueprint.md:311]

## HWP2PDF Lifecycle Configuration

The HWP2PDF service uses a lifecycle policy that targets temporary upload and result directories. The configuration is stored at `infrastructure/gcp/bucket-lifecycle.json`:

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
    },
    {
      "action": { "type": "AbortIncompleteMultipartUpload" },
      "condition": { "age": 1 }
    }
  ]
}
```

^[hwp2pdf-blueprint.md:1007-1025]

### Rule Breakdown

| Rule | Target | Action | Condition |
|------|--------|--------|-----------|
| 1 | Original HWP files | Delete | Age ≥ 1 day, prefix `temp/original/` |
| 2 | Converted PDF files | Delete | Age ≥ 1 day, prefix `temp/result/` |
| 3 | Incomplete uploads | Abort | Age ≥ 1 day (any prefix) |

^[hwp2pdf-blueprint.md:1012-1022]

## Important Considerations

### AbortIncompleteMultipartUpload

This rule is **easy to overlook** but critical for cost control. When file uploads fail or are interrupted mid-transfer, GCS may create incomplete multipart upload parts that continue to incur storage charges. Adding this rule prevents cost leakage from abandoned uploads. ^[hwp2pdf-blueprint.md:310]

### SetStorageClass and Minimum Storage Duration

When using `SetStorageClass` to transition objects to Nearline (30-day minimum), Coldline (90-day minimum), or Archive (365-day minimum) storage classes, **minimum storage duration charges still apply even if objects are deleted early**. For temporary files with short TTLs, avoid using storage class transitions. ^[hwp2pdf-blueprint.md:310-311]

### Prefix Matching

Using `matchesPrefix` allows targeting specific subdirectories while preserving other bucket contents. In the HWP2PDF design, separate prefixes for original files (`temp/original/`) and result files (`temp/result/`) enable independent lifecycle policies if needed. ^[hwp2pdf-blueprint.md:311]

## Relationship to Security

Lifecycle rules are a foundational security control in the HWP2PDF architecture. The service requirement states that uploaded files must be automatically deleted after a retention period. Rather than implementing deletion logic in application code (which could fail or be bypassed), the lifecycle policy ensures deletion happens at the storage layer regardless of application state. ^[hwp2pdf-blueprint.md:23-24]

---

## Sources

^[hwp2pdf-blueprint.md:307-311] — Lifecycle rule types, conditions, and prefix matching patterns  
^[hwp2pdf-blueprint.md:1003-1025] — HWP2PDF lifecycle configuration JSON and auto-cleanup design  

---

## Related Concepts

- [[GCS Bucket Structure]] — The staging/output directory organization  
- [[Temporary File Security]] — Why automatic deletion is required  
- [[Upload Constraints]] — File validation before storage  
- [[Cloud Run Backend]] — The converter that produces files subject to lifecycle rules  
- [[Google Cloud Storage]] — The underlying storage service
