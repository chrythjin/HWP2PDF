---
title: pnpm Workspace Configuration
summary: Workspace setup using pnpm-workspace.yaml with pnpm@8.15.0 and Node >=20 requirement
sources:
  - 20260613-004620-llm-wiki-init.md
kind: concept
createdAt: "2026-06-12T16:19:18.554Z"
updatedAt: "2026-06-12T16:19:18.554Z"
tags:
  - package-management
  - pnpm
  - workspace
aliases:
  - pnpm-workspace-configuration
  - PWC
confidence: 0.95
provenanceState: extracted
modelId: MiniMax-M2.7
promptVersion: v1
---

<think>
The user wants me to write a wiki page about "pnpm Workspace Configuration" based on the provided source material. Let me analyze the source material to extract relevant facts.

From the source material (20260613-004620-llm-wiki-init.md):

1. Line 20: `pnpm-workspace.yaml` includes `apps/*` and `packages/*`
2. Line 21: Root `package.json` declares pnpm, Node `>=20`, workspace scripts, and package manager `pnpm@8.15.0`
3. Line 22: `apps/web/package.json` defines the Next.js frontend package named `web` using Next.js 16.2.9
4. Line 23: `packages/shared/package.json` defines `@hwp2pdf/shared` and builds with `tsc`
5. Line 24: `packages/shared/src/index.ts` centralizes `.hwp` upload validation, 20MB max size, job status types, API routes, and polling constants
6. Line 29: `pnpm -r build` - running build across all packages in workspace

This source material describes the repository structure but doesn't have extensive documentation about pnpm workspace configuration in general. However, I can infer some facts about the workspace structure from this.

Let me write a clear, well-structured markdown page that:
1. Explains what pnpm workspace configuration is
2. Documents the specific workspace structure from this repo
3. Includes relevant facts from the source material
4. Uses proper citations
5. Includes wikilinks to related concepts
6. Has a Sources section at the end

I should be careful to only draw from the provided source material and not add my own knowledge about pnpm workspaces.
</think>

# pnpm Workspace Configuration

A pnpm workspace allows you to manage multiple packages within a single repository. This monorepo structure enables shared dependencies, unified tooling, and efficient build processes across interconnected projects.

## Workspace Structure

The repository uses a standard pnpm workspace layout with two top-level directories defined in `pnpm-workspace.yaml`.[^1]

### Directory Layout

```
├── apps/
│   └── web/          # Next.js frontend application
├── packages/
│   └── shared/       # Shared TypeScript utilities
├── pnpm-workspace.yaml
└── package.json
```

The workspace configuration file specifies `apps/*` and `packages/*` globs, which tells pnpm to treat any packages within these directories as members of the workspace.[^1]

## Root Configuration

The root `package.json` establishes foundational settings for the entire workspace:

- **Package Manager**: `pnpm@8.15.0` is declared as the required package manager
- **Node Version**: Requires Node.js `>=20`
- **Workspace Scripts**: Common build commands that run across all packages[^1]

## Package Configuration

### Web Application (`apps/web/`)

The frontend application is defined with the package name `web` and uses Next.js 16.2.9 as its framework.[^1]

### Shared Package (`packages/shared/`)

The shared package publishes under the `@hwp2pdf/shared` namespace and uses `tsc` for TypeScript compilation. It centralizes several utilities including:

- `.hwp` file upload validation
- 20MB maximum file size limit
- Job status type definitions
- API route constants
- Polling interval constants[^1]

## Building the Workspace

To build all packages within the workspace, run:

```bash
pnpm -r build
```

The `-r` flag instructs pnpm to recursively execute the command across all packages in the workspace. This command successfully builds both `packages/shared` and `apps/web`.[^2]

## Related Concepts

- [[Monorepo]] — The architectural pattern that workspaces enable
- [[Package Manager Configuration]] — Managing dependencies across packages
- [[TypeScript Configuration]] — Building shared packages with `tsc`
- [[Next.js Configuration]] — Framework setup for the web application

---

## Sources

[^1]: 20260613-004620-llm-wiki-init.md (lines 20-24)
[^2]: 20260613-004620-llm-wiki-init.md (lines 28-29)
