---
title: HWP2PDF Conversion Strategy
source: docs/superpowers/specs/HWP2PDF-Blueprint.md
sourceType: derived
splitFrom: sources/hwp2pdf-blueprint.md
splitReason: Reduce llm-wiki compile latency by extracting conversion-engine decisions into an independent source.
ingestedAt: "2026-06-13T01:45:30Z"
---

# HWP2PDF Conversion Strategy

## Primary recommendation

- MVP conversion engine: LibreOffice headless CLI with H2Orestart extension support if needed.
- Fallback or later-stage adapter: Hancom API or another commercial engine if rendering quality is not good enough.

## Why LibreOffice is the MVP choice

- The team controls the runtime and deployment directly.
- The system does not depend on an external vendor for the first version.
- Engine failures and policy changes from a third party are less likely to block delivery.

## Required caution

- HWP rendering quality must be validated with real sample documents before treating LibreOffice as production-grade.
- “The file converts” and “the converted result is service quality” are different acceptance bars.
- If rendering quality is below the service threshold, the engine strategy must change without forcing a frontend rewrite.

## Operational implication

The conversion layer should stay behind a backend boundary so that LibreOffice, Hancom API, or another engine can be swapped later with minimal frontend impact.
