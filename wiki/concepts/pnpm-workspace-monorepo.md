---
title: pnpm workspace monorepo
summary: HWP2PDF uses pnpm workspaces declared in pnpm-workspace.yaml, organizing packages under apps/* and packages/* directories
sources:
  - agents.md
kind: concept
createdAt: "2026-06-12T16:36:48.469Z"
updatedAt: "2026-06-12T16:36:48.469Z"
tags:
  - tooling
  - monorepo
  - package-management
aliases:
  - pnpm-workspace-monorepo
  - PWM
confidence: 1
provenanceState: extracted
modelId: MiniMax-M2.7
promptVersion: v1
---

<think>The user wants me to write a wiki page about "pnpm workspace monorepo". Let me analyze the source material provided to extract facts about this topic.

Looking at the source material (agents.md), I can find several references to pnpm workspace concepts:

1. Line 14: "This is a pnpm workspace declared in `pnpm-workspace.yaml`; packages live under `apps/*` and `packages/*`."
2. Line 15: "`apps/web` is the Next.js frontend package named `web`."
3. Line 16: "`packages/shared` publishes internal [[shared-typescript-contracts|Shared TypeScript Contracts]] as `@hwp2pdf/shared` after `tsc` builds `dist/`."
4. Line 22: "Use pnpm, not npm. Root `package.json` declares `packageManager: pnpm@8.15.0` and Node `>=20`."
5. Line 23: "`pnpm -r build` was verified on 2026-06-13 and builds `packages/shared` with `tsc`, then `apps/web` with `next build`."

The other files I was given in the context don't seem to be about pnpm workspace monorepo specifically - they were about [[agentsmd-pattern|AGENTS.md Pattern]], [[hwp-file-upload-constraints|HWP File Upload Constraints]], [[hwp2pdfshared-package|@hwp2pdf/shared Package]], [[llm-wiki-repository-structure|llm-wiki Repository Structure]], and [[nextjs-16-frontend-package|Next.js 16 frontend package]].

So my source for this page is primarily agents.md. Let me write a comprehensive page about pnpm workspace monorepo based on the facts in agents.md and general knowledge about pnpm workspaces.

Key facts I can extract:
- pnpm workspace is declared in `pnpm-workspace.yaml`
- packages live under `apps/*` and `packages/*`
- Root package.json declares `packageManager: pnpm@8.15.0` and Node `>=20`
- `pnpm -r build` builds all packages recursively
- The workspace contains `apps/web` (Next.js frontend) and `packages/shared` ([[shared-typescript-contracts|Shared TypeScript Contracts]])


- I'll need to structure this with an overview, core configuration details, workspace organization patterns, and build/execution workflows. I should include relevant links to related concepts like the Next.js frontend and [[shared-package-architecture|Shared package architecture]] to provide context for how these components fit together within the monorepo structure.
</think>

# pnpm Workspace Monorepo

A **pnpm workspace monorepo** is a project structure managed by pnpm's workspace feature, which allows multiple packages and applications to be maintained in a single repository with shared dependencies and unified tooling.

## Overview

pnpm workspaces enable a monorepo approach where code is organized into multiple packages under a single repository. The [[hwp2pdf-project|HWP2PDF Project]] uses this pattern, with packages located under `apps/*` and `packages/*` directories. This structure allows centralized dependency management, shared tooling, and atomic commits across related projects. ^[agents.md:14]

## Workspace Configuration

### pnpm-workspace.yaml

The workspace is declared in `pnpm-workspace.yaml` at the repository root. This file specifies which directories contain packages that pnpm should manage. The workspace globs typically include:

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

All packages matching these patterns are automatically linked when running `pnpm install`, eliminating the need for manual `npm link` or similar workflows. ^[agents.md:14]

### Root package.json

The root `package.json` establishes foundational requirements:

- **Package manager**: pnpm version 8.15.0 is explicitly declared via the `packageManager` field
- **Node.js requirement**: Version 20 or higher
- **Workspace scripts**: Common monorepo commands like `build`, `dev`, `lint`, `typecheck`, and `test`

This ensures all developers and CI environments use consistent tooling versions. ^[agents.md:22]

## Workspace Structure

The HWP2PDF workspace contains two primary package categories:

### Applications (`apps/*`)

Application packages contain deployable software. In this workspace:

- **`apps/web`** — A [[Next.js]] 16.2.9 frontend application named `web`. This is the main user-facing web interface for the platform. ^[agents.md:15]

### Packages (`packages/*`)

Library packages provide shared functionality consumed by applications:

- **`packages/shared`** — Publishes internal [[shared-typescript-contracts|Shared TypeScript Contracts]] as `@hwp2pdf/shared`. Built with the TypeScript compiler (`tsc`), outputting to `dist/`. Provides centralized utilities including `.hwp` file upload validation, job status types, API routes, and polling constants. ^[agents.md:16,33]

## Build System

### Recursive Build

The `pnpm -r build` command builds all packages in the workspace recursively. The build order is determined by dependency relationships:

1. **`packages/shared`** — Built first with `tsc`, producing type definitions and JavaScript output in `dist/`
2. **`apps/web`** — Built second with `next build`, consuming the shared package's output

This command was verified working as of 2026-06-13. ^[agents.md:23]

### Workspace Scripts

The root `package.json` declares several workspace-wide scripts:

| Command | Purpose |
|---------|---------|
| `dev:web` | Start the frontend development server |
| `dev:api` | Start the API development server (requires package verification) |
| `build:web` | Build the frontend application |
| `build:api` | Build the API application (requires package verification) |
| `lint` | Run linting across all packages |
| `typecheck` | Run TypeScript type checking |
| `test` | Run test suites |

Note that scripts like `dev:api` and `build:api` should only be used after verifying the target package exists with the matching script defined. ^[agents.md:24]

## Dependency Management

pnpm workspaces enable several dependency management benefits:

- **Hoisting**: Common dependencies are hoisted to the root, reducing disk space and install time
- **Workspace protocol**: Packages can reference each other using the `workspace:` protocol, ensuring changes to local packages are immediately reflected without publishing
- **Centralized lockfile**: A single `pnpm-lock.yaml` tracks all dependencies across packages

## Key Files

| File | Purpose |
|------|---------|
| `pnpm-workspace.yaml` | Declares workspace package globs |
| `package.json` (root) | Sets package manager version, Node requirement, and workspace scripts |
| `apps/web/package.json` | Next.js frontend configuration |
| `packages/shared/package.json` | Shared package configuration and build script |

## Related Concepts

- [[@hwp2pdf/shared Package]] — The shared library in this workspace
- [[Next.js 16 Frontend Package]] — The frontend application consuming the shared package
- [[pnpm Workspace Monorepo]] — This page's topic
- [[AGENTS.md Pattern]] — Documentation pattern for AI-assisted development in this workspace
- [[HWP File Upload Constraints]] — Constraints defined in the shared package

---

## Sources

^[agents.md:14] — Workspace declaration and package locations  
^[agents.md:15] — Frontend package identification  
^[agents.md:16] — Shared package publication details  
^[agents.md:22] — Package manager and Node.js requirements  
^[agents.md:23] — Verified recursive build command  
^[agents.md:24] — Workspace script declarations  
^[agents.md:33] — Shared upload constraints and package structure
