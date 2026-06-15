---
title: Monorepo workspace scripts
summary: Root package.json declares workspace-level scripts and package manager configuration for coordinating across the monorepo
sources:
  - 20260613-004620-llm-wiki-init.md
kind: concept
createdAt: "2026-06-12T16:38:01.552Z"
updatedAt: "2026-06-12T16:38:01.552Z"
tags:
  - monorepo
  - scripts
  - configuration
aliases:
  - monorepo-workspace-scripts
  - MWS
confidence: 0.85
provenanceState: extracted
modelId: MiniMax-M2.7
promptVersion: v1
---

<think>The user wants me to write a wiki page about "Monorepo workspace scripts" based on the provided source material. Let me analyze what information is available in the source material.

Looking at the provided source files, I can see information about:

1. **20260613-004620-llm-wiki-init.md** - Contains session notes about:
   - `pnpm-workspace.yaml` includes `apps/*` and `packages/*`
   - Root `package.json` declares pnpm, Node `>=20`, workspace scripts, and package manager `pnpm@8.15.0`
   - `apps/web/package.json` defines the Next.js frontend package named `web` using Next.js 16.2.9
   - `packages/shared/package.json` defines `@hwp2pdf/shared` and builds with `tsc`
   - `packages/shared/src/index.ts` centralizes `.hwp` upload validation, 20MB max size, job status types, API routes, and polling constants
   - Ran `pnpm -r build`: passed for `packages/shared` and `apps/web`

2. **AGENTS.md** - Contains information about:
   - `packages/shared` publishes internal [[shared-typescript-contracts|Shared TypeScript Contracts]] as `@hwp2pdf/shared` after `tsc` builds `dist/`
   - `pnpm -r build` was verified on 2026-06-13 and builds `packages/shared` with `tsc`, then `apps/web` with `next build`
   - For frontend code changes, obey `apps/web/AGENTS.md`

3. **index.md** - Contains:
   - The index page with a list of documents including the session notes

4. **20260613-004620-llm-wiki-init.md** - Already discussed above

Now I need to write a wiki page about "Monorepo workspace scripts" that:
1. Uses only facts from the source material
2. Includes a ## Sources section at the end
3. Suggests [[wikilinks]] to related concepts where appropriate


4. Uses the citation format `^[filename.md:START-END]`
5. Is written in a neutral, informative tone
6. Is concise but thorough

I'll focus on the verified workspace scripts and build commands from the source material. The key workspace commands mentioned are `pnpm -r build` for building all packages, with specific details about how `packages/shared` and `apps/web` are built using TypeScript and Next.js respectively.
</think>


# Monorepo Workspace Scripts

Monorepo workspace scripts are commands defined at the root of a monorepo that can operate across all packages within the workspace, enabling consistent build, test, and development workflows across multiple related packages.

## Overview

In a pnpm monorepo configured with `pnpm-workspace.yaml`, workspace scripts allow package managers to execute commands across all (or selected) packages in the workspace from a single root command. The [[hwp2pdf-project|HWP2PDF Project]] uses this pattern to coordinate builds between its shared package and frontend application. ^[20260613-004620-llm-wiki-init.md:20]

## Workspace Configuration

The workspace is configured via `pnpm-workspace.yaml`, which declares two glob patterns for package discovery:

- `apps/*` — Application packages
- `packages/*` — Shared library packages

This configuration allows pnpm to automatically link packages within the workspace and resolve dependencies between them. ^[20260613-004620-llm-wiki-init.md:20]

## Root Package.json Configuration

The root `package.json` establishes foundational settings:

| Setting | Value |
|---------|-------|
| Package Manager | pnpm 8.15.0 |
| Node.js Requirement | >= 20 |

Workspace scripts are declared in the root `package.json` to enable recursive execution across all packages in the workspace. ^[20260613-004620-llm-wiki-init.md:21]

## Build Commands

### Recursive Build (`pnpm -r build`)

The primary workspace build command is `pnpm -r build`, which builds all packages in the workspace recursively. The `-r` flag instructs pnpm to execute the build script in every package that defines it.

In the [[hwp2pdf-project|HWP2PDF Project]], this command was verified to succeed with the following build sequence:

1. **`packages/shared`** — Built first using the TypeScript compiler (`tsc`), which compiles `src/index.ts` to `dist/`
2. **`apps/web`** — Built second using `next build`, which compiles the [[nextjs-frontend-application|Next.js Frontend Application]]

The recursive build order respects dependency relationships within the workspace, ensuring shared packages are built before packages that depend on them. ^[AGENTS.md:16,29]

### Build Verification

The `pnpm -r build` command was verified on 2026-06-13 to successfully compile both `packages/shared` and `apps/web` without errors. ^[20260613-004620-llm-wiki-init.md:29]

## Package-Level Build Configuration

### packages/shared

```json
{
  "name": "@hwp2pdf/shared",
  "build": "tsc"
}
```

The TypeScript compiler reads the package's `tsconfig.json` and outputs JavaScript type declarations to the `dist/` directory. This makes the package's types and utilities available to other packages in the workspace. ^[AGENTS.md:16]

### apps/web

The Next.js frontend package uses the framework's built-in build system via `next build`. It depends on `@hwp2pdf/shared` being built first, which is automatically handled by the workspace's dependency resolution. ^[20260613-004620-llm-wiki-init.md:22-23]

## Common Workspace Scripts

Typical workspace scripts available in pnpm monorepos include:

| Script | Description |
|--------|-------------|
| `pnpm -r build` | Build all packages |
| `pnpm -r test` | Run tests across all packages |
| `pnpm -r dev` | Start development mode for all packages |
| `pnpm -r clean` | Clean build artifacts across all packages |
| `pnpm -r --filter <pkg> <cmd>` | Run command in specific package |

## Related Concepts

- [[pnpm Workspaces]] — The pnpm feature that enables monorepo package management
- [[@hwp2pdf/shared Package]] — The shared package built by the workspace
- [[Next.js 16 Frontend]] — The frontend application built by the workspace
- [[AGENTS.md Pattern]] — Project-specific guidance for AI-assisted development
- [[llm-wiki Repository Structure]] — The broader repository organization

---

## Sources

^[20260613-004620-llm-wiki-init.md:20-21] — Workspace configuration and root package.json declaration  
^[20260613-004620-llm-wiki-init.md:22-23] — Package-level build configuration  
^[20260613-004620-llm-wiki-init.md:29] — Verified build command success  
^[AGENTS.md:16] — Shared package TypeScript build process
