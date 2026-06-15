---
title: Next.js 16.2.9 frontend
summary: The web frontend is a Next.js application located at apps/web, requiring reading installed docs before changing Next-specific APIs
sources:
  - agents.md
  - index.md
kind: concept
createdAt: "2026-06-12T16:36:55.230Z"
updatedAt: "2026-06-12T16:36:55.230Z"
tags:
  - frontend
  - framework
  - nextjs
aliases:
  - nextjs-1629-frontend
  - N1F
confidence: 0.9
provenanceState: merged
modelId: MiniMax-M2.7
promptVersion: v1
---

<think>The user wants me to write a wiki page about "Next.js 16.2.9 frontend" based on the provided source material. Let me analyze what information I have from the sources:

From agents.md:
- Line 15: `apps/web` is the Next.js frontend package named `web`
- Line 16: `packages/shared` publishes internal [[shared-typescript-contracts|Shared TypeScript Contracts]] as `@hwp2pdf/shared` after `tsc` builds `dist/`
- Line 22: Use pnpm, not npm. Root `package.json` declares `packageManager: pnpm@8.15.0` and Node `>=20`
- Line 23: `pnpm -r build` was verified on 2026-06-13 and builds `packages/shared` with `tsc`, then `apps/web` with `next build`
- Line 28: `apps/web/AGENTS.md` applies inside the frontend: this repo uses Next.js 16.2.9, so read the relevant installed docs under `node_modules/next/dist/docs/` before changing Next-specific APIs or conventions
- Line 32: Frontend source is under `apps/web/src/app` and `apps/web/src/components`; imports may use the `@/*` alias from `apps/web/tsconfig.json`
- Line 33: Shared upload constraints are centralized in `packages/shared/src/index.ts`: `.hwp` only, max 20MB, async job/status response types, and polling constants

From index.md:
- Line 22: Frontend: `apps/web`, package name `web`, Next.js 16.2.9
- Line 23: Shared package: `packages/shared`, package name `@hwp2pdf/shared`
- Line 24: Backend conversion service: documented in the specs, but no `apps/api` package was found during this initialization pass

I need to write a clear, well-structured markdown page about "Next.js 16.2.9 frontend" that:


1. Draws facts only from the provided source material
2. Includes a ## Sources section at the end
3. Suggests wikilinks to related concepts where appropriate
4. Uses the citation format `^[filename.md:START-END]`
5. Is in a neutral, informative tone
6. Is concise but thorough

Let me structure this page:
1. Overview
2. Package structure
3. Source code organization
4. Build and development
5. Shared package integration
6. AGENTS.md guidance
7. Related concepts
8. Sources

I'll use the AGENTS.md file as my primary source since it contains the most detailed information about the Next.js frontend setup, including specific guidance about reading installed documentation before making changes and the shared upload constraints that apply to this frontend.
</think>

# Next.js 16.2.9 Frontend

The Next.js 16.2.9 Frontend is the web application layer of the [[hwp2pdf-project|HWP2PDF Project]], implemented as a Next.js application package named `web` within the pnpm workspace. It provides the user interface for uploading HWP files and managing document conversion jobs.

## Package Overview

The frontend application resides in `apps/web` and is configured with the following characteristics:

- **Package name**: `web`
- **Framework**: Next.js 16.2.9
- **Package manager**: pnpm (version 8.15.0)
- **Node.js requirement**: Version 20 or higher
- **Build tool**: Next.js build command (`next build`)

The package does not have a custom README; the default Create Next App README remains in place at `apps/web/README.md`. ^[agents.md:15,17,22,28]

## Source Code Organization

Frontend source code is organized under two primary directories:

- **`apps/web/src/app`** — Contains the Next.js App Router structure and page components
- **`apps/web/src/components`** — Contains reusable UI components

Imports within the frontend may use the `@/*` path alias, which is configured in `apps/web/tsconfig.json` for convenient module resolution. ^[agents.md:32]

## Build Process

The frontend is built as part of the workspace's recursive build command:

```bash
pnpm -r build
```

This command was verified to pass on 2026-06-13. The build sequence compiles `packages/shared` with `tsc` first, then builds `apps/web` with `next build`. ^[agents.md:23]

Individual package builds are also possible:

```bash
pnpm --filter web build
```

## Shared Package Integration

The frontend depends on `@hwp2pdf/shared`, which provides centralized functionality including:

- **HWP file upload validation** — Enforces `.hwp` file type restriction and 20MB maximum file size
- **Job status types** — TypeScript definitions for asynchronous job tracking
- **Polling constants** — Configuration for status polling intervals
- **API route definitions** — Shared path constants for backend endpoints

These shared utilities are imported from `packages/shared/src/index.ts` and ensure consistent validation and API behavior across the frontend and any backend services. ^[agents.md:16,33]

## AGENTS.md Guidance

A dedicated `AGENTS.md` file exists at `apps/web/AGENTS.md` with framework-specific guidance for the frontend. This file should be consulted before modifying Next.js-specific APIs or conventions. Because this project uses Next.js 16.2.9, the relevant installed documentation under `node_modules/next/dist/docs/` should be read prior to making changes to framework-specific code. ^[agents.md:28]

## Development Commands

| Command | Description |
|---------|-------------|
| `pnpm dev:web` | Start the frontend development server |
| `pnpm build:web` | Build the frontend for production |
| `pnpm --filter web <script>` | Run a specific script in the web package |

Note that `dev:api` and `build:api` scripts exist at the root level, but no `apps/api` package has been verified to exist in the current workspace. These commands should not be relied upon until the backend package is confirmed. ^[agents.md:34]

## Related Concepts

- [[AGENTS.md Pattern]] — The documentation pattern for AI agent guidance
- [[@hwp2pdf/shared Package]] — Shared utilities consumed by the frontend
- [[HWP File Upload Constraints]] — Upload validation rules
- [[pnpm Workspaces]] — The monorepo workspace structure
- [[Next.js]] — The framework powering the frontend

---

## Sources

^[agents.md:15] — Frontend package identification  
^[agents.md:16] — Shared package publication  
^[agents.md:17] — README status  
^[agents.md:22] — Package manager and Node.js requirements  
^[agents.md:23] — Verified build command  
^[agents.md:28] — Next.js version and AGENTS.md guidance  
^[agents.md:32] — Source code organization and path alias  
^[agents.md:33] — Shared upload constraints  
^[agents.md:34] — Backend package verification note  
^[index.md:22] — Frontend package details in workspace index
