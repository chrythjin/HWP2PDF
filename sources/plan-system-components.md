---
title: HWP2PDF System Components
source: docs/superpowers/specs/HWP2PDF-Plan-v1.md
sourceType: derived
splitFrom: sources/hwp2pdf-plan-v1.md
splitReason: Reduce llm-wiki compile latency by separating the system-component map from the full implementation plan.
ingestedAt: "2026-06-13T01:47:30Z"
---

# HWP2PDF System Components

## Frontend

- Next.js frontend on Vercel
- Single-page upload flow
- Progress/status UI
- Final download action

## API layer

- Issues presigned upload URLs
- Validates uploads
- Creates jobs
- Exposes job status
- Applies rate limiting

## Storage layer

- Temporary GCS storage for originals and results
- Separate logical paths for source uploads and converted outputs
- Lifecycle-based deletion after the retention window

## Conversion worker

- Pulls or receives work for a pending conversion job
- Executes the HWP-to-PDF engine
- Writes the result PDF back to temporary storage
- Updates job status for the frontend

## Operational dependencies

- Monitoring for failure rate and conversion latency
- Timeout and retry policy around the conversion worker
- Clear boundary between frontend UX and backend conversion engine
