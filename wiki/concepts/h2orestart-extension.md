---
title: H2Orestart Extension
summary: LibreOffice extension that enables HWP v5.0 file conversion by replacing the broken native HWP filter
sources:
  - hwp2pdf-blueprint.md
  - hwp2pdf-plan-v1.md
kind: concept
createdAt: "2026-06-12T16:37:28.676Z"
updatedAt: "2026-06-12T16:37:28.676Z"
tags:
  - document-conversion
  - libreoffice
  - hwp
aliases:
  - h2orestart-extension
confidence: 0.95
provenanceState: merged
modelId: MiniMax-M2.7
promptVersion: v1
---

<think>
The user wants me to write a wiki page about the "H2Orestart Extension" based on the provided source material. Let me analyze what information is available in the source material about H2Orestart.

From the source material (hwp2pdf-blueprint.md), I can find the following references to H2Orestart:

1. Line 36-37: "**1차 MVP**: LibreOffice 기반 (H2Orestart 확장 포함)"
2. Line 277: "**H2Orestart 확장**(ebandal/H2Orestart, GPL-3.0, 180★, 2026-04 v0.7.12 릴리즈)이 HWP v5.0 + HWPX 실제 운영 솔루션 — `unopkg add --shared`로 설치, `--infilter="Hwp2002_File"`로 호출"
3. Line 278: Source link to extensions.libreoffice.org
4. Line 279: Operational cases links
5. Line 281: HWPX preservation quality with LibreOffice + H2Orestart is reported as "Excellent"
6. Line 332: Architecture tradeoff table mentions "LibreOffice + H2Orestart (무료, GPL-3.0, v5.0/HWPX)"
7. Line 347: Risk item mentions "H2Orestart는 커뮤니티 확장으로, HWP v5.0 복잡 문서(표, 도형, 매크로, OLE 객체)에서 깨질 수 있음"
8. Line 370: Blueprint checklist mentions "엔진 선택: LibreOffice+H2Orestart (GPL-3.0 OK?)"
9. Line 383: "베이스 이미지: `node:20-bookworm-slim` + `libreoffice` + `fonts-*` + H2Orestart `.oxt`"


10. Line 852-855: Dockerfile uses H2Orestart extension

I now have enough factual information about H2Orestart to construct a comprehensive wiki page that covers its purpose, technical specifications, and operational considerations.
</think>

# H2Orestart Extension

The **H2Orestart Extension** (also written as **H2Orestart** or **H2O Restart**) is a community-developed [[LibreOffice]] extension that adds support for reading and converting HWP (Hangul Word Processor) files, particularly HWP v5.0 format, which the default LibreOffice HWP filter does not properly handle.

## Overview

H2Orestart is an open-source extension maintained by **ebandal** on [[GitHub]]. It was created to address the documented limitation where LibreOffice's built-in HWP filter only supports HWP v3.0 and suffers from silent corruption bugs when attempting to open HWP v5.0 files (the format standard released in 2010 and currently the mainstream version). ^[hwp2pdf-blueprint.md:277]

## Technical Details

| Attribute | Value |
|-----------|-------|
| **Repository** | ebandal/H2Orestart |
| **License** | GPL-3.0 |
| **GitHub Stars** | ~180 |
| **Latest Release** | v0.7.12 (April 2026) |
| **Extension Package** | `.oxt` format |

## Installation

The extension is installed into LibreOffice using the `unopkg` tool with the `--shared` flag, which makes it available to all users of the LibreOffice installation:

```bash
unopkg add --shared /path/to/H2Orestart.oxt
```

## Usage in HWP to PDF Conversion

When converting HWP files using LibreOffice headless mode, the H2Orestart extension is invoked by specifying the `Hwp2002_File` input filter:

```bash
soffice --headless \
  --infilter="Hwp2002_File" \
  --convert-to pdf \
  --outdir /output/directory \
  /path/to/document.hwp
```

This filter specification tells LibreOffice to use the H2Orestart handler rather than the built-in HWP filter when processing the file. ^[hwp2pdf-blueprint.md:277]

## Supported Formats

H2Orestart supports:

- **HWP v5.0** (binary format, 2010–present) — the primary target use case
- **HWPX** (XML-based format, 2014–present, government-recommended) — preservation quality rated as "Excellent (⭐⭐⭐⭐)"

## Limitations

H2Orestart is a community extension and has known limitations with complex document elements. The blueprint notes that HWP v5.0 documents containing **tables, shapes, macros, or OLE objects** may experience rendering issues or corruption during conversion. A fallback conversion path is recommended for production deployments. ^[hwp2pdf-blueprint.md:347]

## Integration in HWP2PDF

In the [[hwp2pdf-service-architecture|HWP2PDF Service Architecture]], H2Orestart is installed inside the [[Cloud Run]] converter container alongside LibreOffice and Korean font packages. The Dockerfile installs the extension as part of the image build process:

```dockerfile
RUN curl -L -o /tmp/h2orestart.oxt \
    "https://github.com/ebandal/H2Orestart/releases/download/v0.7.12/H2Orestart.oxt" \
    && unopkg add --shared /tmp/h2orestart.oxt \
    && rm /tmp/h2orestart.oxt
```

## Related Concepts

- [[LibreOffice Headless]] — The headless mode of LibreOffice used for server-side document conversion
- [[HWP File Format]] — The Korean word processor file format being converted
- [[Cloud Run]] — The Google Cloud Run serverless platform hosting the converter
- [[GCS Lifecycle]] — File lifecycle management for temporary storage
- [[HWP2PDF Blueprint]] — The architecture blueprint that specifies H2Orestart as the conversion solution

---

## Sources

^[hwp2pdf-blueprint.md:277] — H2Orestart technical details and version  
^[hwp2pdf-blueprint.md:278-279] — Source links for extension and operational cases  
^[hwp2pdf-blueprint.md:281] — HWPX preservation quality rating  
^[hwp2pdf-blueprint.md:347] — Known limitations with complex HWP documents  
^[hwp2pdf-blueprint.md:852-855] — Dockerfile installation steps
