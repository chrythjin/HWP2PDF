---
title: pnpm recursive build verification
summary: Build verification uses 'pnpm -r build' to recursively build all workspace packages, which passed for packages/shared and apps/web
sources:
  - 20260613-004620-llm-wiki-init.md
kind: concept
createdAt: "2026-06-12T16:36:30.814Z"
updatedAt: "2026-06-12T16:36:30.814Z"
tags:
  - build-system
  - verification
  - tooling
aliases:
  - pnpm-recursive-build-verification
  - PRBV
confidence: 0.9
provenanceState: extracted
modelId: MiniMax-M2.7
promptVersion: v1
---

<think>The user wants me to write a wiki page about "pnpm recursive build verification". Let me analyze the source material provided to extract relevant facts.

Looking at the source material in `20260613-004620-llm-wiki-init.md`:

1. Line 29: "Ran `pnpm -r build`: passed for `packages/shared` and `apps/web`."

This tells me:
- `pnpm -r build` is the recursive build command
- It builds packages/shared and apps/web
- It was verified to pass

This is the only direct reference to "pnpm recursive build verification" in the source material. However, I can also draw from other context:

- Line 20: pnpm-workspace.yaml includes apps/* and packages/*
- Line 22: apps/web is the Next.js frontend
- Line 23: packages/shared builds with tsc
- Line 24: The shared package contains various utilities

So the recursive build verification refers to running `pnpm -r build` to verify that all packages in the workspace build successfully. The `-r` flag runs the build command recursively across all packages in the workspace.

Let me write a clear, well-structured markdown page about this concept. I should:
1. Define what pnpm recursive build verification is
2. Explain the command and its purpose
3. Mention what was verified in this case
4. Include related concepts with wikilinks
5. Include a Sources section with proper citations
6. Use the citation format ^[filename.md:START-END]

I should also suggest related wiki links where appropriate.
</think>

# pnpm Recursive Build Verification

**pnpm recursive build verification** is the process of running `pnpm -r build` to confirm that all packages within a pnpm workspace build successfully without errors. This verification step ensures that the dependency graph is correctly resolved and that each package's build tooling executes properly.

## Overview

The `-r` flag in pnpm instructs the package manager to run the specified command recursively across all packages in the workspace. When combined with the `build` script, this command triggers the build process for every package that defines a `build` script in its `package.json`. ^[20260613-004620-llm-wiki-init.md:29]

## How It Works

In a pnpm workspace configured with `pnpm-workspace.yaml` (which declares `apps/*` and `packages/*` as workspace globs), running `pnpm -r build` traverses the workspace hierarchy and executes the build command in each package. The order of builds respects the dependency graph, ensuring that packages with dependencies are built after their dependencies. ^[20260613-004620-llm-wiki-init.md:20]

## Verified Results

During the documented session, the recursive build was executed and verified to pass for the following packages:

| Package | Build Tool | Location |
|---------|------------|----------|
| `packages/shared` | TypeScript Compiler (`tsc`) | `packages/shared/` |
| `apps/web` | Next.js build pipeline | `apps/web/` |

Both packages completed their build processes successfully, confirming that the workspace configuration is correct and that all build scripts execute without errors. ^[20260613-004620-llm-wiki-init.md:29]

## Build Configuration Details

### packages/shared

The shared package uses the TypeScript Compiler directly as its build tool, as specified in its `package.json`. The build output is placed in a `dist/` directory, and the package is published as `@hwp2pdf/shared` after compilation. ^[20260613-004620-llm-wiki-init.md:23]

### apps/web

The web application builds using the Next.js framework's build system, which handles TypeScript compilation, optimization, and static generation as part of its pipeline. ^[20260613-004620-llm-wiki-init.md:22]

## Related Concepts

- [[pnpm Workspaces]] — the workspace structure that enables recursive operations
- [[@hwp2pdf/shared Package]] — the shared package included in the build verification
- [[Next.js 16 Frontend]] — the web application verified during the build
- [[TypeScript Configuration]] — the build tool used by the shared package
- [[Monorepo Build Orchestration]] — the broader practice of coordinating builds across a multi-package repository

---

## Sources

^[20260613-004620-llm-wiki-init.md:29] — Verification command and passing results  
^[20260613-004620-llm-wiki-init.md:20] — Workspace configuration with apps/* and packages/* globs  
^[20260613-004620-llm-wiki-init.md:22-23] — Build tool details for verified packages
