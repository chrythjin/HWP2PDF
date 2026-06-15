---
title: HWP2PDF Architecture Overview
source: docs/superpowers/specs/HWP2PDF-Blueprint.md
sourceType: derived
splitFrom: sources/hwp2pdf-blueprint.md
splitReason: Reduce llm-wiki compile latency by separating the large blueprint into smaller, domain-focused sources.
ingestedAt: "2026-06-13T01:45:00Z"
---

# HWP2PDF Architecture Overview

## Recommended architecture

- Frontend runs on Next.js/Vercel and owns the upload UX only.
- Actual HWP-to-PDF conversion runs in a dedicated Cloud Run API/worker.
- Uploaded originals and converted PDFs live in temporary Google Cloud Storage paths.
- Downloads are exposed through short-lived signed URLs or a proxy download route.
- Automatic deletion is enforced through GCS lifecycle rules rather than app-only cleanup logic.
- Rate limiting is handled separately at the API layer.

## Why this architecture is preferred

- Heavy document conversion does not run on Vercel.
- LibreOffice and other heavy binaries stay isolated in the Cloud Run container.
- Storage lifecycle policies provide stronger deletion guarantees than ad hoc cleanup code.
- Frontend and backend failures are easier to separate operationally.
- The frontend can stay mostly unchanged if the conversion engine changes later.

## Core flow

1. User uploads a `.hwp` file from the frontend.
2. Backend creates a job and returns a polling/status handle.
3. Source file is stored in temporary GCS storage.
4. Worker converts the document to PDF.
5. Result is stored temporarily and exposed through a short-lived download link.
6. Temporary files are cleaned up by storage lifecycle policy.
