---
title: Upstash Rate Limiting
summary: IP-based rate limiting using Upstash Redis sliding window algorithm, capped at 60 requests per hour with Retry-After headers on 429 responses
sources:
  - hwp2pdf-plan-v1.md
kind: concept
createdAt: "2026-06-12T16:38:39.925Z"
updatedAt: "2026-06-12T16:38:39.925Z"
tags:
  - security
  - rate-limiting
  - redis
aliases:
  - upstash-rate-limiting
  - URL
confidence: 0.95
provenanceState: extracted
modelId: MiniMax-M2.7
promptVersion: v1
---

<think>The user wants me to write a wiki page about "Upstash Rate Limiting". I need to analyze the source material provided to extract facts about this topic.

Looking at the source material, I can find information about Upstash Rate Limiting in the hwp2pdf-blueprint.md file:

Lines 989-999: Rate limiting design with Upstash Redis
Lines 622-655: Rate limiting service implementation with Upstash Redis
Lines 657-686: Rate limit middleware

Let me extract the key facts:

1. Upstash Redis is used for rate limiting (line 109 in the tech stack table and lines 989-999)
2. The rate limit is set to 60 requests per hour (line 34 in the plan)
3. The implementation uses @upstash/ratelimit package
4. It uses Redis for the sliding window limiter
5. Rate limit response includes headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
6. When rate limited, returns 429 status with Retry-After header
7. The rate limit service checks by identifier (IP-based)

Let me write a clear, well-structured markdown page about Upstash Rate Limiting, drawing facts only from the provided source material.
</think>

# Upstash Rate Limiting

**Upstash Rate Limiting** is the rate limiting solution implemented in the HWP2PDF service using Upstash Redis. It provides IP-based request throttling to protect the API from abuse, allowing a maximum of 60 requests per hour per IP address.

## Overview

Upstash is a serverless Redis provider that offers a REST API for Redis operations, making it suitable for serverless environments like Cloud Run where persistent connections are challenging. The HWP2PDF service uses Upstash Redis to implement a sliding window rate limiter that tracks and enforces request quotas per client IP address. ^[hwp2pdf-blueprint.md:989-999, hwp2pdf-plan-v1.md:34]

## Configuration

The rate limiting service is configured with the following parameters:

| Parameter | Value | Description |
|-----------|-------|-------------|
| **Limit** | 60 requests | Maximum requests allowed per window |
| **Window** | 3,600,000 ms (1 hour) | Time window for request counting |
| **Analytics** | Enabled | Tracks rate limit events for monitoring |

^[hwp2pdf-plan-v1.md:392-393]

## Implementation

### Service Setup

The rate limiting service initializes Upstash Redis using environment variables for the REST URL and token, then configures a sliding window limiter:

```typescript
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(
    parseInt(env.RATE_LIMIT_MAX),
    `${parseInt(env.RATE_LIMIT_WINDOW_MS)} ms`
  ),
  analytics: true,
});
```

^[hwp2pdf-plan-v1.md:630-642]

### Rate Limit Check

The `checkRateLimit` function evaluates whether a given identifier (IP address) has exceeded the configured limit:

```typescript
export async function checkRateLimit(
  identifier: string
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  const result = await ratelimit.limit(identifier);
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}
```

^[hwp2pdf-plan-v1.md:644-654]

## Middleware Integration

The rate limit check is implemented as Express middleware that runs on every request. The middleware extracts the client IP address as the identifier, then evaluates the rate limit. If the limit is exceeded, it returns a `429 Too Many Requests` response with a `Retry-After` header indicating when the client may retry. ^[hwp2pdf-plan-v1.md:657-686]

### Response Headers

Every API response includes rate limit metadata in the headers:

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests allowed in the window |
| `X-RateLimit-Remaining` | Requests remaining in current window |
| `X-RateLimit-Reset` | Unix timestamp when the window resets |

^[hwp2pdf-plan-v1.md:673-675]

### Rate Limited Response

When a client exceeds the limit, the API responds with HTTP 429 and a JSON error body:

```json
{
  "error": "Too Many Requests",
  "message": "1시간 동안 너무 많은 요청을 보냈습니다. 잠시 후 다시 시도해주세요."
}
```

The `Retry-After` header is set to the number of seconds until the window resets. ^[hwp2pdf-plan-v1.md:677-682]

## IP-Based Identification

The middleware uses the request IP address as the rate limiting identifier. In production deployments behind proxies or load balancers, the middleware should extract the real client IP from the `X-Forwarded-For` header rather than `req.socket.remoteAddress`, which would otherwise log the proxy server's IP. ^[hwp2pdf-plan-v1.md:667-668]

---

## Sources

^[hwp2pdf-blueprint.md:989-999] — Rate limiting design overview  
^[hwp2pdf-plan-v1.md:34] — Rate limit specification (60/hour)  
^[hwp2pdf-plan-v1.md:392-393] — Environment variable configuration  
^[hwp2pdf-plan-v1.md:630-642] — Service initialization code  
^[hwp2pdf-plan-v1.md:644-654] — Rate limit check function  
^[hwp2pdf-plan-v1.md:657-686] — Middleware implementation with headers and 429 response

---

## Related Concepts

- [[Asynchronous Job Pattern for File Processing]] — The pattern rate limiting protects
- [[Cloud Run Document Conversion Architecture]] — The backend service being rate protected
- [[GCS Lifecycle Policies]] — Cleanup mechanisms that work alongside rate limiting
- [[Async Job Processing]] — Job status tracking that rate limiting governs access to
- [[Rate Limiting for Async Jobs]] — Alternative or complementary rate limiting approach
