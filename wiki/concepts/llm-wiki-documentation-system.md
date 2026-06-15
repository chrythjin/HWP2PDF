---
title: llm-wiki Documentation System
summary: A repo-local wiki entry point for OpenCode sessions, organized with compact operating guides, blueprints, and session notes.
sources:
  - index.md
kind: concept
createdAt: "2026-06-12T16:39:11.814Z"
updatedAt: "2026-06-12T16:39:11.814Z"
tags:
  - documentation
  - knowledge-management
  - opencode
aliases:
  - llm-wiki-documentation-system
  - LDS
confidence: 0.95
provenanceState: extracted
modelId: MiniMax-M2.7
promptVersion: v1
---

<think>
The user wants me to write a wiki page about the "llm-wiki Documentation System" based on the source material provided. Looking at the source material (index.md), I can extract facts about what llm-wiki is and how it works in this repository.

Let me analyze the source material:

1. Line 1-6: Frontmatter with title, source, and metadata
2. Line 10: "This folder is the repo-local llm-wiki entry point for future OpenCode sessions"
3. Line 14-17: References to AGENTS.md, specs, and sessions folder
4. Line 20-24: "Verified repository shape" - describes the workspace structure
5. Line 26-29: "Verified commands" - commands that have been verified to work
6. Line 31-35: "Current known gaps" - things that don't exist yet

So llm-wiki is a documentation system that:
- Is repo-local (lives within the repository)
- Serves as an entry point for OpenCode sessions
- Contains verified facts about the repository
- Is organized with an INDEX.md as the entry point
- Has a specific folder structure (sessions/, specs/)

I should write a clear, well-structured markdown page about this system.
</think>

# llm-wiki Documentation System

**llm-wiki** is a repository-local documentation system designed to provide compact, verified guidance for AI coding assistants (such as [[OpenCode]]) during development sessions. Unlike traditional documentation that targets human developers, llm-wiki is structured for efficient consumption by LLM-based tools.

## Overview

The llm-wiki system serves as the "entry point" for future [[OpenCode]] sessions, providing a centralized location where AI agents can find verified facts about the repository structure, working commands, and current implementation state. This approach reduces the time an AI spends exploring a codebase to understand its conventions and constraints. ^[index.md:10]

The system is self-referential — the documentation lives within the repository it describes, making it naturally version-controlled alongside the codebase it documents.

## Index Structure

The primary entry point is `docs/INDEX.md`, which organizes documentation into logical sections:

### Start Here

- `../AGENTS.md` — Compact, repo-specific operating guide for AI agents
- `superpowers/specs/HWP2PDF-Blueprint.md` — Product and architecture blueprint
- `superpowers/specs/HWP2PDF-Plan-v1.md` — Detailed implementation plan
- `sessions/` — Dated session notes for completed implementation or documentation changes

^[index.md:12-17]

### Verified Repository Shape

This section documents the confirmed structure of the pnpm workspace:

- **Root package**: pnpm workspace named `hwp2pdf`
- **Frontend**: `apps/web`, package name `web`, Next.js 16.2.9
- **Shared package**: `packages/shared`, package name `@hwp2pdf/shared`
- **Backend**: Conversion service documented in specs, but no `apps/api` package exists yet

^[index.md:20-24]

### Verified Commands

Commands in this section have been **actively tested** and confirmed to work:

- `pnpm -r build` — Verified working on 2026-06-13
- `pnpm --filter web build` and `pnpm --filter @hwp2pdf/shared build` — Implied by recursive build

^[index.md:26-29]

### Current Known Gaps

This section explicitly documents what **does not yet exist**, helping AI agents avoid assuming non-existent resources:

- Root `README.md` does not exist
- `apps/web/README.md` is the default Create Next App README, not project-specific
- Root scripts mention `api`, `typecheck`, and `test`, but these have not been verified across the workspace

^[index.md:31-35]

## Session Documentation

Dated session notes under `docs/sessions/` capture completed implementation work and documentation changes. These provide a historical record of verification work, allowing future agents to understand how the current state was reached. ^[index.md:17]

## Relationship to AGENTS.md

The `AGENTS.md` file at the repository root provides direct guidance for AI agents, complementing the more detailed documentation in `docs/`. While `AGENTS.md` is compact and agent-optimized, `docs/` contains richer background and planning context. Together, they form a two-tier documentation system:

| File | Purpose | Audience |
|------|---------|----------|
| `AGENTS.md` | Compact, verified operating guide | AI agents (OpenCode) |
| `docs/INDEX.md` | Entry point and navigation hub | AI agents and humans |
| `docs/sessions/` | Historical verification records | Humans (auditing) |
| `docs/superpowers/specs/` | Detailed plans and blueprints | Humans (planning) |

## Benefits

- **Reduced exploration time** — AI agents can read verified facts rather than inferring them
- **Self-documenting verification** — Commands are tested before being documented as working
- **Explicit gap awareness** — The system clearly marks what does not exist to prevent AI hallucination
- **Version-controlled context** — Documentation evolves alongside the codebase

---

## Sources

^[index.md:10] — llm-wiki as repo-local entry point for OpenCode sessions  
^[index.md:12-17] — Index structure and key navigation links  
^[index.md:20-24] — Verified repository shape  
^[index.md:26-29] — Verified commands section  
^[index.md:31-35] — Known gaps and non-verified items

---

## Related Concepts

- [[AGENTS.md Pattern]] — The compact guidance format for AI agents
- [[OpenCode]] — The AI coding assistant that consumes this documentation
- [[pnpm Workspace Configuration]] — The workspace structure documented by llm-wiki
- [[Build verification requirement]] — The practice of verifying commands before documenting them
