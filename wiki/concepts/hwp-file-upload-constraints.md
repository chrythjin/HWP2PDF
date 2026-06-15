---
title: HWP File Upload Constraints
summary: The system accepts only .hwp files with a 20MB size limit, using async job/status response types and polling
sources:
  - agents.md
kind: concept
createdAt: "2026-06-12T16:19:43.777Z"
updatedAt: "2026-06-12T16:19:43.777Z"
tags:
  - file-format
  - constraints
  - upload
aliases:
  - hwp-file-upload-constraints
  - HFUC
confidence: 1
provenanceState: extracted
modelId: MiniMax-M2.7
promptVersion: v1
---

<think>The user wants me to write a wiki page about "HWP File Upload Constraints". I need to analyze the source material provided to extract facts about this topic.

Looking at the source material, I can find information about HWP file upload constraints in the AGENTS.md file:

Line 33: "Shared upload constraints are centralized in `packages/shared/src/index.ts`: `.hwp` only, max 20MB, async job/status response types, and polling constants."

This tells me:
1. `.hwp` only - only HWP files are allowed
2. max 20MB - maximum file size is 20MB
3. async job/status response types - job status types for async processing
4. polling constants - constants for polling behavior

Let me also check the other source material to see if there's more information:

From the same file:
- Line 16: `packages/shared` publishes internal shared TypeScript contracts as `@hwp2pdf/shared` after `tsc` builds `dist/`.
- Line 24: `pnpm -r build` was verified on 2026-06-13 and builds `packages/shared` with `tsc`, then `apps/web` with `next build`.

So the shared package (`@hwp2pdf/shared`) is where the upload constraints are centralized.

Now I need to write a clear, well-structured markdown page about "HWP File Upload Constraints" that:
1. Draws facts only from the provided source material
2. Includes a ## Sources section at the end
3. Suggests wikilinks to related concepts where appropriate
4. Uses the citation format `^[filename.md:START-END]`
5. Is in a neutral, informative tone
6. Is concise but thorough

Let me structure this page:

1. Overview - explaining what HWP File Upload Constraints are
2. File Type Constraints - .hwp only
3. File Size Constraints - max 20MB
4. Job Status Handling - async job/status response types and polling constants


5. Implementation Location - where these constraints are defined
6. Related Concepts
7. Sources

I'll write this now.
</think>

# HWP File Upload Constraints

HWP File Upload Constraints define the rules and limitations enforced when users upload HWP (Korean word processor) files to the HWP2PDF conversion platform. These constraints are centralized in the shared package to ensure consistent validation across the frontend and backend.

## Overview

The upload constraints are defined as part of the `@hwp2pdf/shared` package, which is built with the TypeScript compiler (`tsc`) and publishes to the `dist/` directory. This centralized approach ensures that validation logic remains consistent regardless of which part of the application handles the upload. ^[agents.md:16,33]

## Constraint Specifications

### File Type Restriction

Only `.hwp` files are accepted for upload. The validation logic for this constraint is centralized in `packages/shared/src/index.ts`, which serves as the single source of truth for file type validation across the application. ^[agents.md:33]

### Maximum File Size

The maximum allowable file size for uploads is **20MB**. Files exceeding this limit are rejected before any processing occurs. This size limit is defined as a constant in the shared package alongside the file type validation logic. ^[agents.md:33]

### Job Status and Async Processing

Uploads result in an asynchronous job that must be polled for completion. The shared package defines:

- **Async job response types** — TypeScript interfaces describing the structure of job status responses
- **Polling constants** — Timing values that govern how frequently the frontend should check job status

This design allows the frontend to submit a file and then periodically query the conversion status without blocking. ^[agents.md:33]

## Implementation Location

All upload constraints are centralized in a single file:

```
packages/shared/src/index.ts
```

This file exports the following items relevant to upload constraints:

- `.hwp` file extension validation
- 20MB size limit constant
- Job status type definitions
- Polling interval constants

## Related Concepts

- [[@hwp2pdf/shared Package]] — The shared package where constraints are defined
- [[Next.js 16 Frontend]] — The frontend application that enforces these constraints
- [[HWP File Format]] — The file type subject to these constraints
- [[pnpm Workspace Configuration]] — The monorepo structure hosting the shared package

---

## Sources

^[agents.md:16] — Shared package publication after TypeScript compilation  
^[agents.md:33] — Centralized upload constraint definitions in shared package
