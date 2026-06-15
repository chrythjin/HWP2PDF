---
title: pnpm monorepo workspace configuration
summary: The llm-wiki project uses pnpm workspaces with a root pnpm-workspace.yaml that includes apps/* and packages/* directories, requiring Node >=20 and pnpm@8.15.0
sources:
  - 20260613-004620-llm-wiki-init.md
kind: concept
createdAt: "2026-06-12T16:36:32.029Z"
updatedAt: "2026-06-12T16:36:32.029Z"
tags:
  - tooling
  - monorepo
  - configuration
aliases:
  - pnpm-monorepo-workspace-configuration
  - PMWC
confidence: 0.95
provenanceState: extracted
modelId: MiniMax-M2.7
promptVersion: v1
---

<think>The user wants me to write a wiki page about "pnpm monorepo workspace configuration". I need to analyze the source material provided to extract facts about this topic.

Looking at the source material (20260613-004620-llm-wiki-init.md), I can see several facts about the pnpm monorepo workspace configuration:

1. Line 20: `pnpm-workspace.yaml` includes `apps/*` and `packages/*`.
2. Line 21: Root `package.json` declares pnpm, Node `>=20`, workspace scripts, and package manager `pnpm@8.15.0`.
3. Line 22: `apps/web/package.json` defines the Next.js frontend package named `web` using Next.js 16.2.9.
4. Line 23: `packages/shared/package.json` defines `@hwp2pdf/shared` and builds with `tsc`.
5. Line 24: `packages/shared/src/index.ts` centralizes `.hwp` upload validation, 20MB max size, job status types, API routes, and polling constants.
6. Line 29: Ran `pnpm -r build`: passed for `packages/shared` and `apps/web`.

I should write a clear, well-structured markdown page about the pnpm monorepo workspace configuration, including:
1. Overview of the workspace configuration
2. pnpm-workspace.yaml structure
3. Root package.json configuration
4. Package structure (apps and packages directories)
5. Build commands
6. Related concepts

I need to use the citation format `^[filename.md:START-END]` for inline citations.
I should include a ## Sources section at the end.
I should suggest wikilinks to related concepts where appropriate.
Write in a neutral, informative tone.
Be concise but thorough.
</think>

# pnpm Monorepo Workspace Configuration

The [[hwp2pdf-project|HWP2PDF Project]] uses a [[pnpm workspaces|pnpm monorepo]] structure to manage multiple packages and applications from a single repository root. This approach enables code sharing between packages while maintaining clear boundaries between the frontend application and shared utilities.

## Workspace Structure

The workspace configuration is defined in `pnpm-workspace.yaml` at the repository root. This file declares two glob patterns that specify which directories contain workspace packages:

- `apps/*` — Application packages
- `packages/*` — Shared library packages

All packages matching these patterns are automatically linked within the workspace, eliminating the need for manual `npm link` commands or dependency duplication. ^[20260613-004620-llm-wiki-init.md:20]

## Root Configuration

The root `package.json` establishes the foundational requirements for the entire workspace:

| Setting | Value |
|---------|-------|
| Package Manager | pnpm 8.15.0 |
| Node.js Requirement | >= 20 |
| Workspace Scripts | Standard monorepo build/dev commands |

The explicit `packageManager` field in `package.json` ensures that all developers and CI environments use the same pnpm version, preventing version-related inconsistencies across the team. ^[20260613-004620-llm-wiki-init.md:21]

## Package Organization

### apps/web

The frontend application resides in `apps/web`. This Next.js application is the user-facing interface of the HWP2PDF platform.

- **Package name**: `web`
- **Framework**: Next.js 16.2.9
- **Build target**: Production-ready web application

### packages/shared

The shared utilities package lives in `packages/shared`. It provides centralized code used by other packages in the workspace.

- **Package name**: `@hwp2pdf/shared`
- **Build tool**: TypeScript Compiler (`tsc`)
- **Entry point**: `packages/shared/src/index.ts`

The shared package exports utilities for `.hwp` file validation, job status types, API routes, and polling constants. ^[20260613-004620-llm-wiki-init.md:22-24]

## Build Commands

The workspace supports recursive building of all packages via a single command:

```bash
pnpm -r build
```

This command builds all packages in dependency order. The build process for the shared package must complete before the frontend application can be built, as `apps/web` depends on `@hwp2pdf/shared`. The build was verified to pass successfully for both `packages/shared` and `apps/web`. ^[20260613-004620-llm-wiki-init.md:29]

## Benefits of This Configuration

- **Automatic linking**: Packages within the workspace are linked without additional configuration
- **Shared dependencies**: Common dependencies are deduplicated across packages
- **Consistent tooling**: All packages use the same pnpm version and Node requirement
- **Dependency management**: Build order is automatically resolved based on package relationships

## Related Concepts

- [[pnpm Workspaces]] — The pnpm feature enabling this monorepo structure
- [[@hwp2pdf/shared Package]] — The shared package included in this workspace
- [[Next.js 16 Frontend]] — The frontend application in `apps/web`
- [[HWP File Upload Constraints]] — Constraints managed through the shared package
- [[AGENTS.md Pattern]] — Documentation pattern for AI-assisted development

---

## Sources

^[20260613-004620-llm-wiki-init.md:20] — pnpm-workspace.yaml structure  
^[20260613-004620-llm-wiki-init.md:21] — Root package.json configuration  
^[20260613-004620-llm-wiki-init.md:22-24] — Package definitions and shared package exports  
^[20260613-004620-llm-wiki-init.md:29] — Build verification results
