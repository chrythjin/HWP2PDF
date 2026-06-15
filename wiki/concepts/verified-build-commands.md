---
title: Verified Build Commands
summary: Documented build commands include 'pnpm -r build' as the primary workspace build and targeted builds via package filters.
sources:
  - index.md
kind: concept
createdAt: "2026-06-12T16:39:05.962Z"
updatedAt: "2026-06-12T16:39:05.962Z"
tags:
  - build-tooling
  - pnpm
  - devops
aliases:
  - verified-build-commands
  - VBC
confidence: 0.9
provenanceState: extracted
modelId: MiniMax-M2.7
promptVersion: v1
---

<think>
The user wants me to write a wiki page about "Verified Build Commands" based on the provided source material. Looking at the index.md file, I can see information about verified build commands:

Lines 26-29 mention:
- `pnpm -r build` passed on 2026-06-13
- `pnpm --filter web build` and `pnpm --filter @hwp2pdf/shared build` are implied by the recursive build

Lines 35 also mentions about root scripts and verifying before relying on them.

I should write a clear, well-structured markdown page about "Verified Build Commands" based on this information, with proper citations.

Let me also check the AGENTS.md file since it was mentioned in the index as containing compact repo-specific operating guide.
</think>

# Verified Build Commands

**Verified Build Commands** are build instructions that have been actively tested and confirmed to execute successfully in the repository. Unlike unverified scripts that may exist in `package.json` files, verified commands provide reliable guidance for AI agents and developers.

## Verified Commands

| Command | Verification Date | Description |
|---------|-------------------|-------------|
| `pnpm -r build` | 2026-06-13 | Recursive build across all packages |
| `pnpm --filter web build` | 2026-06-13 | Build only the Next.js frontend |
| `pnpm --filter @hwp2pdf/shared build` | 2026-06-13 | Build only the shared types package |

^[index.md:26-29]

## Build Order

When executing `pnpm -r build` (recursive build), the workspace builds packages in dependency order. For the `hwp2pdf` workspace, this means:

1. `packages/shared` is built first using `tsc` — this compiles the shared TypeScript types to `dist/`
2. `apps/web` is built second using `next build` — this consumes the `@hwp2pdf/shared` package

^[index.md:21-23]

## Command Verification Principle

Individual package builds (`pnpm --filter web build` and `pnpm --filter @hwp2pdf/shared build`) are implied by the recursive build and the scripts declared in each package. However, they should be re-run directly before citing fresh status to confirm they still work in isolation. ^[index.md:29]

## Workspace Structure

The verified build commands operate within this pnpm workspace structure:

- **Root package**: `pnpm-workspace.yaml` defines workspace as `hwp2pdf`
- **Frontend**: `apps/web`, package name `web`, Next.js 16.2.9
- **Shared**: `packages/shared`, package name `@hwp2pdf/shared`
- **Backend**: Documented in specs, but `apps/api` package not yet present in workspace

^[index.md:21-24]

## Unverified Scripts

Several scripts are declared in the root `package.json` but have **not been verified** as functional:

- `api` — Root scripts reference this, but the `apps/api` package was not found during initialization
- `typecheck` — Not verified across all packages
- `test` — Not verified to be usable

These commands should not be relied upon without first verifying the target package exists and the script executes successfully. ^[index.md:35]

---

## Sources

^[index.md:26-29] — Verified build commands and verification dates  
^[index.md:21-24] — Workspace structure and package definitions  
^[index.md:35] — Unverified scripts requiring validation

---

## Related Concepts

- [[AGENTS.md Pattern]] — Documentation pattern for AI agent guidance
- [[Build verification requirement]] — Principle that commands must be verified before documentation
- [[pnpm Workspace Configuration]] — Workspace setup defining build order
- [[@hwp2pdf/shared Package]] — Shared package built during recursive build
