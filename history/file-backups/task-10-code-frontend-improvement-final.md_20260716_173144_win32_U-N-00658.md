# Task 10 Evidence: Private Converter Service Separation Design

This file records the corrected baseline, the proposed target deployment contract, the independent review findings, and the approval-pending status for the separated converter service.

---

## 1. Corrected Baseline Configurations (2026-07-16)

### A. Environment Identifiers (Redacted)

The existing environment configurations are observed as follows:

- **GCP Project ID**: Registered via ADC or explicit environmental properties.
- **Queue Location / Region**: `asia-northeast3` (derived from configuration profiles).
- **Target Buckets**: `[GCS_BUCKET_NAME]` is used strictly with GCS objects prefixed under `staging/` and `output/`.
- **Primary API Target**: Serves on port `8080`.
- **Local Dev / Test Mode Fallback**: `CONVERSION_DISPATCHER=inline` and `JOB_STORE_BACKEND=memory` (used locally for vitest integration verification).
- **UBLA / PAP**: `UBLA=false`, `PAP=unset` on `[GCS_BUCKET_NAME]`; no public IAM binding observed.

### B. Baseline Code Structures Observed

1. **Dispatcher Engine**:
   - Implemented in `apps/api/src/services/cloud-tasks-dispatcher.ts`.
   - Uses lazy loading via `new Function("return import('@google-cloud/tasks')")()` to load client libraries only when in non-inline production mode.
   - Enqueues jobs to `projects/${gcsProjectId}/locations/${location}/queues/${queueName}` with automatic OIDC target email wrapping.
   - `createInternalWorkerUrl()` and `getWorkerAudience()` resolve from `INTERNAL_WORKER_URL` and `INTERNAL_WORKER_AUDIENCE`; when empty, they fall back to `INTERNAL_API_URL` or `http://localhost:${PORT}/internal/workers/convert`.

2. **OIDC Verification Engine**:
   - Implemented in `apps/api/src/middleware/worker-auth.ts` via `getOidcTokenVerifier` and `requireWorkerOidc` middleware.
   - Restricts ingress calls to verified Google OIDC issuers, matches expected audiences, and verifies service account email only when `CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL` is configured. `getExpectedServiceAccountEmail()` returns `null` for an empty value, so the current `requireWorkerOidc` skips email comparison in that case; current code is not independently fail-closed for a missing expected email.
   - The fallback to public API URL / localhost URL is **compatible with the current monolith** but is **not a private-converter readiness signal**.

3. **Internal Routing**:
   - Enforced on route `POST /internal/workers/convert` in `apps/api/src/routes/v1.ts` (lines 636–710).
   - Coordinates atomic compare-and-set claims through `claimQueuedJobForProcessing`.
   - Idempotent no-op for `processing`, `completed`, `failed`, `deleted`, `expired` jobs; returns 500 for retryable failures so Cloud Tasks retries.

### C. Current Deployment Wiring

- `.github/workflows/deploy-api-cloud-run.yml` deploys a **single Cloud Run service** (`hwp2pdf-api`) with `--allow-unauthenticated`.
- `INTERNAL_WORKER_URL` is explicitly set to `""` and `INTERNAL_WORKER_AUDIENCE` is left blank.
- `CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL` currently falls back to the same API runtime service account; this is the OIDC token subject in the target design, not the API runtime task creator.
- No separate `hwp2pdf-converter` service exists; the conversion engine still runs inside the public monolith. The IAM diff must therefore add `roles/cloudtasks.enqueuer` and `iam.serviceAccounts.actAs` on `api-dispatcher-sa` to `api-public-sa` in target state, not remove them.

---

## 2. Independent Review Request and Findings

We requested an independent **Critical/High Security and Operational Review** before deploying or starting T11.

### Original Focus Areas for Reviewers

1. **OIDC Handshake & Audience Verification**:
   - Ensure the OIDC audience resolution properly matches the target private URL without route-specific pathname mismatch risks during DNS translations.
