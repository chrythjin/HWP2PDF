---
title: Vercel OIDC Federation
summary: Identity federation pattern allowing Vercel deployments to authenticate to GCP services without long-lived credentials
sources:
  - hwp2pdf-blueprint.md
kind: concept
createdAt: "2026-06-12T16:37:47.572Z"
updatedAt: "2026-06-12T16:37:47.572Z"
tags:
  - authentication
  - vercel
  - gcp
  - security
aliases:
  - vercel-oidc-federation
  - VOF
confidence: 0.92
provenanceState: extracted
modelId: MiniMax-M2.7
promptVersion: v1
---

<think>The user wants me to write a wiki page about "Vercel OIDC Federation". Let me analyze the source material provided to extract facts about this topic.

Looking at the source material (hwp2pdf-blueprint.md), I can find relevant information about Vercel OIDC Federation:

Line 315: "**Vercel OIDC Federation** 권장 (장기 credential 불요) — `VERCEL_OIDC_TOKEN` + Google Workload Identity Federation"

Line 316: "대안: Google-signed OIDC ID Token (`Authorization: Bearer`) + 호출 측 SA에 `roles/run.invoker` 부여, audience는 **Cloud Run URL 정확히 일치**"

Line 392: "[ ] **Vercel OIDC ↔ GCP Workload Identity Federation** 설정"

Line 1038: "Vercel OIDC ↔ GCP: https://vercel.com/docs/oidc/gcp"

So I have these facts:
1. Vercel OIDC Federation is recommended for Vercel → Cloud Run authentication
2. It eliminates the need for long-term credentials
3. It uses `VERCEL_OIDC_TOKEN` + Google Workload Identity Federation
4. Alternative is Google-signed OIDC ID Token with `roles/run.invoker`
5. Audience must exactly match Cloud Run URL
6. Official docs at vercel.com/docs/oidc/gcp

Let me write a clear, well-structured markdown page about "Vercel OIDC Federation" that:
1. Draws facts only from the provided source material
2. Includes a ## Sources section at the end
3. Suggests wikilinks to related concepts where appropriate
4. Uses the citation format `^[filename.md:START-END]`
5. Is in a neutral, informative tone
6. Is concise but thorough
</think>

# Vercel OIDC Federation

**Vercel OIDC Federation** is the recommended authentication mechanism for establishing trust between a [[Vercel]] deployment (frontend) and a [[Google Cloud Run]] backend service. It enables secure, service-to-service communication without requiring long-lived static credentials.

## Overview

When a Next.js application running on Vercel needs to call a Cloud Run backend API, traditional approaches require managing Service Account key files as secrets. Vercel OIDC Federation eliminates this by using short-lived, automatically-rotated OIDC tokens instead. The mechanism leverages [[Google Workload Identity Federation]] to validate the token and grant the calling service access to Cloud Run. ^[hwp2pdf-blueprint.md:315]

## Key Benefits

| Benefit | Description |
|---------|-------------|
| **No long-term credentials** | Eliminates the need to store, rotate, or secure static Service Account key files |
| **Automatic rotation** | OIDC tokens are short-lived and automatically refreshed by Vercel |
| **Reduced attack surface** | Compromised tokens expire quickly, limiting window of exposure |
| **Simplified secret management** | Only the OIDC token environment variable (`VERCEL_OIDC_TOKEN`) is needed |

^[hwp2pdf-blueprint.md:315]

## Architecture

The authentication flow works as follows:

1. **Vercel generates token** — At runtime, Vercel automatically obtains an OIDC token bound to the deployment
2. **Token includes claims** — The token contains claims identifying the Vercel deployment (audience, project, deployment)
3. **Token sent to Cloud Run** — The frontend includes the token as a Bearer token in the `Authorization` header
4. **GCP validates token** — Google Cloud validates the OIDC token against the Workload Identity Federation configuration
5. **Access granted** — Upon successful validation, the calling service account receives the `roles/run.invoker` permission on the target Cloud Run service

^[hwp2pdf-blueprint.md:316]

## Required Configuration

### 1. Environment Variable

The Vercel deployment must have the `VERCEL_OIDC_TOKEN` environment variable available. This variable is automatically populated by Vercel when OIDC Federation is enabled for the project. ^[hwp2pdf-blueprint.md:315]

### 2. Audience Validation

When calling Cloud Run, the OIDC token's **audience claim must exactly match the Cloud Run service URL**. This is a critical security requirement — mismatched audiences will result in authentication failures. ^[hwp2pdf-blueprint.md:316]

### 3. Service Account Permissions

The calling identity (Vercel's federated identity) must be granted the `roles/run.invoker` role on the target Cloud Run service. This is typically done by:

1. Creating a Workload Identity Pool in Google Cloud
2. Configuring a Workload Identity Provider that trusts Vercel
3. Binding a Service Account with the `roles/run.invoker` role to the provider

^[hwp2pdf-blueprint.md:392-393]

## Alternative Approach

The blueprint documents an alternative using Google-signed OIDC ID Tokens directly. This approach requires:

- The calling service account to have `roles/run.invoker` permission
- The `Authorization: Bearer` header containing the Google-signed token
- Exact audience matching to the Cloud Run URL

This alternative is considered less preferred because it requires more manual token management compared to the Vercel OIDC Federation approach. ^[hwp2pdf-blueprint.md:316]

## Relationship to HWP2PDF Architecture

In the [[hwp2pdf-service-architecture|HWP2PDF Service Architecture]], Vercel OIDC Federation is the recommended mechanism for the Next.js frontend running on Vercel to securely call the [[cloud-run-conversion-backend|Cloud Run conversion backend]] API. This avoids storing Google Service Account key files as Vercel secrets and simplifies the authentication setup. ^[hwp2pdf-blueprint.md:315-316]

---

## Sources

^[hwp2pdf-blueprint.md:315] — Vercel OIDC Federation recommendation and mechanism  
^[hwp2pdf-blueprint.md:316] — Alternative approach and audience requirement  
^[hwp2pdf-blueprint.md:392-393] — Configuration checklist items  
^[hwp2pdf-blueprint.md:1038] — Official documentation reference

---

## Related Concepts

- [[Google Cloud Run]] — The backend service being invoked
- [[Workload Identity Federation]] — Google's identity federation mechanism used for token validation
- [[Vercel]] — The frontend hosting platform
- [[Cloud Run Service-to-Service Authentication]] — Related GCP authentication patterns
- [[HWP2PDF Blueprint]] — The architecture blueprint that specifies this authentication approach
