---
title: Shared package architecture
summary: The @hwp2pdf/shared package centralizes core functionality including .hwp upload validation, job status types, API routes, and polling constants, built with tsc
sources:
  - 20260613-004620-llm-wiki-init.md
kind: concept
createdAt: "2026-06-12T16:36:43.045Z"
updatedAt: "2026-06-12T16:36:43.045Z"
tags:
  - architecture
  - shared-code
  - package-design
aliases:
  - shared-package-architecture
  - SPA
confidence: 0.95
provenanceState: extracted
modelId: MiniMax-M2.7
promptVersion: v1
---

<think>The user wants me to write a wiki page about "Shared package architecture". Looking at the source material provided, I can see references to a shared package architecture in several places:

1. `packages/shared` - `@hwp2pdf/shared` - a shared TypeScript package
2. It builds with `tsc` 
3. `packages/shared/src/index.ts` centralizes `.hwp` upload validation, 20MB max size, job status types, API routes, and polling constants
4. It's part of a [[pnpm-workspace-monorepo|pnpm workspace monorepo]] structure with `apps/*` and `packages/*`
5. The root package.json and workspace configuration
6. Various mentions of the shared package being used across the frontend

From the source material, I can extract facts about:
- Package location (`packages/shared`)
- Package name (`@hwp2pdf/shared`)
- Build tool (`tsc`)
- What it contains (upload validation, file size limits, job status types, API routes, polling constants)
- Its role in the monorepo (pnpm workspaces)
- Its relationship to other packages (apps/web, frontend)

I need to write a clear, well-structured markdown page that:
1. Is about "Shared package architecture" as a concept
2. Draws facts from the source material
3. Includes wikilinks to related concepts
4. Has proper citations
5. Includes a Sources section

Let me identify the key facts:
- Location: `packages/shared`
- Package name: `@hwp2pdf/shared`
- Entry point: `packages/shared/src/index.ts`
- Build: `tsc` (TypeScript Compiler)
- Contents: `.hwp` upload validation, 20MB max size, job status types, API routes, polling constants
- Workspace: pnpm workspaces with `apps/*` and `packages/*` structure
- Purpose: Centralized utilities for the monorepo

I'll structure this as:
1. Overview


2. Package Structure
3. Key Exports
4. Build Configuration
5. Usage in the Monorepo
6. Related Concepts
7. Sources
</think>


# Shared Package Architecture

The **Shared Package Architecture** is a code organization strategy used in this monorepo to centralize reusable utilities, types, and constants in a single package that can be consumed by multiple applications. This approach reduces code duplication and ensures consistency across the codebase.

## Overview

The shared package in this repository is located at `packages/shared` and is published as `@hwp2pdf/shared`. It serves as the single source of truth for common functionality used across the frontend application and any future backend services. The package is built using the TypeScript Compiler (`tsc`) and exports its utilities through the entry point at `packages/shared/src/index.ts`. ^[20260613-004620-llm-wiki-init.md:23-24]

## Package Structure

```
packages/shared/
├── package.json          # Package definition with name @hwp2pdf/shared
├── src/
│   └── index.ts          # Main entry point with all exports
└── dist/                 # Compiled output from tsc
```

## Key Exports

The shared package centralizes the following categories of functionality:

| Category | Description |
|----------|-------------|
| **Upload Validation** | `.hwp` file type validation logic |
| **File Size Constraints** | 20MB maximum upload size constant |
| **Job Status Types** | TypeScript interfaces for async job state tracking |
| **API Routes** | Path constants for backend endpoint definitions |
| **Polling Constants** | Timing configuration for status checking operations |

This centralized approach ensures that validation rules and type definitions remain consistent regardless of which package consumes them. When a change is made to any of these constants—such as adjusting the maximum file size—all consumers automatically receive the updated value through the shared dependency. ^[20260613-004620-llm-wiki-init.md:24]

## Build Configuration

The `@hwp2pdf/shared` package uses TypeScript Compiler (`tsc`) for its build process rather than a more complex bundler. This lightweight approach is sufficient for a shared library that primarily exports TypeScript types and utility functions. The build process compiles `src/index.ts` into JavaScript and type declarations in the `dist/` directory. ^[20260613-004620-llm-wiki-init.md:23]

## Monorepo Integration

The shared package participates in the repository's pnpm workspace structure, which is configured in `pnpm-workspace.yaml` to include both `apps/*` and `packages/*` directories. This workspace configuration automatically links the shared package when installed in any workspace member. ^[20260613-004620-llm-wiki-init.md:20]

The monorepo build command `pnpm -r build` has been verified to compile the shared package successfully before building dependent applications such as `apps/web`. This ensures that the shared package is always built and up-to-date before other packages that depend on it. ^[20260613-004620-llm-wiki-init.md:29]

## Relationship to Other Packages

The shared package is designed to be consumed by:

- **`apps/web`** — The [[nextjs-frontend-application|Next.js Frontend Application]] uses the shared package for upload validation, job status types, and API route constants. Frontend developers should consult the shared package before implementing functionality that could be centralized. ^[20260613-004620-llm-wiki-init.md:22,34]

## Benefits of This Architecture

1. **Single Source of Truth** — Validation rules and type definitions are defined once and reused everywhere, preventing inconsistencies
2. **Reduced Duplication** — Common utilities are not copied across multiple packages
3. **Easier Maintenance** — Updating a constant or type in one place automatically propagates to all consumers
4. **Type Safety** — Shared TypeScript interfaces ensure consistent typing across the codebase

## Related Concepts

- [[@hwp2pdf/shared Package]] — The specific shared package implementation
- [[pnpm Workspaces]] — The workspace mechanism that enables package linking
- [[TypeScript Configuration]] — The build configuration for the shared package
- [[Monorepo Documentation]] — General monorepo patterns and practices
- [[LLM-Assisted Development]] — How AI agents interact with the shared package architecture

---

## Sources

^[20260613-004620-llm-wiki-init.md:20] — [[pnpm-workspace-configuration|pnpm Workspace Configuration]] including `apps/*` and `packages/*`  
^[20260613-004620-llm-wiki-init.md:23] — `@hwp2pdf/shared` package definition and `tsc` build  
^[20260613-004620-llm-wiki-init.md:24] — Centralized exports in `packages/shared/src/index.ts`  
^[20260613-004620-llm-wiki-init.md:29] — Build verification with `pnpm -r build`  
^[20260613-004620-llm-wiki-init.md:34] — Frontend usage and development guidance
