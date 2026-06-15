---
title: Next.js 16 frontend package
summary: The frontend is implemented as a Next.js 16.2.9 application in apps/web, with its own AGENTS.md guidance file for framework-specific development
sources:
  - 20260613-004620-llm-wiki-init.md
kind: concept
createdAt: "2026-06-12T16:36:30.176Z"
updatedAt: "2026-06-12T16:36:30.176Z"
tags:
  - frontend
  - nextjs
  - web-development
aliases:
  - nextjs-16-frontend-package
  - N1FP
confidence: 0.95
provenanceState: extracted
modelId: MiniMax-M2.7
promptVersion: v1
---

<think>The user wants me to write a wiki page about "[[nextjs-16-frontend|Next.js 16 Frontend]] package". Based on the source material provided, I can extract the following facts:

1. The Next.js frontend package is named `web` and located at `apps/web/`
2. It uses Next.js version 16.2.9
3. It's part of a pnpm workspace structure with `apps/*` and `packages/*`
4. The root `package.json` declares pnpm, Node >=20, and pnpm@8.15.0
5. `packages/shared` defines `@hwp2pdf/shared` and builds with `tsc`
6. `packages/shared/src/index.ts` centralizes `.hwp` upload validation, 20MB max size, job status types, API routes, and polling constants
7. For frontend code changes, obey `apps/web/AGENTS.md` and consult installed Next.js 16 docs

Let me write a clear, well-structured markdown page about this, citing the appropriate sources.
</think>

# [[nextjs-16-frontend|Next.js 16 Frontend]] Package

The **Next.js 16 Frontend Package** is the primary web application in the HWP2PDF platform, located at `apps/web/` within the monorepo workspace. It provides the user interface for uploading HWP files and monitoring conversion job status.

## Package Details

| Attribute | Value |
|-----------|-------|
| Package Name | `web` |
| Location | `apps/web/` |
| Framework | Next.js 16.2.9 |
| Language | TypeScript |
| Node Requirement | >= 20 |
| Package Manager | pnpm 8.15.0 |

## Architecture

The frontend is part of a pnpm workspaces monorepo that organizes code into two main directories:

- `apps/*` — Application packages (currently contains only `web`)
- `packages/*` — Shared libraries consumed by applications

The `web` package communicates with the shared package `@hwp2pdf/shared` for validation logic, type definitions, and API route constants. This separation ensures consistent behavior across the platform and reduces code duplication. ^[20260613-004620-llm-wiki-init.md:20-24]

## Shared Package Integration

The `@hwp2pdf/shared` package at `packages/shared/` provides the following utilities to the frontend:

- **`.hwp` file validation** — Ensures only valid HWP files are accepted for upload
- **20MB size limit** — Enforces maximum upload file size
- **Job status types** — TypeScript interfaces for tracking conversion job states
- **API route definitions** — Consistent path constants for backend communication
- **Polling constants** — Timing configuration for job status checks

All shared utilities are built using the TypeScript compiler (`tsc`) and exported from `packages/shared/src/index.ts`. ^[20260613-004620-llm-wiki-init.md:23-24]

## Development Guidelines

When modifying the frontend, the following guidelines apply:

1. **Consult `apps/web/AGENTS.md`** before making code changes to ensure compliance with project conventions
2. **Reference installed Next.js 16 documentation** when working with framework-specific APIs
3. **Do not assume backend capabilities** — there is no verified `apps/api` package; backend integration should only use confirmed endpoints

The workspace build command `pnpm -r build` has been verified to successfully compile both the shared package and the frontend application. ^[20260613-004620-llm-wiki-init.md:29,34]

## File Structure

```
apps/web/
├── package.json          # Next.js 16.2.9 configuration
├── AGENTS.md             # Project-specific development guidance
├── README.md             # Default Create Next App README
└── src/                  # Application source code
```

## Related Concepts

- [[pnpm Workspaces]] — Monorepo structure organizing `apps/*` and `packages/*`
- [[@hwp2pdf/shared Package]] — Shared library providing validation and types
- [[HWP File Upload Constraints]] — Upload rules enforced by the shared package
- [[AGENTS.md Pattern]] — Documentation pattern for AI-assisted development guidance
- [[Next.js]] — The framework powering the frontend

---

## Sources

^[20260613-004620-llm-wiki-init.md:20-24] — Workspace configuration, package details, and [[shared-package-architecture|Shared package architecture]]  
^[20260613-004620-llm-wiki-init.md:29] — Verified build command  
^[20260613-004620-llm-wiki-init.md:34] — Development guidelines and backend assumptions