2. **Least-Privilege Separation Verification**:
   - Verify that separating the API SA and the Converter SA completely removes the risk of compromised API nodes writing directly into execution profiles or modifying service configurations.
3. **Idempotent Lock Exclusivity**:
   - Ensure that the compare-and-set lock verified on Firestore is immune to race conditions under high concurrent HTTP queue dispatches.

### Corrected Review Outcome

The independent review returned:

- **Critical 1**: The current single public service with empty worker URL/audience was misread as a completed private-converter deployment. Corrected: this is the **current monolith**, not the target.
- **High 6**: Identity separation was insufficiently specified. The original evidence conflated the API runtime SA, the Cloud Tasks OIDC token SA, and the converter runtime SA. This document now explicitly defines three identities: the API runtime task creator (`api-public-sa` or Workload Identity), the Cloud Tasks OIDC token subject (`api-dispatcher-sa`), and the converter runtime (`api-converter-sa`). It also records the two independent `iam.serviceAccounts.actAs` grants required on `api-dispatcher-sa` (API runtime caller + Cloud Tasks primary service agent).
- **High 5**: Egress design was not pinned. The original evidence listed alternatives without selecting one. This document selects **all converter traffic forced through VPC/Direct VPC egress with firewall deny of public destinations, no general-purpose Cloud NAT, and GCS/Firestore/Google token access preserved via Private Google Access or restricted Google APIs route**. `PRIVATE_RANGES_ONLY` alone is explicitly rejected because it still leaves public-range traffic on the default Cloud Run egress path.
- **High 4**: No converter-only entrypoint or route allowlist was documented. Added: dedicated `server-converter.ts` or `CONVERTER_ONLY` env gate, with public routes returning 404.
- **High 3**: No pinned revision / image or target-only rollback procedure. Added: image-digest pinning, converter-only rollback, and HWP smoke test before traffic switch.
- **High 2**: No `/ready` readiness probe tied to LibreOffice warm-up. Added: `/ready` must fail until warm-up completes.
- **High 1**: Missing T11 preflight fail-closed conditions. Added: ten hard checks that must pass before public API is reconfigured to use the converter.
- **Medium 3**: IAM add/remove diff and UBLA/PAP/ACL compatibility not recorded. Added: current→target diff table, UBLA=true / PAP=enforced target, and IAM-only access. `roles/storage.objectAdmin` is documented as an interim role; prefix-restricted custom IAM role/condition feasibility is a staging validation target, not a design assertion.

### Remaining Blockers for T11

Even after this document remediation, the following gates remain **blocking** for T11:

1. **Independent re-review must return 0 Critical / 0 High** (read-only re-verification against this corrected ADR and evidence).
2. **Live staging evidence** is required for:
   - Cloud Tasks primary service agent `actAs` behavior in the target GCP project.
   - API runtime caller `actAs` on `api-dispatcher-sa` when calling `createTask`.
   - Converter ingress `Internal only` and `--no-allow-unauthenticated`.
   - All converter traffic forced through VPC/Direct VPC egress with firewall deny of public internet; GCS/Firestore/Google token endpoints reachable; `PRIVATE_RANGES_ONLY` alone is not accepted.
   - OIDC audience/issuer/email triple match, with `CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL` present on both Public API and converter, both values exactly equal to the full OIDC token subject email `api-dispatcher-sa@[PROJECT].iam.gserviceaccount.com`, and missing/mismatched values blocking cutover through startup/readiness or deployment preflight failure.
   - Converter-only public-route 404s.
   - `/ready` probe reflecting LibreOffice warm-up.
   - End-to-end HWP smoke test against a pinned converter revision.
3. **Explicit operator approval** must be recorded (signature/date field in ADR Section 10.2).

No T11 provisioning, deployment, IAM grant, or source/config change may proceed until all three gates are cleared.

---

## 3. Explicit Missing Gate & Resource Difference

