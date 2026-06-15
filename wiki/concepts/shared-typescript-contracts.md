---
title: Shared TypeScript Contracts
summary: packages/shared publishes @hwp2pdf/shared containing centralized upload constraints (.hwp only, max 20MB) and async job/status types
sources:
  - agents.md
kind: concept
createdAt: "2026-06-12T16:19:34.695Z"
updatedAt: "2026-06-12T16:19:34.695Z"
tags:
  - typescript
  - shared-code
  - contracts
aliases:
  - shared-typescript-contracts
  - STC
confidence: 1
provenanceState: extracted
modelId: MiniMax-M2.7
promptVersion: v1
---

<think>The user wants me to write a wiki page about "Shared TypeScript Contracts" based on the provided source material. Let me analyze what information I have:

From the source material (AGENTS.md):
- Line 16: `packages/shared` publishes internal shared TypeScript contracts as `@hwp2pdf/shared` after `tsc` builds `dist/`
- Line 33: Shared upload constraints are centralized in `packages/shared/src/index.ts`: `.hwp` only, max 20MB, async job/status response types, and polling constants

From the other sources:
- `packages/shared/package.json` defines `@hwp2pdf/shared` and builds with `tsc`
- `packages/shared/src/index.ts` centralizes `.hwp` upload validation, 20MB max size, job status types, API routes, and polling constants

So "Shared TypeScript Contracts" refers to the shared package at `packages/shared` which provides TypeScript types, interfaces, and constants used across the monorepo.

Let me write a clear, well-structured markdown page about this concept. I should:
1. Explain what it is
2. List the specific contracts it provides
3. Include source citations
4. Suggest wikilinks to related concepts
5. Include a Sources section at the end
</think>

# Shared TypeScript Contracts

**Shared TypeScript Contracts** refers to the centralized type definitions, interfaces, and constants exported from the `@hwp2pdf/shared` package. This package lives at `packages/shared` within the pnpm workspace and provides the canonical TypeScript definitions used across the HWP2PDF platform's frontend and backend components. ^[agents.md:16, agents.md:33]

## Overview

Rather than duplicating type definitions across packages, the shared package publishes internal contracts as `@hwp2pdf/shared`. After `tsc` compiles the source, the output is published to `dist/`, making these contracts available for import by other packages in the workspace. ^[agents.md:16]

The shared package serves as the single source of truth for:

- File validation rules
- Size constraints
- Job status type definitions
- API route paths
- Polling configuration values

## Contracts Provided

The primary entry point at `packages/shared/src/index.ts` exports the following contract categories: ^[agents.md:33]

### File Validation

- **`.hwp` file type restriction** — Only HWP (Korean word processor) files are accepted for upload
- **20MB maximum file size** — Enforced as a hard limit on upload payload

### Job Status Types

- **Async job response types** — TypeScript interfaces defining the shape of job submission responses
- **Status response types** — Definitions for polling job state transitions

### API Constants

- **API route paths** — Centralized path constants for backend endpoints
- **Polling constants** — Timing values that govern how frequently the frontend checks job status

## Build Configuration

The shared package uses the TypeScript Compiler (`tsc`) as its build tool, defined in `package.json`. The build process compiles `src/index.ts` and outputs type definitions to `dist/`. All workspace packages can then import from `@hwp2pdf/shared` with full type safety. ^[agents.md:16]

## Related Concepts

- [[@hwp2pdf/shared Package]] — The npm package structure and build configuration
- [[TypeScript Configuration]] — How `tsc` compiles and outputs type definitions
- [[pnpm Workspace Configuration]] — The monorepo structure hosting the shared package
- [[Job Status Types]] — Detailed status type definitions for async operations
- [[API Routes]] — Backend endpoint constants shared across the platform

---

## Sources

- [AGENTS.md](AGENTS.md) — Project-specific guidance (lines 16, 33)
