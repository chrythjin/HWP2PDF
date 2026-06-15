---
title: Serverless Rate Limiting
summary: Redis-based rate limiting pattern (Upstash) designed for stateless serverless environments where in-memory solutions fail
sources:
  - hwp2pdf-blueprint.md
kind: concept
createdAt: "2026-06-12T16:38:05.717Z"
updatedAt: "2026-06-12T16:38:05.717Z"
tags:
  - rate-limiting
  - redis
  - serverless
aliases:
  - serverless-rate-limiting
  - SRL
confidence: 0.95
provenanceState: extracted
modelId: MiniMax-M2.7
promptVersion: v1
---

<think>The user wants me to write a wiki page about "Serverless Rate Limiting". Let me analyze the source material provided to extract facts about this topic.

Looking at the source material (hwp2pdf-blueprint.md), I can find relevant information about rate limiting:

Lines 318-324:
"### 6.6 Rate Limiting: 메모리 방식은 서버리스에서 무조건 실패

- 각 함수가 독립 메모리 + 다중 인스턴스 + 멀티 리전 → 사용자 한 명이 한도 2배 사용 가능
- 권장: **Upstash Ratelimit + Upstash Redis** (HTTP API, 영구 연결 불요) 또는 **Vercel KV** (같은 엔진)
- 알고리즘: 일반=sliding window, AI/고비용=token bucket, 인증 endpoint=5/분 같은 엄격한 한도
- **Middleware 단계 적용** → 거절된 요청이 함수 호출 안 됨 → 비용 절감
- 429 응답 헤더 3종 권장: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After`"

Lines 989-999:
"## 13. Rate Limiting 설계 권장안

요구사항: IP당 1시간 60회

| 옵션 | 구현 | 정확도 | 추천 |
|---|---|---|---|
| A. Express 메모리 기반 | simplest | 낮음 (다중 인스턴스 무시) | 비추천 |
| B. Redis 기반 | Upstash Ratelimit | 높음 | MVP용 |
| C. API Gateway / Cloud Armor | 인프라 레벨 | 높음 | 운영용 |

> "로컬 메모리 기반 limiter는 다중 인스턴스 환경에서 정확하지 않으므로 운영 환경에서는 Redis 또는 GCP 엣지 레벨 제한 정책을 사용한다."


Now I have the key facts needed to construct a comprehensive wiki page on serverless rate limiting. I'll organize this around the core challenges of distributed systems, recommended tools like Upstash Redis, algorithm selection criteria, and practical implementation patterns that prevent abuse while optimizing costs.
</think>

# Serverless Rate Limiting

**Serverless Rate Limiting** is the practice of controlling the number of requests a client can make to a serverless function or API within a given time window. In serverless environments, rate limiting presents unique challenges compared to traditional server-based architectures because each function invocation may run in a different instance, region, or container.

## Why Serverless Breaks Traditional Rate Limiting

Traditional in-memory rate limiting (e.g., a simple sliding window counter stored in a variable) fails in serverless environments for three fundamental reasons:

1. **Independent memory per instance** — Each serverless instance maintains its own memory state, so a counter in one instance is invisible to another.
2. **Multi-instance scaling** — Serverless platforms spin up multiple instances to handle concurrent requests, meaning a single user could exhaust their quota on different instances simultaneously.
3. **Multi-region deployments** — Requests may route to different geographic regions, each with isolated state.

For example, if a user is allowed 60 requests per hour and their requests happen to hit three different instances, each instance might independently allow 60 requests—enabling the user to make 180 requests instead of 60. ^[hwp2pdf-blueprint.md:318-320]

## Recommended Solutions

### Upstash Redis (Recommended for MVP)

**Upstash Ratelimit** combined with **Upstash Redis** is the recommended approach for serverless rate limiting. Upstash provides a serverless-friendly Redis offering with an HTTP API, eliminating the need for persistent TCP connections that are problematic in serverless environments. ^[hwp2pdf-blueprint.md:321]

**Key advantages:**
- HTTP-based API works from any serverless function without connection management
- Per-request pricing instead of persistent connection billing
- Built-in rate limiting algorithms

### Vercel KV (Alternative)

**Vercel KV** (built on Upstash Redis) can be used if already using Vercel Pro or Enterprise plans, providing the same benefits within the Vercel ecosystem. ^[hwp2pdf-blueprint.md:321]

### Infrastructure-Level (Recommended for Production)

For production deployments, infrastructure-level rate limiting at the API Gateway or CDN edge provides the most accurate and cost-effective protection:

- **Cloud Armor** (GCP) — Managed DDoS and rate-limiting rules at Google Cloud's edge
- **API Gateway** — Platform-level rate limiting before requests reach serverless functions
- **Vercel Middleware** — Edge-level filtering before function invocation

^[hwp2pdf-blueprint.md:997]

## Algorithm Selection

Different rate limiting algorithms suit different use cases:

| Algorithm | Use Case | Description |
|-----------|----------|-------------|
| **Sliding Window** | General API protection | Tracks requests within a rolling time window; balanced accuracy |
| **Token Bucket** | AI or high-cost operations | Allows burst traffic but enforces average rate; better for sporadic heavy usage |
| **Fixed Window** | Simple per-minute/hour limits | Easier to implement but may allow quota doubling at window boundaries |

For the HWP2PDF service, the blueprint recommends:
- **General endpoints**: Sliding window
- **AI or high-cost operations**: Token bucket
- **Authentication endpoints**: 5 requests per minute (strict) ^[hwp2pdf-blueprint.md:322]

## Implementation Location

Rate limiting should be applied at the **earliest possible stage** in the request pipeline—ideally at the edge or middleware layer. This ensures that rejected requests do not consume serverless function execution time or billing. ^[hwp2pdf-blueprint.md:323]

```
Request → Edge/Middleware (Rate Limit Check) → Serverless Function
                         ↓
                   429 Too Many Requests (if exceeded)