At present, **no infrastructure changes have been executed**. No services have been created, modified, or deleted. The list below details the proposed infrastructure resources that are **Pending Operator Verification and Approval**:

### Proposed New Cloud Resources

1. **Cloud Run Service (`hwp2pdf-converter`)**: Private container hosting the separate LibreOffice engine with `Internal-Only` ingress and `--no-allow-unauthenticated`.
2. **Cloud Tasks Queue (`conversion-queue`)**: Task buffer with `max-concurrent-dispatches` capped at 1 and bounded retry attempts.
3. **Service Account (`api-dispatcher-sa`)**: Cloud Tasks OIDC token subject. Cloud Tasks acts as this SA (via `iam.serviceAccounts.actAs`) to mint the OIDC JWT; its email is configured in `oidcToken.serviceAccountEmail`. It does **not** run application code or call `createTask` directly.
4. **Service Account (`api-converter-sa`)**: Runtime service account attached to the `hwp2pdf-converter` Cloud Run service.

### Proposed IAM Policy Bindings (Target State)

- **Cloud Tasks primary service agent** (`service-PROJECT_NUMBER@gcp-sa-cloudtasks.iam.gserviceaccount.com`) → `roles/iam.serviceAccountUser` (or custom role with `iam.serviceAccounts.actAs`) **on SA `api-dispatcher-sa`**. Purpose: allow Cloud Tasks control plane to mint the OIDC JWT as `api-dispatcher-sa`.
- **API runtime caller** (`api-public-sa` or Workload Identity) → `roles/iam.serviceAccountUser` (or custom role with `iam.serviceAccounts.actAs`) **on SA `api-dispatcher-sa`**. Purpose: authorize the API runtime caller to set `oidcToken.serviceAccountEmail = api-dispatcher-sa` in `createTask`.
- **API runtime caller** (`api-public-sa` or Workload Identity) → `roles/cloudtasks.enqueuer` **on Queue `conversion-queue`**. Purpose: create HTTP target tasks.
- **Principal `api-dispatcher-sa`** → `roles/run.invoker` **on Cloud Run Service `hwp2pdf-converter`**. Purpose: invoke the internal-only converter Cloud Run service resource.
- **`api-public-sa`** → `roles/datastore.user` + `roles/storage.objectAdmin` (interim) + `roles/iam.serviceAccountTokenCreator` (self). Purpose: existing public API runtime permissions, tightened by removing any `roles/run.invoker`.
- **`api-converter-sa`** → `roles/datastore.user` + `roles/storage.objectAdmin` (interim). `storage.objectAdmin` is an interim role; prefix-restricted custom role or IAM condition feasibility is a staging IAM policy simulation target.

### Current → Target IAM / Resource Diff Summary
|---|---|---|---|---|
| Cloud Run `hwp2pdf-api` | Exists, `--allow-unauthenticated`, `INTERNAL_WORKER_URL=""` | Keep, reconfigure to `cloud-tasks` + converter URL/audience | Keep + reconfigure | Set `CONVERSION_DISPATCHER=inline` and clear worker URL/audience to restore monolith. |
| Cloud Run `hwp2pdf-converter` | Does not exist | Create with internal ingress, converter-only entrypoint | **Add** | Remove only after public API is already on `inline` fallback and queue drained. |
| Cloud Tasks queue `conversion-queue` | May exist (not created by current deployment) | Create with `max-concurrent-dispatches=1` | **Add** | Delete after public API no longer references it. |
| SA `api-public-sa` | Exists | Keep; in target topology add `roles/cloudtasks.enqueuer` on `conversion-queue` and `iam.serviceAccounts.actAs` on `api-dispatcher-sa` (via `roles/iam.serviceAccountUser` or custom); remove `run.invoker` if previously granted | Keep + reconfigure | Remove `cloudtasks.enqueuer` and `iam.serviceAccounts.actAs` on `api-dispatcher-sa` only if permanently returning to monolith inline mode. |
| SA `api-converter-sa` | Does not exist | Create with `datastore.user` + `storage.objectAdmin` (interim; prefix-restricted custom role/condition validated in staging) | **Add** | Remove after converter service deleted and jobs drained. |
| SA `api-dispatcher-sa` | Does not exist (fallback to API runtime SA) | Create; do **not** grant `cloudtasks.enqueuer`. Bind `roles/run.invoker` on `hwp2pdf-converter` Cloud Run service resource to this principal | **Add** | Remove after queue deleted and public API no longer uses Cloud Tasks. |
| Cloud Tasks service agent | Not needed in monolith | `roles/iam.serviceAccountUser` (or custom `iam.serviceAccounts.actAs`) on `api-dispatcher-sa` | **Add** | Remove when `api-dispatcher-sa` deleted. |
| GCS bucket `[GCS_BUCKET_NAME]` | Exists, UBLA=false, PAP unset | UBLA=true, PAP=enforced | Keep + harden | Rollback only if UBLA/PAP cause legitimate access failures. |

