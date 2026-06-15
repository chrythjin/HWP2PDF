---
title: LibreOffice Headless Conversion
summary: Server-side document conversion using LibreOffice in headless mode with Korean locale support, UTF-8 encoding enforcement, and 3-minute timeout protection
sources:
  - hwp2pdf-plan-v1.md
kind: concept
createdAt: "2026-06-12T16:38:41.153Z"
updatedAt: "2026-06-12T16:38:41.153Z"
tags:
  - libreoffice
  - conversion
  - pdf
aliases:
  - libreoffice-headless-conversion
  - LHC
confidence: 0.95
provenanceState: extracted
modelId: MiniMax-M2.7
promptVersion: v1
---

<think>
The user wants me to write a wiki page about "LibreOffice Headless Conversion". I need to analyze the source material provided to extract facts about this topic.

Looking at the source material (hwp2pdf-blueprint.md), I can find information about LibreOffice Headless Conversion in various places:

1. Lines 276-281: [[h2orestart-extension|H2Orestart Extension]] for HWP v5.0 support
2. Lines 295-306: Cold start challenges and listener mode solution
3. Lines 382-388: Cloud Run service configuration
4. Lines 862-892: Conversion service implementation with LibreOffice commands
5. Line 103-104: LibreOffice version 7.6.x and H2Orestart mentioned in tech stack

Let me extract the key facts:

1. LibreOffice version 7.6.x is used (version pinned)
2. [[h2orestart-extension|H2Orestart Extension]] is needed for HWP v5.0 support
3. H2Orestart URL: https://github.com/ebandal/H2Orestart/releases/download/v0.7.12/H2Orestart.oxt
4. H2Orestart is installed via `unopkg add --shared`
5. `--infilter="Hwp2002_File"` parameter is used
6. LibreOffice is single-process CPU consumer
7. Cold start issues: 60+ seconds for fresh start
8. Listener mode (unoserver or Gotenberg) reduces CPU load by 50-75% and increases throughput 2-4x
9. Memory requirement: 2GiB minimum (a 90MB DOCX consumed over 2GB during conversion)
10. The conversion command uses: --headless, --nologo, --nofirststartwizard, --norestore, --user-profile-dir, --infilter="Hwp2002_File", --convert-to pdf:writer_pdf_Export:UTF8=1, --outdir


11. LibreOffice needs a user profile directory even in headless mode for temporary profile creation at /tmp/lo-profile-${jobId}, with Korean locale settings (LANG: ko_KR.UTF-8, LC_ALL: ko_KR.UTF-8) and a 3-minute timeout configured for the operation.
</think>

# LibreOffice Headless Conversion

**LibreOffice Headless Conversion** is the core engine used in the HWP2PDF service to transform HWP (Hangul Word Processor) files into PDF format. Running LibreOffice in headless mode allows server-side document conversion without requiring a graphical desktop environment or user interaction.

## Overview

LibreOffice is a free, open-source office suite that supports reading and converting numerous file formats, including the HWP format used extensively in Korean government and business environments. The "headless" mode enables LibreOffice to run as a background process without displaying any GUI, making it suitable for automated server-side workflows. The HWP2PDF service uses **LibreOffice 7.6.x** (with a pinned version) as the conversion engine, chosen for its GPL-3.0 licensing and native HWP support. ^[hwp2pdf-blueprint.md:103-104]

## HWP v5.0 Compatibility

HWP version 5.0 (the mainstream version released in 2010) presents compatibility challenges with LibreOffice's built-in HWP filter, which can cause silent corruption during conversion. To address this, the **H2Orestart extension** must be installed to provide proper HWP v5.0 compatibility. This extension is installed via the `unopkg add --shared` command and invoked with the `--infilter="Hwp2002_File"` parameter to activate the correct import filter. ^[hwp2pdf-blueprint.md:276-281]

The [[h2orestart-extension|H2Orestart Extension]] can be obtained from the project releases page at `https://github.com/ebandal/H2Orestart/releases/download/v0.7.12/H2Orestart.oxt`. ^[hwp2pdf-blueprint.md:852-854]

## Conversion Command

The conversion service executes LibreOffice with a series of flags optimized for server-side operation:

```bash
soffice \
  --headless \
  --nologo \
  --nofirststartwizard \
  --norestore \
  --user-profile-dir /tmp/lo-profile-${jobId} \
  --infilter="Hwp2002_File" \
  --convert-to pdf:writer_pdf_Export:UTF8=1 \
  --outdir /output/path \
  /input/file.hwp
```

| Flag | Purpose |
|------|---------|
| `--headless` | Runs without GUI display |
| `--nologo` | Suppresses the LibreOffice startup logo |
| `--nofirststartwizard` | Skips first-run configuration wizard |
| `--norestore` | Prevents restore prompt on abnormal termination |
| `--user-profile-dir` | Specifies isolated profile directory for each job |
| `--infilter="Hwp2002_File"` | Uses H2Orestart filter for HWP v5.0 support |
| `--convert-to pdf` | Converts input to PDF format |
| `--outdir` | Specifies output directory for converted file |

