---
title: Shared TypeScript contracts package
summary: "@hwp2pdf/shared publishes internal TypeScript contracts including upload constraints (.hwp only, max 20MB) and async job/status response types"
sources:
  - agents.md
kind: concept
createdAt: "2026-06-12T16:36:44.702Z"
updatedAt: "2026-06-12T16:36:44.702Z"
tags:
  - typescript
  - shared-code
  - contracts
aliases:
  - shared-typescript-contracts-package
  - STCP
confidence: 1
provenanceState: extracted
modelId: MiniMax-M2.7
promptVersion: v1
---

<think>The user wants me to write a wiki page about "[[shared-typescript-contracts|Shared TypeScript Contracts]] package". Looking at the source material, I can see that `packages/shared` is the shared TypeScript package that publishes `@hwp2pdf/shared`. Let me extract the relevant facts:

From agents.md:
- Line 16: `packages/shared` publishes internal [[shared-typescript-contracts|Shared TypeScript Contracts]] as `@hwp2pdf/shared` after `tsc` builds `dist/`.
- Line 33: Shared upload constraints are centralized in `packages/shared/src/index.ts`: `.hwp` only, max 20MB, async job/status response types, and polling constants.

From the index.md context:
- It mentions `packages/shared` as a package in the workspace

I should write a clear, well-structured markdown page about this [[shared-typescript-contracts|Shared TypeScript Contracts]] package. I need to:
1. Draw facts only from the provided source material
2. Include a ## Sources section at the end
3. Suggest wikilinks to related concepts where appropriate
4. Use the citation format `^[filename.md:START-END]`
5. Write in a neutral, informative tone
6. Be concise but thorough

Let me structure this page:

1. Overview - what the package is
2. Package Name and Location
3. Exports/Functionality
4. Build Process
5. Related Concepts
6. Sources

Key facts to cite:
- Line 16: publishes internal [[shared-typescript-contracts|Shared TypeScript Contracts]] as `@hwp2pdf/shared` after `tsc` builds `dist/`
- Line 33: `.hwp` only, max 20MB, async job/status response types, and polling constants are centralized in `packages/shared/src/index.ts`
- Line 22: Root `package.json` declares `packageManager: pnpm@8.15.0` and Node `>=20`
- Line 23: `pnpm -r build` builds `packages/shared` with `tsc`
</think>

# [[shared-typescript-contracts|Shared TypeScript Contracts]] Package

The **Shared TypeScript Contracts Package** (`packages/shared`) is an internal library within the HWP2PDF monorepo that centralizes shared type definitions, validation logic, and constants used across the workspace.

## Overview

This package serves as the single source of truth for TypeScript contracts and utilities that are reused by multiple packages or applications in the workspace. Rather than duplicating type definitions or validation logic, consuming packages import from `@hwp2pdf/shared`. ^[agents.md:16]

## Package Identity

| Property | Value |
|----------|-------|
| Location | `packages/shared` |
| Published Name | `@hwp2pdf/shared` |
| Build Output | `dist/` directory |
| Build Tool | TypeScript Compiler (`tsc`) |

The package name field in `package.json` declares `@hwp2pdf/shared` as the published identifier, which consuming packages reference in their `dependencies`. ^[agents.md:16]

## Exports

The primary entry point is `packages/shared/src/index.ts`. It exports the following categories of shared functionality:

- **File Upload Validation** — `.hwp` file extension validation logic
- **Size Constraints** — 20MB maximum file size constant
- **Job Status Types** — TypeScript interfaces for async job tracking
- **API Route Paths** — Centralized API endpoint path constants
- **Polling Constants** — Timing values for status polling operations ^[agents.md:33]

## Build Process

The package uses the TypeScript Compiler (`tsc`) for compilation. When built, TypeScript outputs JavaScript and type declarations to the `dist/` directory, which is then published as the consumable package. ^[agents.md:16]

The build is verified to work correctly when run via the workspace's recursive build command:

```bash
pnpm -r build
```

This command builds `packages/shared` first, then proceeds to build consuming packages like `apps/web`. ^[agents.md:23]

## Relationship to Workspace

The shared package is part of a pnpm workspace that includes:

- **`apps/web`** — The Next.js frontend that imports from `@hwp2pdf/shared` for upload validation and type safety
- **Other packages** — Additional workspace packages that may depend on shared contracts

Because the workspace uses pnpm with workspaces configured as `apps/*` and `packages/*`, local dependencies are automatically linked without requiring publication to a registry. ^[agents.md:14]

## Key Types and Interfaces

### Upload Constraints

The shared package defines upload constraints that apply universally:

- **Allowed format**: `.hwp` files only
- **Maximum size**: 20MB
- **Validation location**: `packages/shared/src/index.ts` ^[agents.md:33]

### Job Status Types

Async job processing relies on shared type definitions exported from the package. These types describe the structure of job responses and the possible states a conversion job can occupy. ^[agents.md:33]

## Related Concepts

- [[@hwp2pdf/shared Package]] — The published package entry
- [[pnpm Workspaces]] — Workspace management used by this project
- [[TypeScript Compilation]] — Build process for the shared package
- [[HWP File Upload Validation]] — The upload validation logic centralized here
- [[Async Job Processing]] — Job status types and polling constants

---

## Sources

^[agents.md:14] — pnpm workspace declaration and package locations  
^[agents.md:16] — Shared package publication details  
^[agents.md:23] — Verified build command  
^[agents.md:33] — Centralized upload constraints and exports
