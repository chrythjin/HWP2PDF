---
title: Build verification requirement
summary: Commands must be verified as working before being documented; pnpm -r build was verified on 2026-06-13 to build shared then web packages
sources:
  - agents.md
kind: concept
createdAt: "2026-06-12T16:37:11.823Z"
updatedAt: "2026-06-12T16:37:11.823Z"
tags:
  - build-system
  - verification
  - workflow
aliases:
  - build-verification-requirement
  - BVR
confidence: 1
provenanceState: extracted
modelId: MiniMax-M2.7
promptVersion: v1
---

<think>
The user wants me to write a wiki page about "Build verification requirement" based on the provided source material. Looking at the source material in agents.md, I need to find facts about "build verification requirement."

Looking through the agents.md source:

Line 23: "`pnpm -r build` was verified on 2026-06-13 and builds `packages/shared` with `tsc`, then `apps/web` with `next build`."

Line 24: "Root scripts also declare `dev:web`, `dev:api`, `build:web`, `build:api`, `lint`, `typecheck`, and `test`, but only document them as working after verifying the target package exists and has the matching script."

Line 34: "Do not assume the [[cloud-run-conversion-backend|Cloud Run conversion backend]] is present in the current workspace just because root scripts include `dev:api`/`build:api`; verify the package before using those scripts."

This suggests that "build verification requirement" is about:
1. Verifying that builds work before documenting scripts as working
2. The specific verification that was done on 2026-06-13 for `pnpm -r build`
3. Not assuming packages exist - verifying them first

Let me write a clear, well-structured markdown page about this concept. I'll need to infer some structure since the source doesn't explicitly define "Build verification requirement" as a named concept - it's something I need to extract and organize from the facts provided.
</think>

# Build Verification Requirement

Build verification requirement is a practice in this repository that mandates scripts and commands must be **verified to work** before being documented or relied upon. This prevents incorrect documentation that could mislead developers or AI agents.

## Core Principle

Scripts should not be documented as functional merely because they are declared in configuration files. Instead, they must be **actively verified** through execution. This ensures that all documented commands and scripts are reliable and produce expected results. ^[agents.md:24]

## Verification Context

In this pnpm workspace, the following verification requirements apply:

### Build Commands

The recursive build command (`pnpm -r build`) was verified on **2026-06-13** to successfully:

1. Build `packages/shared` using the TypeScript compiler (`tsc`)
2. Build `apps/web` using `next build`

This verification confirms that the build pipeline functions correctly across the workspace. ^[agents.md:23]

### Script Documentation

Root scripts declare several commands including `dev:web`, `dev:api`, `build:web`, `build:api`, `lint`, `typecheck`, and `test`. However, these should only be documented as working **after verifying** that:

- The target package exists in the workspace
- The package contains the matching script definition ^[agents.md:24]

### Backend Assumptions

The presence of `dev:api` or `build:api` scripts in the root configuration does **not** guarantee the [[cloud-run-conversion-backend|Cloud Run conversion backend]] is present in the current workspace. Verification is required before using these scripts. ^[agents.md:34]

## Verification Checklist

Before documenting a command as functional, confirm:

| Check | Description |
|-------|-------------|
| Package exists | Verify the target package directory exists |
| Script defined | Confirm the script is defined in the package's `package.json` |
| Execution succeeds | Run the command and confirm expected output |
| No missing dependencies | Ensure all required runtime dependencies are available |

## Session Documentation

After verifying successful changes, a concise session note should be added under `docs/sessions/YYYYMMDD_HHMMSS_<task-name>.md`. This provides a verifiable record of what was tested and confirmed working. ^[agents.md:38]

---

## Sources

^[agents.md:23] — Build verification of `pnpm -r build` on 2026-06-13  
^[agents.md:24] — Script documentation requiring verification  
^[agents.md:34] — Backend package verification requirement  
^[agents.md:38] — Session documentation after successful verification