^[hwp2pdf-blueprint.md:503-517]

## Profile Directory Management

LibreOffice requires a user profile directory even in headless mode. The conversion service creates an isolated profile directory for each job at `/tmp/lo-profile-${jobId}` to prevent conflicts between concurrent conversions and to ensure clean state. This directory is cleaned up after conversion completes, even if the process fails. ^[hwp2pdf-blueprint.md:498-500,553-555]

## Locale Configuration

Korean locale settings are enforced via environment variables to ensure proper rendering of Korean text:

```typescript
env: {
  LANG: "ko_KR.UTF-8",
  LC_ALL: "ko_KR.UTF-8",
}
```

This configuration ensures that Korean characters are handled correctly throughout the conversion process. ^[hwp2pdf-blueprint.md:521-526]

## Resource Requirements

LibreOffice is a **single-process CPU consumer**, meaning that increasing concurrent conversions requires proportional memory allocation rather than CPU cores. The minimum recommended memory allocation is **2GiB** based on observed usage: a 90MB DOCX file was observed consuming over 2GB of memory during conversion. This memory requirement scales with document complexity, particularly for files with many embedded images or large image resolutions. ^[hwp2pdf-blueprint.md:298-299]

The service sets a timeout of **3 minutes** (180 seconds) for the conversion operation to prevent runaway processes from consuming resources indefinitely. ^[hwp2pdf-blueprint.md:519]

## Cold Start Challenges

LibreOffice starts fresh for each request when running in stateless mode on Cloud Run, causing cold starts of **60 seconds or more** before the first conversion can begin. This cold start penalty significantly impacts user experience and throughput. The recommended solution is to use **listener mode** with either unoserver (Python) or Gotenberg (Go), which keeps LibreOffice loaded in memory between requests. Listener mode has been shown to:

- **Reduce CPU load by 50-75%**
- **Increase throughput by 2-4x**

^[hwp2pdf-blueprint.md:295-306]

## Cloud Run Configuration

When deploying LibreOffice-based conversion on Cloud Run, specific configuration settings are required:

| Setting | Value | Rationale |
|---------|-------|-----------|
| `memory` | 2GiB | Handle large documents with embedded images |
| `concurrency` | 1 | Single-process LibreOffice requires serialized execution |
| `timeout` | 300-600s | Account for cold start delays (within 60-minute maximum) |
| `min-instances` | 1 | Prevent cold starts at ~$3.24/month memory cost |
| `Startup CPU Boost` | enabled | Doubles CPU for 10 seconds after request arrival |

^[hwp2pdf-blueprint.md:382-388,304-305]

## Container Installation

The Dockerfile installs LibreOffice along with Korean fonts to ensure proper rendering:

```dockerfile
RUN apt-get update && apt-get install -y \
    libreoffice \
    libreoffice-java-common \
    fonts-nanum \
    fonts-noto-cjk \
    fonts-unfonts-core \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*
```

The [[h2orestart-extension|H2Orestart Extension]] is then installed:

```dockerfile
RUN curl -L -o /tmp/h2orestart.oxt \
    "https://github.com/ebandal/H2Orestart/releases/download/v0.7.12/H2Orestart.oxt" \
    && unopkg add --shared /tmp/h2orestart.oxt \
    && rm /tmp/h2orestart.oxt
```

^[hwp2pdf-blueprint.md:841-855]

---

## Sources

^[hwp2pdf-blueprint.md:103-104] — LibreOffice version and H2Orestart in tech stack  
^[hwp2pdf-blueprint.md:276-281] — H2Orestart for HWP v5.0 compatibility  
^[hwp2pdf-blueprint.md:295-306] — Cold start challenges and listener mode solution  
^[hwp2pdf-blueprint.md:298-299] — Memory requirements observation  
^[hwp2pdf-blueprint.md:382-388] — Cloud Run service configuration  
^[hwp2pdf-blueprint.md:498-500] — Profile directory creation  
^[hwp2pdf-blueprint.md:503-517] — Full conversion command with flags  
^[hwp2pdf-blueprint.md:519] — Timeout configuration  
^[hwp2pdf-blueprint.md:521-526] — Korean locale configuration  
^[hwp2pdf-blueprint.md:553-555] — Profile directory cleanup  
^[hwp2pdf-blueprint.md:841-855] — Dockerfile installation commands

---

## Related Concepts

- [[HWP File Upload Constraints]] — File validation before conversion
- [[Async Job Pattern for File Processing]] — Job-based conversion workflow
- [[Cloud Run Document Conversion Architecture]] — Serverless container deployment
- [[Cloud Run conversion backend]] — Backend service handling conversion
- [[@hwp2pdf/shared Package]] — Shared types including polling constants
- [[Build verification requirement]] — Commands must be verified before use