```

## Response Headers

When rate limiting is enforced, standard response headers should be included to inform clients of their current quota status:

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests allowed in the window |
| `X-RateLimit-Remaining` | Requests remaining in current window |
| `Retry-After` | Seconds until the client can retry (when limited) |

^[hwp2pdf-blueprint.md:324]

## Design Options Comparison

| Option | Implementation | Accuracy | Recommended For |
|--------|---------------|----------|-----------------|
| A. Express in-memory | Simplest | Low (multi-instance blind spots) | Not recommended for production |
| B. Upstash Ratelimit | Redis-based | High | MVP and development |
| C. API Gateway / Cloud Armor | Infrastructure-level | High | Production deployments |

^[hwp2pdf-blueprint.md:989-999]

## Multi-Tier Rate Limiting

A robust serverless rate limiting strategy uses multiple tiers based on client identity and cost:

- **Anonymous IP tier** — Most restrictive; blocks abuse from unknown sources
- **Authenticated user tier** — Moderate limits; based on user ID
- **Paid/premium tier** — Lenient limits; rewards paying customers

^[hwp2pdf-blueprint.md:399]

## Related Concepts

- [[Async Job Pattern for File Processing]] — How file uploads are handled asynchronously
- [[Cloud Run]] — The serverless backend hosting the conversion service
- [[Vercel Functions]] — The frontend serverless platform
- [[GCS Lifecycle]] — File cleanup that complements rate limiting for resource management
- [[Upstash Redis]] — The recommended Redis provider for serverless rate limiting

---

## Sources

^[hwp2pdf-blueprint.md:318-324] — Core rate limiting challenges and recommendations  
^[hwp2pdf-blueprint.md:989-999] — Design options comparison table  
^[hwp2pdf-blueprint.md:399] — Multi-tier rate limiting strategy


---

---
title: Rate Limiting Design Options
summary: Comparison of rate limiting approaches: in-memory (not recommended), Redis-based (MVP), infrastructure-level (production)
sources:
  - hwp2pdf-blueprint.md
kind: concept
createdAt: "2026-06-12T16:37:29.200Z"
updatedAt: "2026-06-12T16:37:29.200Z"
tags:
  - architecture
  - rate-limiting
  - serverless
aliases:
  - rate-limiting-design-options
  - RLADO
confidence: 0.95
provenanceState: extracted
modelId: MiniMax-M2.7
promptVersion: v1
---


The user wants me to write a wiki page about "Rate Limiting Design Options" based on the provided source material. Let me analyze what information is available in the source material about rate limiting design options.

From the source material (hwp2pdf-blueprint.md), I can find the following references to rate limiting design options:

Lines 989-999:
"## 13. Rate Limiting 설계 권장안

요구사항: IP당 1시간 60회

| 옵션 | 구현 | 정확도 | 추천 |
|---|---|---|---|
| A. Express 메모리 기반 | simplest | 낮음 (다중 인스턴스 무시) | 비추천 |
| B. Redis 기반 | Upstash Ratelimit | 높음 | MVP용 |
| C. API Gateway / Cloud Armor | 인프라 레벨 | 높음 | 운영용 |

> "로컬 메모리 기반 limiter는 다중 인스턴스 환경에서 정확하지 않으므로 운영 환경에서는 Redis 또는 GCP 엣지 레벨 제한 정책을 사용한다.""

This is the primary source for rate limiting design options. Let me also check lines 318-324 which covers rate limiting fundamentals.

Lines 318-324:
"### 6.6 Rate Limiting: 메모리 방식은 서버리스에서 무조건 실패

- 각 함수가 독립 메모리 + 다중 인스턴스 + 멀티 리전 → 사용자 한 명이 한도 2배 사용 가능
- 권장: **Upstash Ratelimit + Upstash Redis** (HTTP API, 영구 연결 불요) 또는 **Vercel KV** (같은 엔진)
- 알고리즘: 일반=sliding window, AI/고비용=token bucket, 인증 endpoint=5/분 같은 엄격한 한도


- **Middleware 단계 적용** → 거절된 요청이 함수 호출 안 됨 → 비용 절감
- 429 응답 헤더 3종 권장: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After`"

