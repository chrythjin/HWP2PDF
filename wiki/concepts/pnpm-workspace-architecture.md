---
title: pnpm Workspace Architecture
summary: The monorepo uses pnpm workspaces with root package 'hwp2pdf', frontend at 'apps/web', and shared utilities at 'packages/shared'.
sources:
  - index.md
kind: concept
createdAt: "2026-06-12T16:39:16.488Z"
updatedAt: "2026-06-12T16:39:16.488Z"
tags:
  - monorepo
  - pnpm
  - architecture
aliases:
  - pnpm-workspace-architecture
  - PWA
confidence: 0.95
provenanceState: extracted
modelId: MiniMax-M2.7
promptVersion: v1
---

<think>
The user wants me to write a wiki page about "pnpm Workspace Architecture". Let me analyze the source material provided to extract facts about this topic.

Looking at the source material, I can find information about pnpm workspace architecture in several files:

1. **index.md** (lines 19-25):
   - Root package: pnpm workspace named `hwp2pdf`
   - Frontend: `apps/web`, package name `web`, Next.js 16.2.9
   - Shared package: `packages/shared`, package name `@hwp2pdf/shared`
   - Backend conversion service: documented in specs, but no `apps/api` package found

2. **hwp2pdf-blueprint.md** (lines 119-243):
   - Project folder structure showing apps/web and apps/api
   - The architecture uses pnpm monorepo with `apps/*` and `packages/*` pattern

3. **agents.md** (lines 20-34):
   - "pnpm workspace.yaml includes `apps/*` and `packages/*`"
   - "`packages/shared` publishes internal [[shared-typescript-contracts|Shared TypeScript Contracts]] as `@hwp2pdf/shared` after `tsc` builds `dist/`"
   - "Frontend changes obey `apps/web/AGENTS.md`"
   - "Frontend changes may require verifying the shared package builds with `pnpm --filter @hwp2pdf/shared build` before building `web`"

Let me compile these facts into a clear, well-structured wiki page about pnpm Workspace Architecture.
</think>

# pnpm Workspace Architecture

The **pnpm Workspace Architecture** is the monorepo structure used by the [[hwp2pdf-project|HWP2PDF Project]], employing pnpm's workspace feature to manage multiple packages from a single repository. This setup enables code sharing between frontend and backend while maintaining clear boundaries between application layers.

## Overview

The workspace is configured in `pnpm-workspace.yaml` to include two top-level package directories:

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

^[agents.md:20-21]

This configuration organizes the repository into:

- **`apps/*`** — Deployable applications (frontend, backend)
- **`packages/*`** — Internal libraries and shared code ^[hwp2pdf-blueprint.md:142-143]

## Verified Package Structure

The current workspace contains the following verified packages:

| Package | Path | Package Name | Description |
|---------|------|--------------|-------------|
| **web** | `apps/web` | `web` | [[nextjs-1629-frontend|Next.js 16.2.9 frontend]] application |
| **shared** | `packages/shared` | `@hwp2pdf/shared` | Internal [[shared-typescript-contracts|Shared TypeScript Contracts]] |

^[index.md:22-23]

The backend conversion service (Cloud Run API) is **documented in specs** but the `apps/api` package was **not found** during the initialization pass, indicating it may not yet be implemented or was not present at the time of verification. ^[index.md:24]

## Package Relationships

### Shared Package

The `@hwp2pdf/shared` package publishes internal [[shared-typescript-contracts|Shared TypeScript Contracts]]. It is built using the TypeScript compiler (`tsc`), which outputs to a `dist/` directory. ^[agents.md:16]

Frontend changes may require verifying the shared package builds successfully before building the web application:

```bash
pnpm --filter @hwp2pdf/shared build
pnpm --filter web build
```

^[agents.md:22-24]

### Frontend Package

The `apps/web` package contains application-specific guidance documented in `apps/web/AGENTS.md`. Frontend developers should obey the conventions and constraints documented there when making changes. ^[agents.md:34]

## Workspace Commands

### Recursive Build

The `pnpm -r build` command builds all packages in the workspace recursively. This command was verified on 2026-06-13 to:

1. Build `packages/shared` with `tsc`
2. Build `apps/web` with `next build`

^[agents.md:23, index.md:28]

### Filtered Commands

Individual packages can be targeted using the `--filter` flag:

```bash
pnpm --filter <package_name> <script>
```

^[index.md:29]

### Root Scripts

Root-level scripts declare common operations including:

| Script | Purpose |
|--------|---------|
| `dev:web` | Start frontend development server |
| `dev:api` | Start backend development server |
| `build:web` | Build frontend for production |
| `build:api` | Build backend for production |
| `lint` | Run linter across workspace |
| `typecheck` | Run TypeScript type checking |
| `test` | Execute test suite |

^[agents.md:24]

**Important:** Some root scripts (particularly `dev:api` and `build:api`) may reference packages that do not exist in the current workspace. Always verify the target package exists and has the matching script before using these commands. ^[index.md:35, agents.md:34]

## Project Directory Layout

```
hwp2pdf/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/           # Next.js App Router pages
│   │   │   ├── components/    # React components
│   │   │   ├── hooks/         # Custom React hooks
│   │   │   └── lib/           # Utilities
│   │   ├── public/            # Static assets
│   │   ├── AGENTS.md          # Frontend-specific guidance
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── api/                   # Cloud Run backend (planned/future)
│       └── src/
├── packages/
│   └── shared/                 # Shared TypeScript package
│       ├── src/
│       │   └── index.ts       # Public API surface
│       ├── dist/              # Build output
│       ├── package.json
│       └── tsconfig.json
├── pnpm-workspace.yaml        # Workspace configuration
├── package.json               # Root package.json
└── tsconfig.base.json         # Shared TypeScript config
```

^[hwp2pdf-blueprint.md:119-198]

## Key Design Principles

1. **Explicit verification** — Commands should be verified as working before being documented or relied upon
2. **Package isolation** — Shared code lives in `packages/*`, not duplicated across applications
3. **Declarative dependencies** — The workspace manifest declares intended package structure
4. **Build order** — Shared packages must build before dependent applications ^[agents.md:22-24, index.md:29]

---

## Sources

^[index.md:19-35] — Verified repository shape and current gaps  
^[agents.md:16,20-24,34] — Workspace configuration and package scripts  
^[hwp2pdf-blueprint.md:119-198] — Project folder structure showing apps and packages layout

---

## Related Concepts

- [[AGENTS.md Pattern]] — Documentation pattern for AI agent guidance
- [[Build verification requirement]] — Verifying scripts before use
- [[Cloud Run conversion backend]] — Planned backend architecture
- [[@hwp2pdf/shared Package]] — Shared types and contracts
- [[pnpm Workspace Configuration]] — Workspace manifest details
- [[Next.js Frontend Architecture]] — Frontend application structure (inferred from `apps/web`)
