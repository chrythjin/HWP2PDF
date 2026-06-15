---
title: Redis Job Queue System
summary: "Redis-based job state management with 2-hour TTL, tracking HWP-to-PDF conversion through states: UPLOADING → QUEUED → PROCESSING → COMPLETED/FAILED"
sources:
  - hwp2pdf-plan-v1.md
kind: concept
createdAt: "2026-06-12T16:38:25.159Z"
updatedAt: "2026-06-12T16:38:25.159Z"
tags:
  - redis
  - job-queue
  - async
aliases:
  - redis-job-queue-system
  - RJQS
confidence: 0.95
provenanceState: extracted
modelId: MiniMax-M2.7
promptVersion: v1
---

<think>The user wants me to write a wiki page about "Redis Job Queue System". I need to analyze the source material provided to extract facts about this topic.

Looking through the source material (hwp2pdf-blueprint.md), I can find information about Redis Job Queue System:

1. Lines 401-459: Job service with Redis-based implementation
   - Uses `ioredis` package
   - Job creation with `createJob()` function
   - Job retrieval with `getJob()` function
   - Job updates with `updateJob()` function
   - Job deletion with `deleteJob()` function
   - Uses `randomUUID()` for job IDs
   - JOB_TTL = 2 hours (60 * 60 * 2)
   - Redis key pattern: `job:{id}`

2. Lines 624-655: Rate limiting service with Upstash Redis
   - Uses `@upstash/ratelimit` package
   - Uses `@upstash/redis` package
   - Sliding window rate limiting
   - RATE_LIMIT_MAX and RATE_LIMIT_WINDOW_MS from env

3. Line 109: Redis (Upstash) mentioned in tech stack for Rate Limiting and Job status

4. Lines 33-34 in plan document: IP based Rate Limiting (1시간 60회)

5. Lines 182-183 in plan: Job creation/status API with Redis

Let me write a clear, well-structured markdown page about Redis Job Queue System that:
1. Draws facts only from the provided source material
2. Includes a ## Sources section at the end
3. Suggests wikilinks to related concepts where appropriate
4. Uses the citation format `^[filename.md:START-END]`
5. Is in a neutral, informative tone
6. Is concise but thorough
</think>

# Redis Job Queue System

The **Redis Job Queue System** is the job state management component of the HWP2PDF backend, using Redis as an in-memory data store to track the lifecycle of file conversion jobs. All job metadata—including status, timestamps, and download URLs—is stored in Redis with time-to-live (TTL) expiration for automatic cleanup.

## Overview

Job state management in the HWP2PDF architecture uses Redis to provide fast, persistent state tracking for asynchronous conversion jobs. Unlike traditional database-backed job queues, Redis offers sub-millisecond read/write performance ideal for the polling-based status checks performed by the frontend. Each job transitions through a defined set of states (`idle` → `uploading` → `queued` → `processing` → `completed`/`failed`/`expired`), with all state transitions persisted to Redis. ^[hwp2pdf-blueprint.md:401-408]

## Implementation

### Dependencies

The job service uses the `ioredis` package for Redis connectivity. The rate limiting service uses `@upstash/ratelimit` and `@upstash/redis` for serverless-compatible rate limiting. ^[hwp2pdf-blueprint.md:624-633]

### Job Data Structure

Jobs are stored as JSON strings with the key pattern `job:{uuid}`. The structure includes:

```typescript
interface Job {
  id: string;              // randomUUID
  status: JobStatus;       // Current state
  originalFilename: string;
  createdAt: Date;
  updatedAt: Date;
  downloadUrl?: string;    // Set on completion
  expiresAt?: Date;
  errorMessage?: string;    // Set on failure
}
```

^[hwp2pdf-blueprint.md:401-423]

### Core Operations

| Operation | Description | TTL |
|-----------|-------------|-----|
| `createJob()` | Creates a new job with `UPLOADING` status | 2 hours |
| `getJob()` | Retrieves job by ID, returns `null` if not found | — |
| `updateJob()` | Merges updates into existing job, refreshes TTL | 2 hours |
| `deleteJob()` | Immediately removes job from Redis | — |

^[hwp2pdf-blueprint.md:411-459]

### TTL Configuration

Jobs expire automatically after **2 hours** (7200 seconds). This TTL is applied on creation and refreshed on every update, ensuring that abandoned jobs (e.g., users who close the browser mid-conversion) are cleaned up without manual intervention. The TTL balance prevents Redis memory growth while allowing sufficient time for completed jobs to be downloaded before expiration. ^[hwp2pdf-blueprint.md:409]

```typescript
const JOB_TTL = 60 * 60 * 2; // 2 hours
```

^[hwp2pdf-blueprint.md:409]

## Job Status States

| Status | Description |
|--------|-------------|
| `idle` | Initial state, no file selected |
| `uploading` | File is being transmitted to storage |
| `queued` | Job is registered but conversion has not started |
| `processing` | Conversion is actively underway |
| `completed` | PDF is ready for download |
| `failed` | Conversion encountered an error |
| `expired` | Result file was deleted per lifecycle policy |

^[hwp2pdf-blueprint.md:260-268]

## Relationship to Rate Limiting

The same Redis instance used for job state also powers rate limiting. The rate limiter uses a sliding window algorithm to limit clients to **60 requests per hour** based on IP address. Both job operations and rate limiting share the Redis connection, reducing infrastructure costs. ^[hwp2pdf-blueprint.md:635-640]

## Architecture Notes

- **Single-process constraint**: The Cloud Run conversion worker runs with `concurrency=1` because LibreOffice is a single-process CPU consumer. This means only one conversion runs at a time per instance, making Redis-based job tracking sufficient without additional queue synchronization.
- **TTL-based cleanup**: Instead of a dedicated cleanup worker, expired jobs are automatically evicted by Redis TTL expiration. This simplifies operations but means completed job metadata is lost after the TTL window.
- **Upstash for serverless**: In production, the system uses Upstash Redis (serverless Redis with HTTP-based access) rather than a self-managed Redis instance, which better suits the Cloud Run serverless model. ^[hwp2pdf-blueprint.md:825,298-299,627-633]

---

## Sources

^[hwp2pdf-blueprint.md:260-268] — Job status state definitions  
^[hwp2pdf-blueprint.md:401-459] — Job service implementation with Redis CRUD operations  
^[hwp2pdf-blueprint.md:409] — JOB_TTL configuration (2 hours)  
^[hwp2pdf-blueprint.md:624-655] — Rate limiting service with Upstash Redis  
^[hwp2pdf-blueprint.md:825] — Cloud Run concurrency=1 configuration  
^[hwp2pdf-blueprint.md:298-299] — Memory requirements and single-process constraint

---

## Related Concepts

- [[Asynchronous Job Pattern for File Processing]] — The polling-based job lifecycle  
- [[Cloud Run Document Conversion Architecture]] — Backend infrastructure design  
- [[Rate Limiting for Async Jobs]] — IP-based request throttling  
- [[@hwp2pdf/shared Package]] — Shared TypeScript types for job status  
- [[GCS Lifecycle Policies]] — Automatic file cleanup for stored files  
- [[Cloud Run conversion backend]] — Backend service documentation
