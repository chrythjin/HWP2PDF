---
title: "@hwp2pdf/shared Package"
summary: Shared TypeScript package with .hwp file upload validation (20MB max), job status types, API routes, and polling constants
sources:
  - 20260613-004620-llm-wiki-init.md
  - index.md
kind: concept
createdAt: "2026-06-12T16:19:16.270Z"
updatedAt: "2026-06-12T16:19:16.270Z"
tags:
  - typescript
  - shared-library
  - api
aliases:
  - hwp2pdfshared-package
confidence: 0.85
provenanceState: merged
modelId: MiniMax-M2.7
promptVersion: v1
---

<think>
The user wants me to write a wiki page about the `@hwp2pdf/shared` package based on the provided source material. Let me analyze what information I have:

From `20260613-004620-llm-wiki-init.md`:
- `packages/shared/package.json` defines `@hwp2pdf/shared` and builds with `tsc`
- `packages/shared/src/index.ts` centralizes `.hwp` upload validation, 20MB max size, job status types, API routes, and polling constants

From `index.md`:
- Shared package: `packages/shared`, package name `@hwp2pdf/shared`

This is fairly limited information, but I have some key facts to work with. I should write a clear, well-structured markdown page covering:
1. Overview of the package
2. What it provides (the centralized exports)
3. Build information
4. Related concepts (I can suggest wikilinks to related concepts)

Let me structure this properly with the citation markers.
</think>

# @hwp2pdf/shared Package

The `@hwp2pdf/shared` package is a shared library within the HWP2PDF pnpm workspace, located at `packages/shared`. It provides centralized utilities, types, and constants used across the application's frontend and other packages. ^[20260613-004620-llm-wiki-init.md:22-24]

## Overview

This package serves as the common foundation for shared functionality in the [[hwp2pdf-project|HWP2PDF Project]]. Rather than duplicating code across packages, common types and utilities are exported from this centralized location. ^[20260613-004620-llm-wiki-init.md:22-24]

## Exports and Functionality

The primary entry point for this package is located at `packages/shared/src/index.ts`. It exports several categories of shared functionality:

- **`.hwp` file upload validation** — Utilities for validating HWP (Korean word processor) file uploads
- **20MB maximum file size** — A size limit constant for upload validation
- **Job status types** — TypeScript type definitions for tracking conversion job states
- **API routes** — Path constants for backend API endpoints
- **Polling constants** — Configuration values for job status polling intervals ^[20260613-004620-llm-wiki-init.md:24]

## Build Configuration

The package uses TypeScript Compiler (`tsc`) for its build process, as defined in its `package.json`. The build was verified to pass successfully as part of the workspace's recursive build command (`pnpm -r build`). ^[20260613-004620-llm-wiki-init.md:23,29]

## Package Relationships

The shared package is part of a pnpm monorepo workspace structure that includes:

- **`apps/web`** — The Next.js frontend application
- **Backend services** — Conversion services documented in project specs (though no `apps/api` package was verified at the time of documentation) ^[index.md:22-24]

## Commands

| Command | Description |
|---------|-------------|
| `pnpm --filter @hwp2pdf/shared build` | Build the shared package directly |
| `pnpm -r build` | Build all workspace packages including shared |

---

## Sources

- [Session: llm-wiki initialization and repository guide](docs/sessions/20260613_004620_llm-wiki-init.md)
- [HWP2PDF llm-wiki Index](docs/INDEX.md)
