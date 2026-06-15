---
title: HWP2PDF Scope and Success Metrics
source: docs/superpowers/specs/HWP2PDF-Plan-v1.md
sourceType: derived
splitFrom: sources/hwp2pdf-plan-v1.md
splitReason: Reduce llm-wiki compile latency by isolating project scope and success metrics into a smaller source.
ingestedAt: "2026-06-13T01:47:00Z"
---

# HWP2PDF Scope and Success Metrics

## Service vision

"설치 없이, 계정 없이, 3클릭 만에 HWP를 PDF로"

## In scope

- HWP `.hwp` to PDF conversion
- Single-file drag-and-drop upload
- Visible conversion progress/status
- Automatic deletion after 30 minutes
- Download via 15-minute signed URL
- IP-based rate limiting at 60 calls per hour

## Out of scope for the MVP

- HWPX support
- Multi-file batch conversion
- User accounts or login
- Permanent storage or document history
- Paid plans or credit systems
- Email or cloud-drive delivery flows

## Success criteria

- Conversion success rate at or above 95%
- Average warm conversion time at or below 60 seconds
- Page load target at or below 2 seconds LCP
- Upload-to-download dropout rate at or below 30%
- Operational availability at or above 99.5%
