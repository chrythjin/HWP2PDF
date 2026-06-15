---
title: INDEX
source: docs/INDEX.md
ingestedAt: "2026-06-12T16:03:25.994Z"
sourceType: file
---

# HWP2PDF llm-wiki Index

This folder is the repo-local llm-wiki entry point for future OpenCode sessions. Prefer verified executable sources when these docs drift.

## Start here

- `../AGENTS.md` - compact repo-specific operating guide for agents.
- `superpowers/specs/HWP2PDF-Blueprint.md` - original full product and architecture blueprint.
- `superpowers/specs/HWP2PDF-Plan-v1.md` - original full implementation plan.
- `../sources/blueprint-architecture-overview.md` - smaller llm-wiki source for the core deployment shape.
- `../sources/blueprint-conversion-strategy.md` - smaller llm-wiki source for engine decisions and quality caveats.
- `../sources/blueprint-async-processing-flow.md` - smaller llm-wiki source for the async job model.
- `../sources/blueprint-security-and-retention.md` - smaller llm-wiki source for security and lifecycle rules.
- `../sources/plan-scope-and-success-metrics.md` - smaller llm-wiki source for scope and KPIs.
- `../sources/plan-system-components.md` - smaller llm-wiki source for the main system pieces.
- `sessions/` - dated session notes for completed implementation or documentation changes.

## Verified repository shape

- Root package: pnpm workspace named `hwp2pdf`.
- Frontend: `apps/web`, package name `web`, Next.js 16.2.9.
- Shared package: `packages/shared`, package name `@hwp2pdf/shared`.
- Backend conversion service: documented in the specs, but no `apps/api` package was found during this initialization pass.

## Verified commands

- `pnpm -r build` passed on 2026-06-13.
- `pnpm --filter web build` and `pnpm --filter @hwp2pdf/shared build` are implied by the recursive build and package scripts, but re-run them directly before citing fresh status.

## Current known gaps

- Root `README.md` does not exist.
- `apps/web/README.md` is the default Create Next App README and is not a source of project-specific truth.
- Root scripts mention `api`, `typecheck`, and `test`, but the current discovered packages do not prove those scripts are usable across the workspace; verify before relying on them.
- Full llmwiki compile of the large original blueprint/plan sources proved too slow for normal interactive use, so smaller derived sources were added for future incremental compile runs.

