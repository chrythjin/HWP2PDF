---
title: llm-wiki Repository Structure
summary: Monorepo with pnpm workspace containing apps/* and packages/* directories for a wiki documentation system
sources:
  - 20260613-004620-llm-wiki-init.md
kind: concept
createdAt: "2026-06-12T16:19:23.733Z"
updatedAt: "2026-06-12T16:19:23.733Z"
tags:
  - documentation
  - repository
  - monorepo
aliases:
  - llm-wiki-repository-structure
  - LRS
confidence: 0.95
provenanceState: extracted
modelId: MiniMax-M2.7
promptVersion: v1
---

<think>
The user wants me to write a wiki page about the "llm-wiki Repository Structure" based on the provided source material. Let me analyze what I have:

1. From `20260613-004620-llm-wiki-init.md`, I can extract:
   - The repository uses pnpm workspaces with `apps/*` and `packages/*` patterns
   - Root `package.json` specifies pnpm, Node >=20, workspace scripts, and pnpm@8.15.0
   - `apps/web` is a Next.js frontend package named `web` using Next.js 16.2.9
   - `packages/shared` defines `@hwp2pdf/shared` and builds with `tsc`
   - `packages/shared/src/index.ts` centralizes various utilities
   - There's an `AGENTS.md` at root with guidance for OpenCode sessions
   - There's a `docs/INDEX.md` as the llm-wiki entry point
   - Session notes are stored under `docs/sessions/`
   - There's no root `README.md` (only `apps/web/README.md` which is default CRA)

I should write a clear, well-structured markdown page about the repository structure, citing the appropriate sources. I need to:
- Use the citation format `^[filename.md:START-END]`
- Include a Sources section at the end
- Suggest wikilinks to related concepts where appropriate
- Write in a neutral, informative tone
- Be concise but thorough
- Not cite YAML frontmatter lines

Let me structure this page:

1. Brief overview/introduction
2. Workspace configuration (pnpm-workspace.yaml)
3. Root configuration (package.json)
4. Apps directory (apps/web)
5. Packages directory (packages/shared)
6. Documentation structure
7. Sources

For related concepts, I could suggest:
- [[pnpm workspaces]]
- [[monorepo]]
- [[Next.js]] (for the web app)


- [[TypeScript]] (for the shared package)

Now I'll draft the page content.
</think>

# llm-wiki Repository Structure

The llm-wiki repository is organized as a [[pnpm workspaces|pnpm monorepo]], using a standard workspace pattern to manage multiple packages and applications from a single root.

## Workspace Configuration

The repository uses a pnpm workspace setup defined by `pnpm-workspace.yaml`. This configuration declares two workspace globs: `apps/*` and `packages/*`. All packages and applications within these directories are automatically linked and managed as part of the unified workspace. ^[20260613-004620-llm-wiki-init.md:20]

## Root Configuration

The root `package.json` establishes the foundational requirements for the project:

- **Package manager**: pnpm version 8.15.0 is specified
- **Node.js requirement**: Version 20 or higher
- **Workspace scripts**: Standard monorepo build and dev commands
- **Package manager field**: Explicitly declares `pnpm@8.15.0`

Note that the root `README.md` does not currently exist; only `apps/web/README.md` remains as the default Create Next App README. ^[20260613-004620-llm-wiki-init.md:21,25]

## Applications

### apps/web

The frontend application lives in `apps/web`. It is a [[Next.js]] application with the following characteristics:

- **Package name**: `web`
- **Next.js version**: 16.2.9
- **Purpose**: Serves as the main web interface for the wiki

Development and framework-specific guidance for this application can be found in `apps/web/AGENTS.md`, which should be consulted before making changes to Next.js-specific APIs. ^[20260613-004620-llm-wiki-init.md:22,34]

## Packages

### packages/shared

A shared library package resides in `packages/shared`. Key details:

- **Package name**: `@hwp2pdf/shared`
- **Build tool**: TypeScript compiler (`tsc`)
- **Entry point**: `packages/shared/src/index.ts`

The shared package centralizes several utilities including `.hwp` file upload validation (with a 20MB maximum size limit), job status types, API route definitions, and polling constants. ^[20260613-004620-llm-wiki-init.md:23-24]

## Documentation Structure

The repository maintains documentation under the `docs/` directory:

- **`docs/INDEX.md`**: The main entry point for llm-wiki documentation
- **`docs/sessions/`**: Contains session notes from development work

An `AGENTS.md` file at the repository root provides compact, verified guidance for future [[OpenCode]] sessions. ^[20260613-004620-llm-wiki-init.md:14,16]

## Building the Repository

To build all packages and applications in the workspace, run:

```bash
pnpm -r build
```

This command compiles `packages/shared` and builds `apps/web`. Both targets have been verified to pass successfully. ^[20260613-004620-llm-wiki-init.md:29]

## Backend Status

The repository currently lacks a dedicated backend package. The `AGENTS.md` guidance explicitly notes not to rely on an `api` root until an `apps/api` package or equivalent backend is verified to exist. ^[20260613-004620-llm-wiki-init.md:33]

---

## Sources

- [20260613-004620-llm-wiki-init.md](docs/sessions/20260613_004620_llm-wiki-init.md)
