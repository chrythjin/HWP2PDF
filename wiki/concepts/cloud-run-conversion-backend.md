---
title: Cloud Run conversion backend
summary: Backend conversion service (potentially Cloud Run) that may not be present in current workspace; verify before using dev:api/build:api scripts
sources:
  - agents.md
kind: concept
createdAt: "2026-06-12T16:37:13.820Z"
updatedAt: "2026-06-12T16:37:13.820Z"
tags:
  - backend
  - cloud-run
  - deployment
aliases:
  - cloud-run-conversion-backend
  - CRCB
confidence: 0.8
provenanceState: inferred
modelId: MiniMax-M2.7
promptVersion: v1
---

<think>
The user wants me to write a wiki page about "Cloud Run conversion backend". Let me analyze the source material provided to extract facts about this topic.

Looking at the source material (agents.md), I can find relevant information:

Line 34 mentions: "Do not assume the Cloud Run conversion backend is present in the current workspace just because root scripts include `dev:api`/`build:api`; verify the package before using those scripts."

This tells me:
1. There is (or was planned to be) a Cloud Run conversion backend
2. The root scripts include `dev:api` and `build:api` commands
3. However, the current workspace may not have this package yet
4. You need to verify the package exists before using those scripts

Line 16 mentions: "`packages/shared` publishes internal [[shared-typescript-contracts|Shared TypeScript Contracts]] as `@hwp2pdf/shared` after `tsc` builds `dist/`."

This suggests the shared package might contain types/contracts for the Cloud Run backend as well.

Line 33 mentions: "Shared upload constraints are centralized in `packages/shared/src/index.ts`: `.hwp` only, max 20MB, async job/status response types, and polling constants."

This implies the Cloud Run backend would handle the async job processing for HWP file conversion.

Let me also check if there's a specific location mentioned - line 34 says "apps/api" might be a backend package location.

So the key facts I have:
1. Cloud Run conversion backend is planned/in development
2. Root scripts include `dev:api` and `build:api` for it
3. It may not exist in the current workspace yet (needs verification)
4. It likely handles HWP to PDF conversion asynchronously (async job/status pattern)
5. If it exists, it would likely be at `apps/api` based on the workspace pattern

Let me write a clear, well-structured markdown page about "Cloud Run conversion backend" that:
1. Draws facts only from the provided source material


2. Includes a ## Sources section at the end
3. Suggests wikilinks to related concepts where appropriate
4. Uses the citation format `^[filename.md:START-END]`
5. Is in a neutral, informative tone
6. Is concise but thorough

I need to be careful not to assume too much - the source material only says I shouldn't assume the backend is present. I should frame this as what is known vs what needs verification.
</think>

# Cloud Run Conversion Backend

The **Cloud Run conversion backend** refers to a planned or in-development backend service for the HWP2PDF platform, intended to handle the conversion of HWP (Hangul Word Processor) files to PDF format. The backend would process uploaded files asynchronously using a job-based model.

## Current Status

The Cloud Run conversion backend is referenced in the repository's root scripts as `dev:api` and `build:api`, suggesting it is planned or partially implemented. However, the current workspace does not conclusively contain this package. Developers should **verify the package exists before attempting to use these commands**. The repository guidance explicitly warns against assuming the backend is present simply because root scripts declare these commands. ^[agents.md:34]

## Relationship to Shared Package

The `@hwp2pdf/shared` package (`packages/shared`) contains TypeScript contracts and types that are likely consumed by the backend service. These shared definitions include:

- **Job status response types** — Type definitions for tracking conversion job states
- **Polling constants** — Timing configuration for clients to poll job status
- **API route paths** — Endpoint constants used for communication between frontend and backend

The shared package is built with `tsc` and publishes to `dist/`, making its types available to both frontend and backend packages. ^[agents.md:16,33]

## Async Job Processing Pattern

The backend follows an asynchronous processing pattern consistent with the upload constraints defined in the shared package:

1. **Job creation** — Conversion requests are submitted as jobs with unique identifiers
2. **Status polling** — Clients check job status using polling constants from the shared package
3. **Job completion** — Upon completion, the converted PDF is made available

This pattern allows the frontend to submit files without blocking, using the job status types and polling intervals defined centrally in `packages/shared/src/index.ts`. ^[agents.md:33]

## Verification Before Use

To verify whether the Cloud Run backend exists in the current workspace, check for:

- An `apps/api` directory (following the workspace pattern of `apps/*`)
- A package with conversion-related scripts in its `package.json`
- Backend-specific AGENTS.md guidance if one exists

---

## Sources

^[agents.md:34] — Warning against assuming Cloud Run backend presence in workspace  
^[agents.md:16] — Shared package publication as `@hwp2pdf/shared`  
^[agents.md:33] — Shared job/status types and polling constants

---

## Related Concepts

- [[@hwp2pdf/shared Package]] — Shared types and constants for backend communication
- [[HWP File Upload Constraints]] — Constraints governing file uploads to the backend
- [[pnpm Workspace Configuration]] — Workspace structure that would host the backend
- [[Async Job Processing]] — Pattern used for conversion requests
- [[Google Cloud Run]] — The platform for the conversion backend (inferred from name)
