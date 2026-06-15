---
title: HWP2PDF Async Processing Flow
source: docs/superpowers/specs/HWP2PDF-Blueprint.md
sourceType: derived
splitFrom: sources/hwp2pdf-blueprint.md
splitReason: Reduce llm-wiki compile latency by isolating the async upload/job/status flow from the full blueprint.
ingestedAt: "2026-06-13T01:46:00Z"
---

# HWP2PDF Async Processing Flow

## Recommended processing model

Use an asynchronous job model instead of one blocking upload request.

## Flow

1. Upload request is accepted.
2. Backend creates a conversion job.
3. Conversion proceeds outside the user request lifecycle.
4. Frontend polls job status.
5. Backend exposes the finished PDF through a short-lived download path.

## Why async is preferred

- Better fit for serverless or Cloud Run execution limits.
- Progress UI becomes natural instead of fake or opaque.
- Retries, failures, and timeout handling are easier to manage.
- Long-running conversions do not keep one user-facing HTTP request open.

## Product implication

The shared contracts and UI should assume job creation plus status polling as the normal path, not one synchronous conversion response.
