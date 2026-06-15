---
title: Next.js 16 Frontend
summary: Frontend web application package using Next.js 16.2.9 in the apps/web directory
sources:
  - 20260613-004620-llm-wiki-init.md
kind: concept
createdAt: "2026-06-12T16:19:20.913Z"
updatedAt: "2026-06-12T16:19:20.913Z"
tags:
  - nextjs
  - frontend
  - web
aliases:
  - nextjs-16-frontend
  - N1F
confidence: 0.95
provenanceState: extracted
modelId: MiniMax-M2.7
promptVersion: v1
---

<think>
The user wants me to write a wiki page about "Next.js 16 Frontend". Let me analyze the source material provided.

From the source material, I can extract these key facts about the Next.js 16 Frontend:

1. The Next.js frontend package is named `web` - located at `apps/web/`
2. It uses Next.js version 16.2.9
3. It's part of a pnpm workspace that includes `apps/*` and `packages/*`
4. There's a shared package at `packages/shared/` with the name `@hwp2pdf/shared`
5. The shared package builds with `tsc`
6. The shared package centralizes `.hwp` upload validation, 20MB max size, job status types, API routes, and polling constants
7. There's an `apps/web/AGENTS.md` file with guidance for changes
8. There's a default Create Next App README at `apps/web/README.md`
9. The package manager is pnpm@8.15.0 and requires Node >=20

Now I need to write a well-structured markdown page about this, including:
- Facts from the source
- Wikilinks to related concepts
- A Sources section
- Citations in the proper format

Let me structure this as a comprehensive wiki page about the Next.js 16 Frontend application.
</think>

# Next.js 16 Frontend

The Next.js 16 Frontend, internally named **`web`**, is the primary client application in the HWP to PDF conversion platform. It is located in the `apps/web/` directory of the monorepo and serves as the user-facing interface for uploading `.hwp` files and monitoring conversion job status.

## Overview

The `web` application is built with Next.js 16.2.9 and forms part of a pnpm workspace structure that organizes the repository into `apps/*` and `packages/*` directories. This monorepo approach allows shared code to be centralized while maintaining separate application concerns.

The frontend application is configured to work in conjunction with the shared package `@hwp2pdf/shared`, which provides reusable validation logic, type definitions, and API constants used across the platform.

## Technical Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 16.2.9 |
| Language | TypeScript |
| Package Manager | pnpm 8.15.0 |
| Node Requirement | >= 20 |
| Monorepo Structure | pnpm workspaces |

The application is developed using TypeScript and builds using the standard Next.js build pipeline. The root workspace configuration and the application's own `package.json` both enforce Node version 20 or higher as a requirement.

## Shared Utilities

The frontend leverages the `@hwp2pdf/shared` package located at `packages/shared/` for several core functionalities:

- **`.hwp` upload validation** — centralized logic for validating HWP file uploads
- **20MB file size limit** — shared constant enforcing maximum upload size
- **Job status types** — TypeScript interfaces defining the states of conversion jobs
- **API route definitions** — consistent route path constants
- **Polling constants** — timing values used for status checking operations

The shared package is compiled using `tsc` (TypeScript Compiler), ensuring type safety across both the frontend and any backend components that consume it.

## Development Notes

When making changes to the frontend codebase, developers should:

1. Consult `apps/web/AGENTS.md` for project-specific guidance
2. Refer to the installed Next.js 16 documentation for framework-specific API usage
3. Ensure the shared package remains the single source of truth for validation and type definitions

The `apps/web/README.md` currently contains the default Create Next App documentation. A custom project-specific README may replace this in future updates.

## Related Concepts

- [[pnpm Workspaces]] — the monorepo structure used by this project
- [[TypeScript Configuration]] — shared type definitions and `tsc` build process
- [[HWP File Format]] — the file type handled by the conversion platform
- [[API Routes]] — backend endpoints consumed by the frontend
- [[Shared Package]] — the centralized `@hwp2pdf/shared` utilities

---

## Sources

^[20260613-004620-llm-wiki-init.md:22] — Next.js version 16.2.9 and package naming  
^[20260613-004620-llm-wiki-init.md:20-21] — pnpm workspace configuration and Node version requirements  
^[20260613-004620-llm-wiki-init.md:23-24] — [[shared-package-architecture|Shared package architecture]] and centralized utilities  
^[20260613-004620-llm-wiki-init.md:34] — development guidance and documentation references  
^[20260613-004620-llm-wiki-init.md:25] — README status and package structure details
