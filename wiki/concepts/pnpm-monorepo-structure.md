---
title: pnpm Monorepo Structure
summary: Project organization using pnpm workspaces with apps/web, apps/api, and packages/shared packages for shared TypeScript types and validation logic
sources:
  - hwp2pdf-plan-v1.md
kind: concept
createdAt: "2026-06-12T16:39:12.202Z"
updatedAt: "2026-06-12T16:39:12.202Z"
tags:
  - monorepo
  - pnpm
  - project-structure
aliases:
  - pnpm-monorepo-structure
  - PMS
confidence: 0.95
provenanceState: extracted
modelId: MiniMax-M2.7
promptVersion: v1
---

<think>
The user wants me to write a wiki page about "pnpm Monorepo Structure". I need to analyze the source material provided to extract facts about this topic.

Looking through the source material, I can find information about pnpm monorepo structure in:

1. hwp2pdf-plan-v1.md:
   - Lines 264-279: [[pnpm-workspace-configuration|pnpm Workspace Configuration]] showing apps/* and packages/*
   - Lines 119-198: Project folder structure showing apps/web, apps/api, packages/shared

2. hwp2pdf-blueprint.md:
   - Lines 125-131: [[pnpm-workspace-configuration|pnpm Workspace Configuration]]
   - Lines 133-162: Project structure with apps/* and packages/* directories

Let me compile the facts:

From hwp2pdf-plan-v1.md:
- Lines 264-279 show the root package.json with workspaces: ["apps/*", "packages/*"] and packageManager: "pnpm@8.15.0"
- Lines 274-278 show pnpm-workspace.yaml with packages: - "apps/*" and - "packages/*"

From hwp2pdf-blueprint.md:
- Lines 125-131 show the [[pnpm-workspace-configuration|pnpm Workspace Configuration]]
- Lines 133-162 show the project structure

Key facts:
1. [[pnpm-workspace-configuration|pnpm Workspace Configuration]] in pnpm-workspace.yaml specifies packages locations
2. Root package.json declares workspaces and packageManager
3. apps/ directory contains applications (web, api)
4. packages/ directory contains shared libraries
5. apps/web is the Next.js frontend
6. apps/api is the Cloud Run backend
7. packages/shared is the shared types package
8. Build order matters: shared must be built before apps that depend on it

Let me write the wiki page now.
</think>

# pnpm Monorepo Structure

The **pnpm Monorepo Structure** is a workspace-based repository organization pattern used by the [[hwp2pdf-project|HWP2PDF Project]], where multiple packages are managed together under a single repository using pnpm's workspace feature.

## Overview

pnpm workspaces allow multiple packages to be installed from a single `pnpm-lock.yaml`, ensuring consistent dependency versions across the project. The workspace configuration declares two top-level directories where packages live: `apps/` for applications and `packages/` for shared libraries. ^[hwp2pdf-plan-v1.md:264-279]

## Workspace Configuration

### Root `package.json`

```json
{
  "name": "hwp2pdf",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "packageManager": "pnpm@8.15.0"
}
```

The root `package.json` declares the workspace membership and pins the package manager version. Setting `"private": true` prevents the root from being published to npm. ^[hwp2pdf-plan-v1.md:264-272]

### `pnpm-workspace.yaml`

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

The workspace file explicitly lists all directories that contain installable packages. This allows pnpm to resolve dependencies across packages efficiently. ^[hwp2pdf-plan-v1.md:274-278]

## Directory Structure

```
hwp2pdf/
├── apps/
│   ├── web/                    # Next.js frontend (Vercel)
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── api/                    # Cloud Run backend
│       ├── src/
│       ├── Dockerfile
│       ├── package.json
│       └── tsconfig.json
├── packages/
│   └── shared/                 # Shared TypeScript types
│       ├── src/
│       ├── package.json
│       └── tsconfig.json
├── pnpm-workspace.yaml
├── package.json
├── pnpm-lock.yaml
└── .npmrc
```

^[hwp2pdf-blueprint.md:133-162]

## Package Responsibilities

| Package | Purpose | Platform |
|---------|---------|----------|
| `apps/web` | Landing page, Dropzone UI, progress display, download link | Vercel (Next.js) |
| `apps/api` | File validation, job management, conversion, GCS integration | Google Cloud Run |
| `packages/shared` | [[shared-typescript-contracts|Shared TypeScript Contracts]], job status types, polling constants | Internal library |

^[hwp2pdf-blueprint.md:134-139]

## Build Order and Dependencies

The workspace enforces a specific build order due to dependency relationships:

1. **`packages/shared`** must be built first — it contains type definitions consumed by other packages
2. **`apps/web`** depends on `packages/shared` for API response types and job status enums
3. **`apps/api`** depends on `packages/shared` for the same shared contracts

When running `pnpm -r build` (recursive build), pnpm automatically respects this topological order. The workspace was verified on 2026-06-13 to successfully build `packages/shared` with `tsc`, then `apps/web` with `next build`. ^[agents.md:23]

### Dependency Graph

```
packages/shared (tsc)
       ↑
       │
  ┌────┴────┐
  │         │
apps/web  apps/api
(next.js)  (cloud run)
```

## Key Benefits

| Benefit | Description |
|---------|-------------|
| **Atomic changes** | Modifying shared types in one PR affects all consumers |
| **Single dependency tree** | No duplicate package versions across the monorepo |
| **Cross-package imports** | Direct imports between packages without publishing |
| **Consistent tooling** | Shared ESLint, TypeScript, and Prettier configurations |
| **Simplified testing** | End-to-end tests can exercise multiple packages in one run |

^[hwp2pdf-plan-v1.md:129-137]

## Filtered Commands

pnpm's `--filter` flag allows running scripts in specific packages without affecting others:

```bash
# Build only the web app
pnpm --filter web build

# Build only the API
pnpm --filter api build

# Build shared and its dependents
pnpm --filter @hwp2pdf/shared build
pnpm --filter "...@hwp2pdf/shared" build
```

^[hwp2pdf-plan-v1.md:769-773]

## Workspace Scripts

The root `package.json` typically declares dev, build, lint, typecheck, and test scripts that delegate to individual packages. However, these should only be documented as working after verifying the target package exists and contains the matching script definition. ^[agents.md:24]

---

## Sources

^[hwp2pdf-plan-v1.md:264-279] — Root package.json and pnpm-workspace.yaml configuration  
^[hwp2pdf-blueprint.md:133-162] — Project folder structure definition  
^[agents.md:23] — Build verification of `pnpm -r build` on 2026-06-13  
^[agents.md:24] — Script documentation verification requirement

---

## Related Concepts

- [[AGENTS.md Pattern]] — Documentation guidance for AI agents in this workspace
- [[@hwp2pdf/shared Package]] — The shared package providing TypeScript contracts
- [[Build verification requirement]] — Commands must be verified before use
- [[Cloud Run conversion backend]] — The API package running on Cloud Run
- [[Next.js Frontend]] — The web application package
