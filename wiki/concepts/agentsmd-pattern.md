---
title: AGENTS.md Pattern
summary: Documentation file pattern for providing compact, verified guidance to AI coding agents at project root
sources:
  - 20260613-004620-llm-wiki-init.md
kind: concept
createdAt: "2026-06-12T16:19:24.528Z"
updatedAt: "2026-06-12T16:19:24.528Z"
tags:
  - documentation
  - ai-agents
  - best-practices
aliases:
  - agentsmd-pattern
confidence: 0.9
provenanceState: extracted
modelId: MiniMax-M2.7
promptVersion: v1
---

<think>
The user wants me to write a wiki page about the "AGENTS.md Pattern" based on the provided source material. Let me analyze what's in the source material to understand what this pattern is.

Looking at the source material (20260613-004620-llm-wiki-init.md), I can see:

1. Line 14 mentions: "Added root `AGENTS.md` with compact, verified guidance for future OpenCode sessions."
2. Line 34 mentions: "For frontend code changes, obey `apps/web/AGENTS.md`"

So the AGENTS.md pattern involves having AGENTS.md files that provide guidance for AI/LLM agents (like OpenCode) when working on code. These files are compact, verified guidance documents that help AI assistants understand how to work within a project or specific part of the codebase.

The pattern seems to be:
- Root-level AGENTS.md for overall project guidance
- Package/app-specific AGENTS.md for specific guidance (like apps/web/AGENTS.md)
- These files contain verified, compact guidance for AI sessions
- They help avoid AI making assumptions about project structure, versions, etc.

Let me write a clear, well-structured markdown page about this pattern.
</think>

# AGENTS.md Pattern

The **AGENTS.md Pattern** is a documentation convention that places dedicated guidance files within a codebase to help AI-powered coding assistants (such as [[OpenCode]]) work more effectively and accurately in a project.

## Overview

AGENTS.md files serve as compact, verified instruction sets for AI agents during development sessions. Unlike generic `README.md` files, which target human developers, AGENTS.md files are specifically designed to be consumed by LLM-based tools to understand project conventions, verified facts, and constraints. ^[20260613-004620-llm-wiki-init.md:14]

## Core Principles

### 1. Compact and Focused

AGENTS.md files contain only essential, verified information that an AI agent needs to avoid common pitfalls. They avoid verbose explanations and focus on actionable guidance that can be quickly parsed during a session.

### 2. Verified Accuracy

Information in AGENTS.md files should be actively verified against the codebase. Unlike assumptions or inferred knowledge, the facts presented in AGENTS.md are confirmed to be current and correct. This prevents AI agents from acting on outdated or incorrect information about package versions, workspace structure, or available APIs. ^[20260613-004620-llm-wiki-init.md:28-29]

### 3. Project-Specific Guidance

Each AGENTS.md file captures knowledge that is unique to its context—whether that is the entire repository root or a specific package within a monorepo. This allows for granular, layer-appropriate guidance. ^[20260613-004620-llm-wiki-init.md:34]

## Usage in Monorepos

In monorepo setups using pnpm workspaces (configured via `pnpm-workspace.yaml` to include `apps/*` and `packages/*`), the AGENTS.md pattern typically appears at multiple levels:

- **Root level**: Provides overarching project-wide facts and constraints, such as workspace structure, build systems, and package manager versions. ^[20260613-004620-llm-wiki-init.md:20-21]
- **Package level**: Contains guidance specific to a package, including framework versions, build commands, and framework-specific conventions. ^[20260613-004620-llm-wiki-init.md:22-24]

For example, an AI working on frontend changes would consult `apps/web/AGENTS.md` for Next.js-specific guidance, while understanding the broader project context from the root `AGENTS.md`. ^[20260613-004620-llm-wiki-init.md:34]

## Key Content Types

AGENTS.md files commonly document:

| Content Type | Purpose |
|--------------|---------|
| Verified dependency versions | Prevents version mismatches |
| Build and test commands | Ensures correct execution |
| Workspace structure | Clarifies project organization |
| Known constraints | Warns about unreliable or missing features |
| Framework conventions | Guides framework-specific code patterns |

## Relationship to Other Documentation

AGENTS.md is not a replacement for standard documentation. It complements `README.md` files (which remain for human onboarding) by providing an AI-optimized subset of the most critical facts needed for effective assistance during coding sessions. ^[20260613-004620-llm-wiki-init.md:25]

## Benefits

- **Reduces hallucinations**: AI agents make fewer incorrect assumptions about project structure or dependencies.
- **Improves context efficiency**: Agents can quickly access verified facts without extensive codebase exploration.
- **Maintains consistency**: Enforces project-specific patterns across AI-assisted development sessions.

---

## Sources

- [[20260613-004620-llm-wiki-init.md]] — Session notes documenting the creation of root and application-level AGENTS.md files.

---

## Related Concepts

- [[Monorepo Documentation]]
- [[LLM-Assisted Development]]
- [[OpenCode]]
- [[pnpm Workspaces]]
