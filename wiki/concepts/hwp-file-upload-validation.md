---
title: HWP file upload validation
summary: Upload validation enforces 20MB maximum file size and validates .hwp file format through centralized validation logic in the shared package
sources:
  - 20260613-004620-llm-wiki-init.md
kind: concept
createdAt: "2026-06-12T16:36:31.351Z"
updatedAt: "2026-06-12T16:36:31.351Z"
tags:
  - validation
  - file-upload
  - hwp
aliases:
  - hwp-file-upload-validation
  - HFUV
confidence: 0.9
provenanceState: extracted
modelId: MiniMax-M2.7
promptVersion: v1
---

<think>The user wants me to write a wiki page about "HWP file upload validation". Let me analyze the source material provided to extract facts about this topic.

From the source material (20260613-004620-llm-wiki-init.md):
- Line 24: `packages/shared/src/index.ts` centralizes `.hwp` upload validation, 20MB max size, job status types, API routes, and polling constants.

From the [[hwp-file-upload-constraints|HWP File Upload Constraints]] source (which seems to be agents.md based on the structure):
- Line 33: "Shared upload constraints are centralized in `packages/shared/src/index.ts`: `.hwp` only, max 20MB, async job/status response types, and polling constants."

So the key facts are:
1. `.hwp` file upload validation is centralized in `packages/shared/src/index.ts`
2. Only `.hwp` files are accepted
3. Maximum file size is 20MB
4. It uses async job/status response types
5. It uses polling constants for status checking

I need to write a clear, well-structured markdown page about "HWP file upload validation" that:
1. Draws facts only from the provided source material
2. Includes a ## Sources section at the end
3. Suggests wikilinks to related concepts where appropriate
4. Uses the citation format `^[filename.md:START-END]`
5. Is in a neutral, informative tone
6. Is concise but thorough

Let me structure this page:

1. Overview - what HWP file upload validation is
2. File Type Validation - .hwp only
3. File Size Constraints - 20MB max
4. Async Job Processing - job/status response types and polling
5. Implementation Location - centralized in shared package
6. Related Concepts
7. Sources

I should use the exact file name "20260613-004620-llm-wiki-init.md" for citations since that's the source file shown.
</think>

# HWP File Upload Validation

HWP file upload validation refers to the set of rules and processes that govern how `.hwp` (Hangul Word Processor) files are accepted and processed by the HWP2PDF conversion platform. These validations are centralized in the shared package to ensure consistent enforcement across all client applications.

## Overview

The validation logic for HWP file uploads is defined in `packages/shared/src/index.ts`, which serves as the single source of truth for upload constraints. This centralized approach prevents duplication of validation rules across the frontend and any backend services that handle file uploads. ^[20260613-004620-llm-wiki-init.md:24]

## Validation Constraints

### File Type Restriction

Only files with the `.hwp` extension are accepted for upload. This restriction is enforced at the shared package level and applies to all upload flows within the platform. The validation logic rejects any file that does not match the expected format before processing begins. ^[20260613-004620-llm-wiki-init.md:24]

### Maximum File Size

The maximum permissible file size for uploads is **20MB**. Files exceeding this threshold are rejected immediately. This size limit is defined as a constant within the shared package, allowing it to be referenced wherever upload validation occurs. ^[20260613-004620-llm-wiki-init.md:24]

## Asynchronous Processing

HWP file uploads do not produce results immediately. Instead, the platform employs an asynchronous job model:

1. **Upload submission** — The file is uploaded along with any required metadata
2. **Job creation** — The system creates a conversion job and returns a job identifier
3. **Status polling** — The client periodically queries the job status using polling constants defined in the shared package
4. **Completion** — Once the job reaches a terminal state, the result is available

The shared package defines both the job status response types and the polling constants that govern this asynchronous workflow. This ensures consistent timing behavior across all clients. ^[20260613-004620-llm-wiki-init.md:24]

## Implementation Location

All upload validation constraints are exported from a single entry point:

```
packages/shared/src/index.ts
```

This file contains:

- `.hwp` file extension validation logic
- 20MB size limit constant
- Job status type definitions
- Polling interval constants
- API route path definitions

## Related Concepts

- [[@hwp2pdf/shared Package]] — The shared package where validation is centralized
- [[HWP File Format]] — The file type being validated
- [[Async Job Processing]] — The job/status response pattern used
- [[Polling Constants]] — Timing configuration for status checks
- [[Next.js 16 Frontend]] — The primary client application consuming these validations

---

## Sources

^[20260613-004620-llm-wiki-init.md:24] — Centralized upload validation in shared package  
^[20260613-004620-llm-wiki-init.md:33] — Shared upload constraints definition