```
[ ] OPERATOR GATE: APPROVED TO PROCEED TO T11 IMPLEMENTATION AND PROVISIONING
Approved By: ___________________________
Date: __________________________________
```

---

## 4. T11 Preflight Fail-Closed Checklist (Staging)

The following must be verified in a live staging environment before production provisioning. If any check fails, the deployment must fail closed.

1. `INTERNAL_WORKER_URL` and `INTERNAL_WORKER_AUDIENCE` are non-empty and point to `hwp2pdf-converter`, not `hwp2pdf-api`.
2. `hwp2pdf-converter` ingress is `Internal only` and `--no-allow-unauthenticated` is set.
3. Direct internet request to `hwp2pdf-converter` URL returns `403` or connection error.
4. `CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL` is present on both Public API and `hwp2pdf-converter`; both values exactly equal `api-dispatcher-sa@[PROJECT].iam.gserviceaccount.com`, which is the OIDC token subject rather than `api-public-sa` (task creator) or `api-converter-sa` (converter runtime). Because the current `requireWorkerOidc` skips email comparison when the converter value is empty, a missing or unequal value must fail converter startup/readiness or an external deployment preflight and prohibit Public API cutover. A staging request must accept the expected email and reject a different email.
5. Both required `actAs` grants are present on `api-dispatcher-sa`:
   - Cloud Tasks primary service agent can mint an OIDC token as `api-dispatcher-sa`.
   - API runtime caller (`api-public-sa` or WIF) can call `createTask` with `oidcToken.serviceAccountEmail = api-dispatcher-sa`.
   Verified by a test task creation in staging.
6. Principal `api-dispatcher-sa` is bound to `roles/run.invoker` on the `hwp2pdf-converter` Cloud Run **service resource**.
7. `hwp2pdf-converter` egress forces all traffic through VPC/Direct VPC egress; firewall denies public internet destinations; GCS/Firestore/Google token endpoints remain reachable. `PRIVATE_RANGES_ONLY` alone is not accepted.
8. `hwp2pdf-converter` returns 404 for `/v1/upload`, `/v1/jobs/{jobId}`, `/v1/results/{fileName}`.
9. End-to-end HWP smoke test passes through public API → Cloud Tasks → converter → GCS/Firestore.
10. Public API fallback to `CONVERSION_DISPATCHER=inline` works without re-deploying the converter.

---

## 5. References

- ADR: `docs/architecture/adr/0001-private-converter-service-separation.md`
- Dispatcher code: `apps/api/src/services/cloud-tasks-dispatcher.ts`
- OIDC middleware: `apps/api/src/middleware/worker-auth.ts`
- Worker route: `apps/api/src/routes/v1.ts` lines 636–710
- Current deployment: `.github/workflows/deploy-api-cloud-run.yml`
- Container image: `apps/api/Dockerfile`
