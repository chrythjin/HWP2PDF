---
title: Next.js Frontend Application
summary: The web frontend lives in apps/web using Next.js 16.2.9, with source under src/app and src/components
sources:
  - agents.md
kind: concept
createdAt: "2026-06-12T16:19:37.542Z"
updatedAt: "2026-06-12T16:19:37.542Z"
tags:
  - frontend
  - react
  - nextjs
aliases:
  - nextjs-frontend-application
  - NFA
confidence: 1
provenanceState: extracted
modelId: MiniMax-M2.7
promptVersion: v1
---

<think>The user wants me to write a wiki page about "Next.js Frontend Application". Based on the source material provided, I need to write a clear, well-structured markdown page.

Let me analyze the source material:

From `20260613-004620-llm-wiki-init.md`:
- Line 20: pnpm workspace with `apps/*` and `packages/*`
- Line 21: Root `package.json` declares pnpm@8.15.0 and Node >=20
- Line 22: `apps/web` is the Next.js frontend package named `web`, using Next.js 16.2.9
- Line 23: `packages/shared` publishes as `@hwp2pdf/shared`, builds with `tsc`
- Line 24: `packages/shared/src/index.ts` centralizes `.hwp` upload validation, 20MB max size, job status types, API routes, and polling constants
- Line 28-29: `pnpm -r build` builds all packages

From `agents.md`:
- Line 14: pnpm workspace, packages under `apps/*` and `packages/*`
- Line 15: `apps/web` is the Next.js frontend package named `web`
- Line 16: `packages/shared` publishes as `@hwp2pdf/shared` after `tsc` builds `dist/`
- Line 17: No root README; `apps/web/README.md` is still the default Create Next App README
- Line 18: Product/architecture docs in `docs/superpowers/specs/HWP2PDF-Blueprint.md` and `docs/superpowers/specs/HWP2PDF-Plan-v1.md`
- Line 22: pnpm, not npm. Root `package.json` declares `packageManager: pnpm@8.15.0` and Node `>=20`
- Line 23: `pnpm -r build` was verified on 2026-06-13 and builds `packages/shared` with `tsc`, then `apps/web` with `next build`


- Line 28: Next.js 16.2.9 installed docs under `node_modules/next/dist/docs/`
- Line 32: Frontend source under `apps/web/src/app` and `apps/web/src/components`; imports may use `@/*` alias from `apps/web/tsconfig.json`
- Line 33: Shared upload constraints centralized in `packages/shared/src/index.ts`: `.hwp` only, max 20MB, async job/status response types, and polling constants
- Line 34: Do not assume [[cloud-run-conversion-backend|Cloud Run conversion backend]] is present

The frontend lives in `apps/web/` with source code in `apps/web/src/app` and `apps/web/src/components`, using the `@/*` import alias. I can rely on shared utilities from `packages/shared/src/index.ts` for file validation (`.hwp` only, 20MB limit), job status tracking, and polling logic. The build process chains `tsc` for the shared package followed by `next build` for the frontend, and I shouldn't assume the backend conversion service is available in this workspace.
</think>

# Next.js Frontend Application

The Next.js Frontend Application is the primary user-facing component of the HWP2PDF platform, located at `apps/web/`. It provides the interface for uploading `.hwp` files, initiating conversion jobs, and monitoring their status. ^[20260613-004620-llm-wiki-init.md:22]

## Overview

The frontend package is named `web` within the pnpm workspace structure. It is built on Next.js 16.2.9 and serves as the client application that communicates with backend conversion services. The application consumes shared utilities from the `@hwp2pdf/shared` package for common validation, types, and API route definitions. ^[20260613-004620-llm-wiki-init.md:22-24]

## Technical Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 16.2.9 |
| Language | TypeScript |
| Package Manager | pnpm 8.15.0 |
| Node Requirement | >= 20 |
| Source Location | `apps/web/src/app` and `apps/web/src/components` |

The application uses the `@/*` import alias configured in `apps/web/tsconfig.json`, which simplifies imports for components and modules within the source tree. ^[agents.md:32]

## Build Process

The build process follows a specific sequence when running `pnpm -r build` across the workspace:

1. The shared package (`packages/shared`) is built first using `tsc`, which compiles TypeScript to `dist/`
2. The frontend application (`apps/web`) is then built using `next build`

This ordering ensures shared type definitions and utilities are available before the frontend compiles. The build was verified working as of 2026-06-13. ^[agents.md:23]

## Shared Integration

The frontend depends on `@hwp2pdf/shared` for several core functionalities:

- **File Validation** — `.hwp` file type enforcement and 20MB maximum size limit
- **Job Status Types** — TypeScript interfaces for async job status responses
- **Polling Constants** — Timing configuration for status checking operations
- **API Routes** — Centralized route path constants for backend communication

These shared resources are centralized in `packages/shared/src/index.ts` to avoid duplication and ensure consistency across packages. ^[agents.md:33]

## Development Notes

When developing or modifying the frontend:

- Use pnpm instead of npm — the root `package.json` enforces `pnpm@8.15.0` ^[agents.md:22]
- Consult Next.js 16.2.9 documentation under `node_modules/next/dist/docs/` for framework-specific API changes ^[agents.md:28]
- Do not assume the [[cloud-run-conversion-backend|Cloud Run conversion backend]] is present in the current workspace — verify before using `dev:api` or `build:api` scripts ^[agents.md:34]
- The current `apps/web/README.md` is the default Create Next App README — a custom project README may be added later ^[agents.md:17]

## Architecture Documentation

Additional architecture and product specifications are available in:

- `docs/superpowers/specs/HWP2PDF-Blueprint.md`
- `docs/superpowers/specs/HWP2PDF-Plan-v1.md`

These documents contain the authoritative source for product decisions and architectural patterns. ^[agents.md:18]

## Related Concepts

- [[pnpm Workspace Configuration]] — monorepo structure and workspace management
- [[@hwp2pdf/shared Package]] — shared utilities consumed by the frontend
- [[Next.js 16]] — the framework version in use
- [[HWP File Format]] — the file type handled by the conversion platform
- [[TypeScript Configuration]] — type safety across the application

---

## Sources

^[20260613-004620-llm-wiki-init.md:22-24] — Frontend package definition and shared integration  
^[agents.md:14-17] — Project structure and documentation status  
^[agents.md:22-23] — Verified build process and package manager requirements  
^[agents.md:28] — Next.js version and documentation reference  
^[agents.md:32-34] — Source location, shared utilities, and backend assumptions