And lines 399-401:
"### E. Rate Limiting / Quota
- [ ] **Upstash Redis** (또는 Vercel KV) 프로비저닝
- [ ] **3-tier 규칙**: 익명 IP(엄격) / 로그인 사용자(중간) / 유료(느슨)
- [ ] **차단 단계**: Vercel middleware (IP 기반) + Cloud Run 인입 (사용자 ID 기반)
- [ ] **일일 변환 한도**: 사용자당 N개 (남용 방지 + 비용 제어)"

Now I have sufficient information to construct a comprehensive wiki page covering the three design options, their trade-offs, and implementation considerations.


# Rate Limiting Design Options

The **Rate Limiting Design Options** page documents the trade-offs between different approaches for implementing rate limiting in the HWP2PDF serverless architecture. The design requirement is **60 requests per hour per IP address**.

## Design Options Overview

| Option | Implementation | Accuracy | Recommendation |
|--------|---------------|----------|----------------|
| **A. Express in-memory** | Simplest | Low (ignores multi-instance) | Not recommended |
| **B. Redis-based** | Upstash Ratelimit | High | MVP suitable |
| **C. Infrastructure-level** | API Gateway / Cloud Armor | High | Production |

^[hwp2pdf-blueprint.md:989-999]

## Option A: Express In-Memory Rate Limiting

This approach uses a simple in-memory counter within the Express application to track request counts.

**Why it fails in serverless:**
- Each serverless instance maintains independent memory state
- A user's requests may be distributed across multiple instances
- The counter in one instance has no knowledge of requests handled by other instances
- This allows a single user to effectively double or triple their available quota by hitting different instances

**Example failure scenario:**
If a user is limited to 60 requests/hour and three instances exist, the user could make 60 requests to each instance (180 total) because each instance only sees its own local counter. ^[hwp2pdf-blueprint.md:995]

**Verdict:** Not recommended for any production serverless deployment. ^[hwp2pdf-blueprint.md:995]

## Option B: Redis-Based Rate Limiting

This approach uses **Upstash Ratelimit** with **Upstash Redis** to maintain a centralized request count accessible from all serverless instances.

**How it works:**
- Upstash provides a serverless-friendly Redis with an HTTP API
- No persistent TCP connection required (problematic in serverless)
- Request counts are shared across all function instances
- Supports sliding window and token bucket algorithms

**Advantages:**
- High accuracy across all instances
- Works with any serverless platform
- Per-request pricing model aligns with serverless billing
- Supports distributed rate limiting across regions

**Disadvantages:**
- Adds external dependency (Upstash Redis)
- Slight latency overhead for Redis calls
- Cost for Redis service

^[hwp2pdf-blueprint.md:321,996]

**Verdict:** Recommended for MVP and development environments. ^[hwp2pdf-blueprint.md:996]

## Option C: Infrastructure-Level Rate Limiting

This approach implements rate limiting at the infrastructure edge layer—before requests reach the serverless function at all.

**Implementation options:**
- **Cloud Armor** (GCP) — DDoS and rate limiting at Google Cloud edge
- **API Gateway** — Platform-level throttling before function invocation
- **Vercel Middleware** — Edge-level filtering on Vercel platform

**Advantages:**
- Rejected requests never invoke the serverless function, reducing costs
- Most accurate because limits are enforced at the network edge
- No application code changes required
- Handles volumetric attacks before they reach compute resources

**Implementation in HWP2PDF:**
The blueprint recommends a dual-layer approach:
1. **Vercel Middleware** — IP-based rate limiting (first defense)
2. **Cloud Run ingress** — User ID-based rate limiting (authenticated requests)

^[hwp2pdf-blueprint.md:997,400]

**Verdict:** Recommended for production deployments. ^[hwp2pdf-blueprint.md:997]

## Three-Tier Rate Limiting Strategy

