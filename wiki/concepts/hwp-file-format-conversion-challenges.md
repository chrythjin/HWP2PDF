---
title: HWP File Format Conversion Challenges
summary: Technical complexity of HWP format conversion including v5.0 support issues, font dependencies, and quality verification requirements
sources:
  - hwp2pdf-blueprint.md
kind: concept
createdAt: "2026-06-12T16:38:42.946Z"
updatedAt: "2026-06-12T16:38:42.946Z"
tags:
  - hwp
  - document-conversion
  - compatibility
aliases:
  - hwp-file-format-conversion-challenges
  - HFFCC
confidence: 0.88
provenanceState: merged
modelId: MiniMax-M2.7
promptVersion: v1
---

<think>
The user wants me to write a wiki page about "HWP File Format Conversion Challenges". I need to analyze the source material to extract relevant facts about challenges related to HWP file format conversion.

Looking through the hwp2pdf-blueprint.md source, I can find several relevant pieces of information:

1. Lines 31-46: Discusses conversion method priority - specifically about HWP being difficult format
2. Lines 276-286: The biggest section about HWP→PDF conversion engine selection risks:
   - LibreOffice basic HWP filter only supports HWP v3.0, v5.0 (2010 release, current mainstream) has silent corruption bugs (tdf#70097)
   - [[h2orestart-extension|H2Orestart Extension]] (GPL-3.0, 180★, 2026-04 v0.7.12) is the real operational solution for HWP v5.0 + HWPX
   - Korean fonts required: fonts-nanum, fonts-noto-cjk, fonts-unfonts-core
   - HWPX (2014+, government recommended XML format) has "Excellent" preservation quality with LibreOffice + H2Orestart
   - Alternative libraries: @ohah/hwpjs, @ssabrojs/hwpxjs, @handoc/pdf-export, Aspose.PDF

3. Line 46: "HWP는 DOCX/PDF보다 훨씬 까다로운 포맷이라, 기술적으로 변환이 '된다 metropolis'와 서비스 품질이 '충분하다'는 다른 문제입니다." - HWP is much more difficult format than DOCX/PDF, technical conversion vs service quality are different problems

4. Lines 288-293: Vercel function size limits affecting HWP uploads
   - Hobby: 4.5MB, Pro: 6MB payload limit
   - HWP files can be tens to hundreds of MB with images
   - Direct upload not possible, recommended: presigned URL to GCS

5. Lines 295-306: Cloud Run + LibreOffice cold start issues
   - Cold starts are a critical bottleneck when converting HWP files, with startup and load times exceeding 60 seconds reported
   - Memory requirements are substantial - at least 2GiB needed, with some DOCX conversions consuming over 2GB
   - Listener mode solutions like unoserver or Gotenberg can address this, reducing CPU load by 50-75% and improving throughput 2-4x, though Gotenberg has health check complications in Cloud Run environments
   - LibreOffice 7.6.4+ has regressions affecting certain DOCX files, causing 100% CPU usage and timeouts
   - Container disk limitations and in-memory tmpfs create memory pressure that can trigger OOM conditions without proper cleanup

6. Lines 343-364: Operational risks
   - 🔴 HIGH: Conversion failure rates due to H2Orestart's community-driven nature; complex documents with tables, shapes, macros, or OLE objects may not convert properly
   - 🔴 HIGH: Cold start combined with conversion time creates a 30-60 second user experience bottleneck
   - 🔴 HIGH: Memory exhaustion from large HWP files with embedded images exceeding 2GB capacity
   - 🔴 HIGH: Incomplete multipart uploads in GCS without AbortIncompleteMultipartUpload rules lead to unexpected charges
   - 🟡 MEDIUM: Vercel's default single-region deployment causes latency for Korean users; Cloud Run's default max-instances=0 creates instance creation contention during traffic spikes; Vercel's maxDuration limit may be insufficient even at 800 seconds for Pro; LibreOffice version pinning needed due to regressions in 7.6.4+; cross-region Cloud Run to GCS communication incurs egress costs
   - 🟢 LOW: [[gcs-lifecycle-management|GCS Lifecycle Management]] delays up to 24 hours have minimal cost impact but require time for policy validation; HWPX zip-based XML inputs can be blocked through application/zip MIME detection

I should organize this into a structured wiki page covering HWP format challenges, technical limitations, and operational considerations.
</think>

# HWP File Format Conversion Challenges

The **HWP (Hangul Word Processor) file format** presents significant technical challenges for PDF conversion that distinguish it from more common document formats like DOCX or PDF. These challenges span compatibility limitations, rendering quality concerns, and operational complexity in cloud environments.

## Format Complexity

HWP is considerably more difficult to process than DOCX or PDF formats. A fundamental distinction exists between technical conversion capability and acceptable service-quality output—the two are separate problems that must both be solved for a viable product. HWP files can contain complex elements including tables, shapes, macros, and OLE objects that may not survive conversion intact. ^[hwp2pdf-blueprint.md:46]

## Conversion Engine Limitations

### LibreOffice Basic Filter

The built-in LibreOffice HWP filter has critical limitations:

- **HWP v3.0 only** — The basic filter officially supports only HWP version 3.0
- **Silent corruption on v5.0** — HWP v5.0 (released 2010, currently the mainstream version) suffers from silent corruption bugs that are documented in LibreOffice's bug tracker (`tdf#70097`)
- **No HWPX support in base filter** — The newer XML-based format requires additional tooling

^[hwp2pdf-blueprint.md:276-277]

### [[h2orestart-extension|H2Orestart Extension]]

The [[h2orestart-extension|H2Orestart Extension]] (GPL-3.0, v0.7.12 as of 2026-04) is the recognized operational solution for HWP v5.0 and HWPX conversion. It is installed via `unopkg add --shared` and invoked with the `--infilter="Hwp2002_File"` flag. However, this is a community-maintained extension, not an official solution, which introduces maintenance risk. ^[hwp2pdf-blueprint.md:277]

### Alternative Libraries

Several Node.js-based alternatives exist, though each has limitations:

| Library | Capabilities | Limitations |
|---------|--------------|--------------|
| `@ohah/hwpjs` | Rust core, `toPdf()` direct, HWP 5.0 + HWPX | Node 18+ required |
| `@ssabrojs/hwpxjs` | HWP 5.0 read, HWPX ↔ MD/HTML bidirectional | PDF requires separate step |
| `@handoc/pdf-export` | HTML → PDF via Playwright | Additional conversion layer |
| `Aspose.PDF for Node.js` | Commercial, WASM-based | Large bundle (170MB+), paid license |

^[hwp2pdf-blueprint.md:283-286]

## File Size Constraints

HWP files with embedded images commonly reach **tens to hundreds of megabytes**, creating immediate challenges:

- **Vercel function payload limits**: Hobby tier allows 4.5MB, Pro tier allows 6MB — insufficient for typical HWP files
- **Direct upload impossible** — Files must bypass the Vercel function body entirely using presigned URLs directly to GCS
- **Server Actions limitations**: Default 1MB limit, configurable up to 10-25MB via `serverActions.bodySizeLimit`

^[hwp2pdf-blueprint.md:288-293]

## Cloud Infrastructure Challenges

### Cold Start Bottleneck

LibreOffice starts, loads, and terminates for each request in stateless mode, creating **60+ second delays** on Cloud Run cold starts. This is a decisive performance bottleneck. Recommended memory allocation is minimum 2GiB, as a 90MB DOCX file consumed 2GB+ in Gotenberg testing. ^[hwp2pdf-blueprint.md:295-298]

**Mitigation strategies** include:

- **Listener mode** (unoserver or Gotenberg): Reduces CPU load 50-75% and improves throughput 2-4x
- **Gotenberg caveat**: Requires `--uno-listener-restart-threshold=0` flag due to Cloud Run health check conflicts
- **min-instances=1**: Keeps one instance warm at approximately $3.24/month in memory costs
- **Startup CPU Boost**: Provides 2x CPU for 10 seconds after a request arrives

^[hwp2pdf-blueprint.md:299-305]

### Memory Management

Container disk storage uses in-memory tmpfs, meaning disk writes consume memory. Without cleanup, this leads to OOM conditions. Additionally, **LibreOffice 7.6.4+ has regressions** causing 100% CPU usage and timeouts on certain DOCX files, necessitating explicit version pinning. ^[hwp2pdf-blueprint.md:302-303]

## Font Dependencies

Korean font packages are **required** for proper HWP rendering:

- `fonts-nanum` (OFL license)
- `fonts-noto-cjk` (OFL license)
- `fonts-unfonts-core` (OFL license)

All three are open-source and acceptable for commercial use. ^[hwp2pdf-blueprint.md:280]

## High-Risk Operational Concerns

Three high-severity risks require explicit mitigation:

1. **Conversion failure for complex documents**: H2Orestart is community-maintained; complex documents with tables, shapes, macros, or OLE objects may fail silently or corrupt. A fallback path is mandatory. ^[hwp2pdf-blueprint.md:347]

2. **User experience impact**: Cold start combined with conversion time can result in 30-60 second wait times. The async job queue pattern (Cloud Tasks/Pub/Sub) with polling or webhooks is necessary to decouple UX from processing time. ^[hwp2pdf-blueprint.md:348]

3. **Memory exhaustion**: Large HWP files with embedded images can exceed 2GB memory usage, triggering Cloud Run instance termination. Explicit memory limits and monitoring are required. ^[hwp2pdf-blueprint.md:349]

## GCS Cost Leakage

Incomplete multipart uploads generate ongoing storage charges if `AbortIncompleteMultipartUpload` lifecycle rules are not configured. This rule is easy to overlook but critical for cost control. ^[hwp2pdf-blueprint.md:350]

---

## Sources

^[hwp2pdf-blueprint.md:46] — HWP format complexity vs service quality distinction  
^[hwp2pdf-blueprint.md:276-286] — Conversion engine options and LibreOffice H2Orestart limitations  
^[hwp2pdf-blueprint.md:288-293] — File size constraints and Vercel upload limits  
^[hwp2pdf-blueprint.md:295-306] — Cold start challenges and mitigation strategies  
^[hwp2pdf-blueprint.md:347-350] — High-risk operational concerns  

---

## Related Concepts

- [[H2Orestart Extension]] — The community solution for HWP v5.0 support
- [[LibreOffice Headless Conversion]] — Technical approach for document conversion
- [[Async Job Pattern for File Processing]] — Recommended pattern for handling long conversions
- [[GCS Lifecycle Rules]] — Preventing cost leakage from incomplete uploads
- [[HWP File Upload Constraints]] — File validation before conversion
- [[Cloud Run Conversion Backend]] — Infrastructure for handling conversions
- [[Presigned URL Upload Pattern]] — Bypassing Vercel's size limits
