---
title: Session-Based Documentation
summary: Dated session notes in the sessions/ directory track completed implementation and documentation changes for future reference.
sources:
  - index.md
kind: concept
createdAt: "2026-06-12T16:40:09.064Z"
updatedAt: "2026-06-12T16:40:09.064Z"
tags:
  - documentation
  - version-control
  - process
aliases:
  - session-based-documentation
confidence: 0.85
provenanceState: extracted
modelId: MiniMax-M2.7
promptVersion: v1
---

<think>The user wants me to write a wiki page about "Session-Based Documentation". I need to analyze the source material provided to extract facts about this topic.

Looking at the source material, I see:
- `index.md` lines 17: "sessions/ - dated session notes for completed implementation or documentation changes."
- `index.md` lines 10: "This folder is the repo-local llm-wiki entry point for future OpenCode sessions. Prefer verified executable sources when these docs drift."
- `index.md` lines 24: "Backend conversion service: documented in the specs, but no `apps/api` package was found during this initialization pass."

Looking at the context from the AGENTS.md file (line 38):
- "After verifying successful changes, add a concise session note under `docs/sessions/YYYYMMDD_HHMMSS_<task-name>.md`"

This suggests that session-based documentation refers to adding dated session notes after completing implementation or documentation work. These are stored in a `sessions/` folder with a naming convention of `YYYYMMDD_HHMMSS_<task-name>.md`.

Let me write a clear, well-structured markdown page about "Session-Based Documentation" based on these facts.
</think>


# Session-Based Documentation

**Session-Based Documentation** is a practice in this repository where completed implementation or documentation work is recorded as dated session notes. These notes capture what was done, verified, and changed during a work session, providing a verifiable history of the project's evolution.

## Overview

Session notes are stored as markdown files in the `docs/sessions/` directory with a strict naming convention: `YYYYMMDD_HHMMSS_<task-name>.md`, where the timestamp reflects when the session began. This naming scheme ensures chronological ordering and easy retrieval of past sessions. ^[index.md:17, index.md:10]

## Purpose

Session-based documentation serves several important functions:

1. **Verification record** — Confirms that documented commands or processes were actually executed and succeeded
2. **Knowledge transfer** — Enables future sessions (human or AI) to understand what work was done and why
3. **Change tracking** — Provides a chronological log of project evolution without relying on git history interpretation
4. **Drift detection** — When paired with the principle of preferring "verified executable sources," these notes help identify when documentation has become outdated ^[index.md:10]

## Session Note Structure

A session note should be concise and capture the essential outcomes of the work session. The recommended structure includes:

| Section | Description |
|---------|-------------|
| Date/Time | When the session occurred |
| Task | Brief description of what was worked on |
| Actions taken | Commands executed, files modified |
| Results | What was verified as working |
| Outstanding issues | Known gaps or follow-up items |

## Relationship to AGENTS.md

The AGENTS.md file instructs agents to add a session note after verifying successful changes:

> "After verifying successful changes, add a concise session note under `docs/sessions/YYYYMMDD_HHMMSS_<task-name>.md`"

This creates a feedback loop where verification requirements ([[[build-verification-requirement|Build verification requirement]]]) are documented through session notes. ^[agents.md:38]

## Session Location in Docs Structure

In the wiki index, session notes are categorized as part of the verified repository knowledge:

```
docs/
├── INDEX.md              # Entry point for wiki
├── sessions/             # Session-based documentation
│   ├── 20260613_004620_llm-wiki-init.md
│   └── ...
```

The index entry for sessions is part of the "Start here" section, indicating that future OpenCode sessions should consult these notes for context on past work. ^[index.md:12-17]

---

## Sources

^[index.md:10] — Prefer verified executable sources when docs drift  
^[index.md:17] — Session notes directory and naming convention  
^[agents.md:38] — Agent instruction to add session notes after verification

---

## Related Concepts

- [[Build verification requirement]] — The practice of verifying commands before documenting them
- [[AGENTS.md Pattern]] — Agent operating guide that references session documentation
- [[Verified repository shape]] — Current state of the project structure
- [[Current known gaps]] — Documentation of outstanding work to be addressed
