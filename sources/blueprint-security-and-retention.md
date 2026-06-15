---
title: HWP2PDF Security and Retention Requirements
source: docs/superpowers/specs/HWP2PDF-Blueprint.md
sourceType: derived
splitFrom: sources/hwp2pdf-blueprint.md
splitReason: Reduce llm-wiki compile latency by separating security and storage-retention rules into a smaller source.
ingestedAt: "2026-06-13T01:46:30Z"
---

# HWP2PDF Security and Retention Requirements

## File restrictions

- MVP accepts `.hwp` files only.
- One file at a time.
- Maximum upload size is 20MB.
- Block compressed archives, executables, and suspicious multi-extension uploads.
- Validate using extension, MIME type, and magic number where feasible.

## Storage safety

- Do not store the original client filename as the object key.
- Use UUID-based object keys.
- Keep the GCS bucket private.
- Keep upload originals and generated PDFs only in temporary storage.

## Download safety

- Use short-lived signed URLs or a proxy download path.
- Signed download TTL target is 15 minutes.

## Deletion model

- Target retention for originals and results is 30 minutes.
- Enforce deletion through GCS lifecycle rules rather than app-only cleanup.
- Container-local temporary files should also be deleted immediately after conversion.

## Runtime hardening

- Limit execution time for conversion.
- Run the conversion container with minimal privileges.
- Prefer non-root execution.
- Minimize logging of original filenames or sensitive filesystem paths.