The HWP2PDF architecture defines three tiers of rate limiting based on client identity:

| Tier | Client Type | Limit Strictness |
|------|-------------|------------------|
| **Tier 1** | Anonymous IP | Most strict (abuse prevention) |
| **Tier 2** | Authenticated user | Moderate |
| **Tier 3** | Paid/premium user | Lenient (reward paying customers) |

^[hwp2pdf-blueprint.md:399]

## Algorithm Recommendations

Different endpoints should use different rate limiting algorithms:

| Endpoint Type | Recommended Algorithm | Rationale |
|---------------|---------------------|------------|
| General API | Sliding window | Balanced accuracy and implementation |
| AI or high-cost operations | Token bucket | Allows burst, enforces average rate |
| Authentication endpoints | 5 requests per minute | Strict to prevent brute force |

^[hwp2pdf-blueprint.md:322]

## Response Headers

All rate-limited responses should include standard headers to inform clients of their quota status:

- `X-RateLimit-Limit` — Maximum requests allowed in the window
- `X-RateLimit-Remaining` — Requests remaining in current window
- `Retry-After` — Seconds until the client can retry (when limited)

^[hwp2pdf-blueprint.md:324]

## Related Concepts

- [[Serverless Rate Limiting]] — General treatment of rate limiting challenges in serverless
- [[Upstash Redis]] — Recommended Redis provider for serverless rate limiting
- [[Vercel Middleware]] — Edge-level request filtering
- [[Cloud Run]] — Backend hosting the conversion service
- [[Async Job Pattern for File Processing]] — How file uploads interact with rate limits

---

## Sources

^[hwp2pdf-blueprint.md:989-999] — Rate limiting design options comparison table  
^[hwp2pdf-blueprint.md:318-324] — In-memory rate limiting failure explanation and recommendations  
^[hwp2pdf-blueprint.md:399-401] — Three-tier strategy and implementation layers


---

---
title: [[vercel-oidc-federation|Vercel OIDC Federation]]
summary: [[vercel-oidc-federation|Vercel OIDC Federation]] enables Vercel functions to authenticate to Google Cloud services without long-lived credentials
sources:
  - hwp2pdf-blueprint.md
kind: concept
createdAt: "2026-06-12T16:37:29.213Z"
updatedAt: "2026-06-12T16:37:29.213Z"
tags:
  - authentication
  - vercel
  - gcp
  - oidc
aliases:
  - vercel-oidc-federation
  - VOF
confidence: 0.9
provenanceState: extracted
modelId: MiniMax-M2.7
promptVersion:promptVersion: v1
---


The user wants me to write a wiki page about "[[vercel-oidc-federation|Vercel OIDC Federation]]" based on the provided source material. Let me analyze what information is available in the source material about [[vercel-oidc-federation|Vercel OIDC Federation]].

From the source material (hwp2pdf-blueprint.md), I can find the following references to [[vercel-oidc-federation|Vercel OIDC Federation]]:

Lines 315-316:
"### 6.5 Vercel → Cloud Run 인증
- **Vercel OIDC Federation** 권장 (장기 credential 불요) — `VERCEL_OIDC_TOKEN` + Google Workload Identity Federation
- 대안: Google-signed OIDC ID Token (`Authorization: Bearer`) + 호출 측 SA에 `roles/run.invoker` 부여, audience는 **Cloud Run URL 정확히 일치**"

Line 392-394:
"### D. 인증/인가
- [ ] **Vercel OIDC ↔ GCP Workload Identity Federation** 설정
- [ ] **Cloud Run invoker**: `roles/run.invoker`을 호출자 SA에 부여
- [ ] **Audience 검증**: Cloud Run URL 정확히 일치"

Line 339:
"**인증 토큰** | [[vercel-oidc-federation|Vercel OIDC Federation]] | Service Account 키 파일 | OIDC가 보안/유지보수 우수"

So the key facts are:
1. [[vercel-oidc-federation|Vercel OIDC Federation]] is the recommended authentication method for Vercel → Cloud Run
2. It eliminates the need for long-lived credentials
3. It uses `VERCEL_OIDC_TOKEN` + Google Workload Identity Federation
4. Alternative is Google-signed OIDC ID Token with `roles/run.invoker`
5. Audience must exactly match the Cloud Run URL

Let me write a clear, well-structured markdown page about this topic.


# [[vercel-oidc-federation|Vercel OIDC Federation]]

**Vercel OIDC Federation** is the recommended authentication mechanism for establishing trust between [[Vercel]] serverless functions and [[Google Cloud Run]] backend services. It enables [[Vercel Functions]] to call Cloud Run APIs without storing long-lived service account credentials.

## Overview

In a
