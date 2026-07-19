# ADR-0001: Private Converter Service Separation and Deployment Contract

**Date**: 2026-07-13 (updated 2026-07-18 baseline correction)
**Status**: proposed
**Deciders**: Sisyphus-Junior (OhMyOpenCode Agent), Operator, Technical Stakeholders

---

## 1. Context

### 1.1 Current State (Read-Only Baseline, 2026-07-17)

The following is an observation of the checked-in workflow and read-only staging state. It is not an approval or deployment completion claim.

- **Checked-in deployment wiring**: `.github/workflows/deploy-api-cloud-run.yml` deploys a single Cloud Run service, `hwp2pdf-api`, in `asia-northeast3` with `--allow-unauthenticated`. The workflow sets `CONVERSION_DISPATCHER=cloud-tasks`, `CLOUD_TASKS_QUEUE_NAME`, `CLOUD_TASKS_LOCATION`, and `CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL` using the API runtime service account. The workflow explicitly sets `INTERNAL_WORKER_URL=""` and sets `INTERNAL_WORKER_AUDIENCE` from a secret with an empty fallback, so the checked-in workflow alone does **not** configure a non-empty/equal public-monolith worker target.
- **Runtime effect (observed separately)**: A read-only deployed staging runtime observation (2026-07-17) found `INTERNAL_WORKER_URL` and `INTERNAL_WORKER_AUDIENCE` non-empty and equal, and that they point back to the public `hwp2pdf-api` service rather than to a separate converter. That observation confirms the current topology is a single public monolith, not a separated converter deployment. The source of the runtime/workflow difference was not determined by this read-only review; both records are retained as separate evidence layers.
- **Staging observation (read-only, 2026-07-17)**: Exactly one public API Cloud Run service exists. No `hwp2pdf-converter` service exists. A Cloud Tasks queue exists and is `RUNNING`; Cloud Scheduler state is observed separately in T5/T6 evidence. The existence of the queue does not change the baseline: the current worker target is still the public monolith.
- **Identity boundary**: The current API runtime service account is also used as `CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL`. This is the existing single-identity monolith fallback, not the target three-identity separation (`api-public-sa` task creator, `api-dispatcher-sa` OIDC token subject, `api-converter-sa` runtime).
- **What the wiring presence does not mean**: The existence of queue/OIDC environment variables and the Cloud Tasks dispatcher code path does not imply that a dedicated dispatcher identity, a private converter service, private ingress, or restricted egress are live. Those remain target/proposed for T11.

### 1.2 Problem Statement

The coupled runtime has the following architectural deficiencies:

- **Security Boundary Violation**: The public Express API handler and the high-risk, heavy conversion engine (executing untrusted binaries and processing complex, potentially poisoned binary format parser input) share the same execution context, network namespace, and service identity.
- **Resource Inefficiency**: Scaling API traffic forces scaling the large, cold-starting LibreOffice binary layer. Similarly, deep conversion load directly competes with public API HTTP handler request cycles.
- **Compliance Boundaries**: The GPL-3.0 licensed extension (H2Orestart) is distributed inside the same public endpoint's container. Although handled securely, isolation under a private boundary simplifies distribution compliance.

### 1.3 Goal of this ADR

This ADR records the **target deployment contract** for separating the conversion engine into a **private, ingress-locked converter service** that accepts tasks solely via Cloud Tasks-dispatched OIDC-authenticated internal worker HTTP targets. It does **not** approve, implement, or deploy any resources. Approval and provisioning are gated for T11.

---

## 2. Target Architecture & Data Flow

### 2.1 Target Topology vs. Current Topology

| Aspect | Current State (single public monolith) | Target State (separated) |
|---|---|---|
| Cloud Run services | One: `hwp2pdf-api` | Two: `hwp2pdf-api` (public) + `hwp2pdf-converter` (private) |
| Ingress | `All`, `--allow-unauthenticated` | Public: `All` with IAP/Cloud Armor outside scope; Converter: `Internal only` |
| Converter endpoint | Runs inside public service, reachable from internet with OIDC only | Runs only inside private service, unreachable from internet |
| Task creator identity | Same as API runtime SA (fallback) | API runtime task creator (`api-public-sa` or Workload Identity) |
| OIDC token source | API runtime SA or Cloud Tasks fallback | `api-dispatcher-sa` via Cloud Tasks queue |
| Egress | Unrestricted internet via Cloud Run default | Converter: all traffic forced through VPC/Direct VPC egress with firewall deny of public internet; GCS/Firestore/Google token access preserved via Private Google Access or restricted Google APIs route (project feasibility validated in staging) |
| Service account per role | One SA does API + enqueue + convert | Three distinct identities (see Section 3) |

### 2.2 Target Data Flow

```
+-----------------------------------------------------------------------------------------------------------------+
|                                           GCP Trust Boundary                                                    |
+-----------------------------------------------------------------------------------------------------------------+
|                                                                                                                 |
|  +-------------------+           +-----------------------+           +-------------------------+                |
|  |                   | 1. Upload |  Google Cloud Tasks   | 2. OIDC |   Private Converter       |                |
|  |   Public API      |--------->|  (conversion-queue)   |-------->|  (hwp2pdf-converter)      |                |
|  | (hwp2pdf-api)     | enqueue   |                       |  token  |                           |                |
|  +---------+---------+           +----------+------------+         +------------+--------------+                |
|            |                                |                                   |                                |
|            | 1a. Metadata                  | 2a. actAs /                        | 3. Read                        |
|            |     Store                     |     invoker                        |    HWP  4. PDF                 |
|            v                                v                                   v                                |
|  +-------------------+           +-----------------------+         +-------------------------+                |
|  |                   |           |  api-dispatcher-sa    |         |                         |                |
|  |  Google Firestore |           |  (Cloud Tasks OIDC    |         |  Google Cloud Storage   |                |
|  |    (Job Store)    |           |   token generator)    |         |   (Private Bucket)      |                |
|  +-------------------+           +-----------------------+         +-------------------------+                |
|                                                                                                                 |
+-----------------------------------------------------------------------------------------------------------------+
```

### 2.3 Detailed Flow Sequence

1. **Upload Complete & Task Dispatched**:
   - The user completes direct-to-GCS upload or multi-part API upload.
   - The Public API writes `status = "queued"` into Firestore.
   - The Public API calls `enqueueConversionJob(jobId)`, which invokes the Cloud Tasks client using the **API runtime identity** (`api-public-sa` or Workload Identity) via Application Default Credentials. The Cloud Tasks task includes `oidcToken.serviceAccountEmail = api-dispatcher-sa`, but the caller of `createTask` is not `api-dispatcher-sa`.
   - Cloud Tasks creates an HTTP task with an OIDC token whose `serviceAccountEmail` is `api-dispatcher-sa` and whose `audience` equals the converter service URL.

2. **Secure Cloud Tasks Request to Private Converter**:
   - Cloud Tasks generates the OIDC ID token. The binding that enables Cloud Tasks to act as `api-dispatcher-sa` is an IAM grant on `api-dispatcher-sa` to the Cloud Tasks primary service agent (`service-PROJECT_NUMBER@gcp-sa-cloudtasks.iam.gserviceaccount.com`) with `roles/iam.serviceAccountUser` or a custom role containing `iam.serviceAccounts.actAs`. In addition, the API runtime caller that calls `createTask` with `oidcToken.serviceAccountEmail = api-dispatcher-sa` must itself have `iam.serviceAccounts.actAs` on `api-dispatcher-sa` so GCP authorizes the request.
   - Cloud Tasks routes the `POST /internal/workers/convert` request to the private converter URL.
   - The Private Converter's ingress is set to **Internal Only**, so no direct internet request can reach the endpoint.

3. **Job Claim, Processing & Storage Interaction**:
   - The Private Converter verifies the inbound OIDC bearer token's signature, audience (`aud` = converter URL), issuer (`iss` = `https://accounts.google.com`), and service account email (`api-dispatcher-sa`) before execution.
   - The Private Converter claims the job in Firestore using a compare-and-set transaction (`status = "processing"`), ensuring single-worker exclusivity.
   - The Private Converter downloads the original HWP file from GCS under a temporary directory `/tmp/hwp2pdf/uploads`.
   - The Private Converter shells out to `LIBREOFFICE_BIN` (with an isolated custom profile directory) to perform the conversion.
   - On success, the Private Converter uploads the converted PDF result to GCS and signs a short-lived V4 download URL.
   - The Private Converter writes `status = "completed"` with the results to Firestore.
   - On failure, it classifies the error (retryable vs. terminal) and updates Firestore. It exits with 200 for terminal (to drop task) or 500 for retryable (to trigger queue backoff).

---

## 3. Identity, IAM, and Permission Model

### 3.1 The Three Required Identities

Private converter separation requires **three distinct service-account identities**. Blending any two of them defeats the purpose of the split.

| Identity | Runtime | Purpose |
|---|---|---|
| **API Runtime Task Creator** (`api-public-sa` or Workload Identity) | Cloud Tasks client caller (inside `hwp2pdf-api` pods) | Calls `createTask` on `conversion-queue`. This is the **queue-enqueue caller identity**, not the OIDC token subject. |
| **Cloud Tasks OIDC Token Subject** (`api-dispatcher-sa`) | Cloud Tasks control plane | The service account whose identity Cloud Tasks *acts as* (via `iam.serviceAccounts.actAs`) to mint the OIDC JWT. This email is configured in `oidcToken.serviceAccountEmail` and is the principal that `requireWorkerOidc` verifies. |
| **Private Converter Runtime** (`api-converter-sa`) | Private Cloud Run service runtime | The service account attached to the `hwp2pdf-converter` Cloud Run service. It receives the Cloud Tasks request, runs LibreOffice, and reads/writes Firestore and GCS. It does **not** receive `roles/run.invoker`; that role is bound to the Cloud Run **service resource** for the OIDC subject principal. |

### 3.2 Resource-Level Permission and `iam.serviceAccounts.actAs` Relationship

For Cloud Tasks to issue an OIDC token with `serviceAccountEmail = api-dispatcher-sa`, **two independent IAM conditions** must be satisfied on `api-dispatcher-sa`:

1. **API runtime caller has `iam.serviceAccounts.actAs`** for `api-dispatcher-sa`. The API runtime identity (`api-public-sa` or Workload Identity) calls `createTask` and includes an `oidcToken.serviceAccountEmail`; GCP validates that caller against the SA being used as the token subject.
2. **Cloud Tasks primary service agent has `iam.serviceAccounts.actAs`** for `api-dispatcher-sa`. The Cloud Tasks control plane (`service-PROJECT_NUMBER@gcp-sa-cloudtasks.iam.gserviceaccount.com`) needs this grant to actually mint the token.

```
# Required IAM bindings on the OIDC subject SA: api-dispatcher-sa

Principal: api-public-sa (or WIF used by api-public-sa)
  -> roles/iam.serviceAccountUser (or custom iam.serviceAccounts.actAs)
     Resource: SA api-dispatcher-sa
     Purpose: authorize the API runtime caller to set api-dispatcher-sa as oidcToken.serviceAccountEmail

Principal: Cloud Tasks primary service agent
  -> service-PROJECT_NUMBER@gcp-sa-cloudtasks.iam.gserviceaccount.com
  -> roles/iam.serviceAccountUser (or custom iam.serviceAccounts.actAs)
     Resource: SA api-dispatcher-sa
     Purpose: authorize Cloud Tasks control plane to mint the OIDC JWT as api-dispatcher-sa

# Required role grants elsewhere

api-public-sa (API runtime task creator)
  -> runs the public API service
  -> needs roles/datastore.user on Firestore
  -> needs roles/storage.objectAdmin on GCS bucket (interim; smaller custom role/condition validated in staging)
  -> needs roles/iam.serviceAccountTokenCreator on itself to mint signed download URLs
  -> needs roles/cloudtasks.enqueuer on conversion-queue
  -> needs iam.serviceAccounts.actAs on api-dispatcher-sa (via roles/iam.serviceAccountUser or custom)
  -> does NOT need roles/run.invoker or iam.serviceAccountTokenCreator on other SAs in target state

api-dispatcher-sa (Cloud Tasks OIDC token subject)
  -> is acted-as by Cloud Tasks control plane to mint the OIDC JWT
  -> needs roles/run.invoker on the Cloud Run service resource hwp2pdf-converter (binding principal: api-dispatcher-sa)
  -> does NOT run the converter, does NOT hold Firestore/GCS permissions

api-converter-sa (converter runtime)
  -> attached to the Cloud Run service resource hwp2pdf-converter as its runtime SA
  -> needs roles/datastore.user on Firestore (default)
  -> needs roles/storage.objectAdmin on GCS bucket (interim; prefix-restricted custom role/condition validated in staging)
  -> needs no roles/run.invoker, no cloudtasks.enqueuer, no iam.serviceAccountTokenCreator
```

The critical split is:

- The **API runtime** (`api-public-sa`) only reads/writes Firestore and GCS, mints signed URLs, and calls `createTask` on the queue. It never invokes the converter directly.
- The **OIDC token subject** (`api-dispatcher-sa`) is only the identity Cloud Tasks acts as to mint the JWT. It never runs application code, never reads/writes Firestore or GCS, and never mints signed URLs. The converter verifies this principal as the caller.
- The **converter runtime** (`api-converter-sa`) only processes tasks inside the `hwp2pdf-converter` Cloud Run service. It cannot create tasks or mint public signed URLs.

### 3.3 Least-Privilege IAM Authorization Matrix

| Service Account | Role / Permission | Assigned Resource | Purpose |
|---|---|---|---|
| **API Runtime Task Creator (`api-public-sa`)** | `roles/cloudtasks.enqueuer` | Queue: `conversion-queue` | Create HTTP target tasks; not the OIDC token subject. |
| | `roles/iam.serviceAccountUser` (or custom `iam.serviceAccounts.actAs`) | SA: `api-dispatcher-sa` | Authorize `api-public-sa` to set `api-dispatcher-sa` as the OIDC token subject. |
| **Cloud Tasks service agent** (`service-PROJECT_NUMBER@gcp-sa-cloudtasks.iam.gserviceaccount.com`) | `roles/iam.serviceAccountUser` (or custom with `iam.serviceAccounts.actAs`) | SA: `api-dispatcher-sa` | Allows Cloud Tasks control plane to mint OIDC tokens as `api-dispatcher-sa`. |
| **Cloud Tasks OIDC Token Subject (`api-dispatcher-sa`)** | `roles/run.invoker` | Service: `hwp2pdf-converter` | Principal allowed to invoke the internal-only converter Cloud Run service resource. |
| **Public API Service Account (`api-public-sa`)** | `roles/datastore.user` | Firestore DB: `(default)` | Read and write job metadata and member board posts. |
| | `roles/storage.objectAdmin` (interim) | GCS Bucket: `[GCS_BUCKET_NAME]` | Initiates upload sessions, gets object metadata, and handles direct GCS upload assertions. A prefix-restricted custom role or IAM condition is preferred but must be validated in staging IAM policy simulation. |
| | `roles/iam.serviceAccountTokenCreator` | Self SA Account | Generate short-lived V4 signed result download URLs. |
| **Private Converter SA (`api-converter-sa`)** | `roles/datastore.user` | Firestore DB: `(default)` | Atomic compare-and-set claims and write final job outcomes. |
| | `roles/storage.objectAdmin` (interim) | GCS Bucket: `[GCS_BUCKET_NAME]` | Download original HWP files and upload final converted PDF files. A prefix-restricted custom role or IAM condition is preferred but must be validated in staging IAM policy simulation. |

**Prohibited**: `roles/editor`, `roles/owner`, `roles/storage.admin`, `roles/datastore.owner`, project-wide grants, or `--allow-unauthenticated` on `hwp2pdf-converter`.

**Staging validation required**: Verify that a custom IAM role or IAM condition can restrict `storage.objects.*` to `staging/*` and `output/*` prefixes without breaking signed-upload compatibility. If the simulation fails, keep `roles/storage.objectAdmin` as the interim role and retry in the next review cycle.

---

## 4. Deployment Contract

### 4.1 Core Cloud Run Service Matrix (Target Contract)

| Property | Public API Service (`hwp2pdf-api`) | Private Converter Service (`hwp2pdf-converter`) |
|---|---|---|
| **Ingress Setting** | `All` (publicly accessible; IAP/Cloud Armor out of scope) | `Internal` ( rejects internet; only Cloud Tasks / internal callers) |
| **Authentication** | `--allow-unauthenticated` (public route) | `--no-allow-unauthenticated`; only principals with `roles/run.invoker` on the converter Cloud Run service resource |
| **Service Identity (SA)** | `api-public-sa@[PROJECT].iam.gserviceaccount.com` | `api-converter-sa@[PROJECT].iam.gserviceaccount.com` |
| **Memory / CPU Limits** | 512 MiB / 1 vCPU | 2 GiB / 2 vCPU (LibreOffice required) |
| **Max Instances** | 5 (API scaling) | 1 (Low-cost test/stable queuing default) |
| **Concurrency** | 80 | 1 (strictly sequential conversion per container) |
| **Request Timeout** | 30s | 300s (matches LibreOffice limit + headroom) |
| **Min Instances** | 0 | 0 (accept cold-start for security/cost) |
| **Container Image** | Same API image (no LibreOffice in ideal future; currently still shared image) | Same API image, but only converter routes enabled |
| **Environment Variables** | `STORAGE_BACKEND=gcs`<br>`JOB_STORE_BACKEND=firestore`<br>`CONVERSION_DISPATCHER=cloud-tasks`<br>`CLOUD_TASKS_QUEUE_NAME=conversion-queue`<br>`CLOUD_TASKS_LOCATION=asia-northeast3`<br>`CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL=api-dispatcher-sa@[PROJECT].iam.gserviceaccount.com`<br>`INTERNAL_WORKER_URL=https://hwp2pdf-converter-...run.app/internal/workers/convert`<br>`INTERNAL_WORKER_AUDIENCE=https://hwp2pdf-converter-...run.app` | `STORAGE_BACKEND=gcs`<br>`JOB_STORE_BACKEND=firestore`<br>`LIBREOFFICE_BIN=soffice`<br>`CONVERSION_TIMEOUT_MS=240000`<br>`NODE_ENV=production`<br>`INTERNAL_WORKER_AUDIENCE=https://hwp2pdf-converter-...run.app`<br>`CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL=api-dispatcher-sa@[PROJECT].iam.gserviceaccount.com` |

### 4.2 Converter-Only Entrypoint and Route Allowlist

Because the same container image is reused, the private service **must not expose public routes**. The target contract requires one of the following application-level controls (preferred first):

1. **Preferred**: Build a dedicated converter entrypoint (`apps/api/src/server-converter.ts`) that mounts only:
   - `GET /health`
   - `GET /ready`
   - `POST /internal/workers/convert`
   - maintenance cleanup route (if needed) under its own auth
   All `/v1/*`, `/v1/upload`, `/v1/me/jobs`, `/v1/results`, etc., return `404`.

2. **Fallback**: Reuse the existing Express app but gate by an env-var `CONVERTER_ONLY=true` that uninstalls or 404s every non-converter route before `app.use(router)`.

Either way, the private service URL must respond with `404` for `/v1/upload`, `/v1/jobs/{jobId}`, and `/v1/results/{fileName}` in negative tests.

### 4.3 Health, Readiness, and Startup Guarantees

| Endpoint | Service | Expected Behavior | Used By |
|---|---|---|---|
| `GET /health` | public + converter | Returns `200 { "status": "ok" }` with minimal dependencies. | Load balancer / smoke tests. |
| `GET /ready` | converter | Returns `200` only after LibreOffice warm-up (`soffice --terminate_after_init`) and GCS/Firestore connectivity check succeed. | Cloud Run startup probe; deploy gate. |

The converter `/ready` check must fail until LibreOffice has completed its first headless initialization successfully; otherwise the service may receive tasks before the conversion engine is usable.

### 4.4 Retry, Exhaustion, and Stuck-Job Validation

- **Queue retry policy**: `maxAttempts` bounded (target: 100), exponential backoff, no unlimited retries.
- **Idempotency**: `claimQueuedJobForProcessing` uses compare-and-set; duplicate deliveries on `processing`, `completed`, or `failed` jobs return `200 noop`.
- **Retryable vs terminal**: Existing `isRetryableConversionError` classification is preserved. Retryable failures return `500` so Cloud Tasks retries; terminal failures return `200` so the task drops.
- **Exhaustion**: After `maxAttempts`, Cloud Tasks marks the task as permanently failed. A future cleanup/recovery job may re-enqueue stuck `queued` jobs only after `stuckJobThresholdMinutes` (default 10 min) and only when no active processing is detected.
- **Stuck validation**: Maintenance recovery must reset `processing` jobs to `queued` only when the lock timestamp is past a **longer** threshold (target: 30 min), not the 10-min threshold used for `queued` jobs.

### 4.5 Pinned Revision / Image and Target-Only Rollback

- Each converter deployment targets a **pinned image digest** (e.g., `.../hwp2pdf-converter@sha256:...`) or a unique tag per commit (`:COMMIT_SHA`).
- Public API deployment must not auto-adopt the converter image; the two services must deploy independently.
- **Rollback target**: Only the converter service may be rolled back to its previous revision without touching the public API. The public API can independently fall back to `CONVERSION_DISPATCHER=inline` if Cloud Tasks or converter connectivity fails.
- **HWP smoke test on converter deploy**: Before switching traffic to a new converter revision, run a synthetic HWP-to-PDF conversion end-to-end via the private URL. If it fails, keep the previous revision and alert.

---

## 5. Network Contract: Ingress vs. Egress

### 5.1 Ingress

- **Public API**: Ingress `All`. Public routes remain externally reachable. Authentication is handled at the application layer (Firebase ID token / anonymous access token).
- **Converter**: Ingress `Internal only`. No internet traffic can reach the converter. Only the principal `api-dispatcher-sa` (bound to `roles/run.invoker` on the converter Cloud Run service resource) and other internal GCP callers can invoke it.

### 5.2 Egress — Selected Design

Converter egress must be **restricted to Google APIs and the GCS/Firestore endpoints only**. `PRIVATE_RANGES_ONLY` alone is **not sufficient** because it routes only RFC 1918 / private-range traffic through the VPC connector and leaves public-range traffic on the default Cloud Run egress path, which can still reach the open internet.

The selected target contract is therefore:

**All converter traffic is forced through VPC/Direct VPC egress with firewall deny of public destinations, no general-purpose Cloud NAT, and GCS/Firestore/Google token access preserved via Private Google Access (or a restricted `*.googleapis.com` DNS/route policy).**

Implementation options (project/network feasibility must be validated in staging):

1. **Direct VPC egress** (`--network`, `--subnet`) with a VPC firewall rule denying egress to `0.0.0.0/0` except for an allowlist of Google API CIDRs/routes and DNS names. No Cloud NAT or restricted NAT without explicit allowlist.
2. **Serverless VPC Access connector with `egress = all-traffic`** and firewall deny of public destinations, combined with Private Google Access for GCS/Firestore.

In either case:

- Traffic to **public IP addresses**, including the open internet, must be **denied by VPC firewall rules** (not merely left on the default path).
- Traffic to **Google APIs and services** (GCS, Firestore, Cloud Tasks metadata, Google OIDC/token endpoints) is **preserved** via Private Google Access or a restricted Google APIs route.
- Exact feasibility (project VPC setup, subnet IP ranges, route priorities, DNS policy, and whether restricted Google APIs endpoint is compatible with the Cloud Tasks/Storage client libraries) is a **staging gate**, not a design assertion.

### 5.3 Negative Egress Tests

The following tests must be executed in the target converter deployment:

| Test | Expected Result |
|---|---|
| `curl https://www.google.com` from converter container | Connection refused / timeout / blocked by firewall |
| `curl https://httpbin.org/post` from converter container | Blocked by firewall |
| `curl https://storage.googleapis.com` from converter container | Allowed (GCS endpoint reachable via Private Google Access / restricted route) |
| `curl https://firestore.googleapis.com` from converter container | Allowed (Firestore endpoint reachable) |
| `curl https://oauth2.googleapis.com/token` from converter container | Allowed (Google OIDC/token endpoint reachable) |
| Converter attempts DNS resolution of a non-Google public domain | No successful TCP/TLS handshake; firewall logs show deny |
| Public route `POST /v1/upload` to converter URL | `404` |
| Direct internet `POST /internal/workers/convert` to converter URL | `403` or connection refused (ingress internal) |

A positive/negative pair must be recorded for each of GCS, Firestore, and Google token endpoints, plus a public-internet deny pair, before the converter is accepted.

### 5.4 Alternative Egress Patterns Considered and Rejected

| Option | Why Rejected |
|---|---|
| `PRIVATE_RANGES_ONLY` without firewall deny | Leaves public-range traffic on the default Cloud Run egress path; does not block public internet. |
| `all-traffic` VPC egress to private ranges only with firewall rules | Requires maintaining firewall rules for every Google API IP range; fragile and easy to misconfigure. |
| `all-traffic` egress with NAT + domain allowlist | Adds NAT cost and complexity; domain filtering is not authoritative at the network layer. |
| No VPC connector, default Cloud Run egress | Leaves full internet egress open, violating least-privilege for the conversion engine. |

---

## 6. Resource / IAM Add-Remove Diff and Compatibility

### 6.1 Current → Target Resource Diff

| Resource / IAM | Current | Target | Add / Remove / Keep | Rollback Termination Criterion |
|---|---|---|---|---|
| Cloud Run `hwp2pdf-api` | Exists, `--allow-unauthenticated` | Keep, reconfigure `CONVERSION_DISPATCHER=cloud-tasks` and point `INTERNAL_WORKER_URL`/`AUDIENCE` to converter | Keep + reconfigure | If rollback to monolith, set `CONVERSION_DISPATCHER=inline` and clear worker URL/Audience. |
| Cloud Run `hwp2pdf-converter` | Does not exist | Create with `--ingress internal`, `--no-allow-unauthenticated`, `api-converter-sa` | **Add** | If removed, public API must already be on `inline` fallback. |
| Cloud Tasks queue `conversion-queue` | May exist (code references it; deployment does not create it) | Create with `max-concurrent-dispatches=1` and bounded retry | **Add** | Queue can remain idle; remove after public API no longer references it. |
| SA `api-public-sa` | Exists (current API runtime SA) | Keep; in target topology add `roles/cloudtasks.enqueuer` on `conversion-queue` and `iam.serviceAccounts.actAs` on `api-dispatcher-sa` (via `roles/iam.serviceAccountUser` or custom); remove `run.invoker` if previously granted on public API | Keep + reconfigure | Remove `cloudtasks.enqueuer` and `iam.serviceAccounts.actAs` on `api-dispatcher-sa` only if permanently returning to monolith inline mode (T11 rollback switch). |
| SA `api-converter-sa` | Does not exist | Create; grant `datastore.user` + `storage.objectAdmin` (interim; prefix-restricted custom role/condition validated in staging) | **Add** | Remove only after converter service is deleted and jobs drained. |
| SA `api-dispatcher-sa` | Does not exist (currently falls back to API runtime SA) | Create; do **not** grant `cloudtasks.enqueuer`. Grant `run.invoker` on the converter Cloud Run **service resource** | **Add** | Remove after queue deleted and public API no longer uses Cloud Tasks. |
| Cloud Tasks service agent `service-...` | Not needed in current monolith | Grant `iam.serviceAccountUser` (or custom `iam.serviceAccounts.actAs`) on `api-dispatcher-sa` | **Add** | Remove when `api-dispatcher-sa` is deleted. |
| GCS bucket `[GCS_BUCKET_NAME]` | Exists, UBLA=false, PAP unset | Keep; set UBLA=true, PAP=enforced, no public IAM binding | Keep + harden | Rollback only if UBLA/PAP cause legitimate access failures. |
| Firestore database `(default)` | Exists | Keep | Keep | N/A |

### 6.2 Execution Order (T11, After Approval)

1. **Harden storage first**: Enable UBLA=true and PAP=enforced on `[GCS_BUCKET_NAME]`; verify no public IAM binding remains.
2. **Create service accounts**: `api-dispatcher-sa`, `api-converter-sa`.
3. **Grant Cloud Tasks actAs**: On `api-dispatcher-sa`, grant Cloud Tasks primary service agent `roles/iam.serviceAccountUser` (or a custom role with `iam.serviceAccounts.actAs`).
4. **Grant API runtime actAs on OIDC subject**: On `api-dispatcher-sa`, grant `api-public-sa` (or its WIF) `roles/iam.serviceAccountUser` (or a custom role with `iam.serviceAccounts.actAs`) so the API runtime can set `oidcToken.serviceAccountEmail = api-dispatcher-sa`.
5. **Grant task-creator permissions**: `roles/cloudtasks.enqueuer` on `conversion-queue` to `api-public-sa` (API runtime task creator). Bind `roles/run.invoker` on the `hwp2pdf-converter` Cloud Run **service resource** to principal `api-dispatcher-sa` (OIDC token subject).
6. **Create queue**: `conversion-queue` with `max-concurrent-dispatches=1`, bounded retry.
7. **Deploy converter**: `hwp2pdf-converter` with `--ingress internal`, `--no-allow-unauthenticated`, `api-converter-sa` runtime SA, VPC/Direct VPC egress with firewall deny of public destinations and Private Google Access for GCS/Firestore, converter-only entrypoint, and `CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL=api-dispatcher-sa@[PROJECT].iam.gserviceaccount.com` as the required expected caller email.
8. **Verify negative tests**: Ingress block, public-internet egress deny, GCS/Firestore/Google token endpoints reachable, public routes 404, HWP smoke pass.
9. **Reconfigure public API**: Set `CONVERSION_DISPATCHER=cloud-tasks`, `CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL=api-dispatcher-sa@[PROJECT].iam.gserviceaccount.com`, `INTERNAL_WORKER_URL`, `INTERNAL_WORKER_AUDIENCE`.
10. **Smoke test end-to-end**: Upload → queued → processing → completed → download.
11. **Keep `inline` fallback documented**: Public API can be switched back to `CONVERSION_DISPATCHER=inline` if converter fails. In inline rollback mode, `api-public-sa` does **not** need `roles/cloudtasks.enqueuer` or `iam.serviceAccounts.actAs` on `api-dispatcher-sa`; these are restored only when reverting to the separated topology.

### 6.3 UBLA / PAP / ACL Compatibility

- **UBLA (Uniform Bucket-Level Access)**: Target state enables `UBLA=true`. All access must be via IAM, not ACLs. The existing code uses signed URLs and IAM through service-account roles, so UBLA=true is compatible once bucket ACLs are not relied upon. A custom role or IAM condition scoped to `staging/*` and `output/*` prefixes is preferred but must be validated in staging; until then `roles/storage.objectAdmin` is the interim role.
- **PAP (Public Access Prevention)**: Target state sets `PAP=enforced`. This prevents accidental public bucket exposure.
- **IAM only**: No `allUsers` or `allAuthenticatedUsers` bucket binding. Converter and public API use `roles/storage.objectAdmin` scoped to the bucket (not `roles/storage.admin`) as an interim role; prefix-restricted replacement is a staging validation target.

---

## 7. Environment Contract and T11 Preflight Fail-Closed Conditions

### 7.1 Required Environment Contract (Both Sides)

| Variable | Set on Public API | Set on Converter | Missing Result |
|---|---|---|---|
| `CONVERSION_DISPATCHER` | `cloud-tasks` | N/A (not used) | Public API refuses to start or falls back to inline if explicitly configured. |
| `CLOUD_TASKS_QUEUE_NAME` | `conversion-queue` | N/A | Cloud Tasks enqueue fails at runtime. |
| `CLOUD_TASKS_LOCATION` | `asia-northeast3` | N/A | Cloud Tasks enqueue fails at runtime. |
| `CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL` | `api-dispatcher-sa@[PROJECT].iam.gserviceaccount.com` | `api-dispatcher-sa@[PROJECT].iam.gserviceaccount.com` | The Public API value is the `oidcToken.serviceAccountEmail` subject and the converter value is the expected caller email; the two values must be present and exactly equal. Current `getExpectedServiceAccountEmail()` returns `null` when this variable is empty, and `requireWorkerOidc` then skips email comparison. Therefore missing or unequal values are a T11 readiness failure: converter startup/readiness or deployment preflight must fail and cutover is prohibited. |
| `INTERNAL_WORKER_URL` | `https://hwp2pdf-converter-...run.app/internal/workers/convert` | N/A | If empty, `createInternalWorkerUrl()` falls back to public API URL — **this is a target-readiness failure**, not an acceptable default. |
| `INTERNAL_WORKER_AUDIENCE` | `https://hwp2pdf-converter-...run.app` | `https://hwp2pdf-converter-...run.app` | If missing, defaults to worker URL (path included). Must match Cloud Tasks `oidcToken.audience`. |
| `INTERNAL_WORKER_ISSUER` | `https://accounts.google.com` (optional) | `https://accounts.google.com` (optional) | Defaults to Google issuer; acceptable. |
| `STORAGE_BACKEND` | `gcs` | `gcs` | Local mode breaks multi-service design. |
| `JOB_STORE_BACKEND` | `firestore` | `firestore` | Local mode breaks multi-service design. |
| `GCS_BUCKET_NAME` | set | set | Required for object operations. |
| `GCS_PROJECT_ID` | set | set | Required for Cloud Tasks parent and GCS. |

### 7.2 T11 Preflight Fail-Closed Conditions

Before any T11 deployment step is considered successful, the following checks must be **hard failures** if they do not pass:

1. **Converter URL non-empty**: `INTERNAL_WORKER_URL` and `INTERNAL_WORKER_AUDIENCE` are non-empty and match the converter service URL (not the public API URL).
2. **Converter ingress internal**: `gcloud run services describe hwp2pdf-converter --format='value(spec.trafficConfiguration.???)'` (or equivalent) shows `ingress = internal` or `internal-and-cloud-load-balancing`; never `all`.
3. **Converter not public**: `--allow-unauthenticated` is absent; direct curl to converter URL from outside GCP returns `403` or connection error.
4. **Task creator separate**: The API runtime identity that calls `createTask` is not `api-dispatcher-sa` and not `api-converter-sa`. The Public API's `CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL` resolves to `api-dispatcher-sa` (OIDC token subject).
5. **Expected caller email fail-closed**: `CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL` exists on both the Public API and converter, both values exactly equal the full `api-dispatcher-sa@[PROJECT].iam.gserviceaccount.com` email, and a staging OIDC request proves the converter accepts that email and rejects a different email. Because the current `requireWorkerOidc` skips email comparison when the converter value is empty, a missing or unequal value must fail converter startup/readiness or an external deployment preflight; it must never permit Public API cutover.
6. **actAs granted to both actors**:
   - The Cloud Tasks primary service agent has `iam.serviceAccounts.actAs` on `api-dispatcher-sa` (via `roles/iam.serviceAccountUser` or custom role).
   - The API runtime caller (`api-public-sa` or WIF) has `iam.serviceAccounts.actAs` on `api-dispatcher-sa` (via `roles/iam.serviceAccountUser` or custom role).
   Verified by a test `createTask` call in staging.
7. **Invoker bound**: Principal `api-dispatcher-sa` is bound to `roles/run.invoker` on the `hwp2pdf-converter` Cloud Run **service resource**.
8. **Egress restricted**: All converter traffic is forced through VPC/Direct VPC egress; firewall rules deny public internet destinations; GCS/Firestore/Google token endpoints remain reachable. `PRIVATE_RANGES_ONLY` alone is not accepted.
9. **Converter-only routes**: Public routes (`/v1/*`) return 404 on converter service.
10. **HWP smoke pass**: A real HWP file uploaded through public API completes end-to-end via the converter.
11. **Rollback path tested**: Switching public API to `CONVERSION_DISPATCHER=inline` restores monolith conversion without re-deploying converter.

If any of the above is missing, the deployment must **fail closed** — do not reconfigure public API to use the converter.

---

## 8. Security & Threat Modeling Analysis

| Risk Vector | Attack Scenario | Proposed Architectural Mitigation |
|---|---|---|
| **Forged Workers / Internal Intrusion** | Adversary attempts to directly invoke the converter to crash the system or write arbitrary files. | Ingress locked to **Internal Only**, rejecting all internet requests. OIDC verification enforces valid Google signature, audience matching the converter URL, issuer `https://accounts.google.com`, and caller email matching the OIDC token subject `api-dispatcher-sa`. |
| **HWP Parser Poisoning (RCE)** | Malicious HWP file triggers buffer overflows or arbitrary code execution in LibreOffice. | Engine runs in isolated `api-converter-sa` with no task-creation or signed-URL-minting permissions. Egress restricted to Google APIs only. Profile directory isolated to local ephemeral `/tmp` scopes. |
| **Result File Overwrite** | Adversary guesses a jobId and uploads a payload to overwrite another member's PDF. | Bucket access restricted. Filenames isolated within UUID path boundaries (`output/{jobId}/{jobId}.pdf`). Direct uploads only via unique short-lived signed PUT URLs matched against `UploadSession` records. |
| **Confused Deputy Access** | Compromised public endpoint attempts to trick the converter into leaking internal storage data. | Public API cannot execute local conversion. Converter only downloads objects matching `staging/{jobId}/{fileName}` and enforces the `jobId` from the verified queue task payload. |
| **Observability and Leakage** | Raw error traces or stack details leak infrastructure paths, keys, or local directory configurations. | Raw execution stdout/stderr hard-truncated to 8KiB and kept in structured system logs (GCP Cloud Logging). Public status API returns generalized Korean strings derived from `errorCode` mapping contracts. |
| **Credential Leak via Environment** | Service account keys or signed URLs leak via env vars or logs. | No private keys in env. ADC/Workload Identity only. Signed URLs short-lived and never logged. |

---

## 9. Fallback / Rollback Execution

If the separated conversion execution triggers latency spikes, OIDC handshaking errors, or queuing failures:

1. **Target-only rollback**: Roll the converter service to its previous pinned revision using `gcloud run services update-traffic`.
2. **Public API fallback**: Re-deploy or update the public service environment variable `CONVERSION_DISPATCHER=inline`. This activates the in-process conversion fallback on the public service instances, bypassing Cloud Tasks and the separated worker network boundary.
3. **Temporary permission rule**: If the `inline` fallback must run in production, `api-public-sa` still does **not** need `roles/run.invoker` or `cloudtasks.enqueuer`; it only needs its existing Firestore + GCS permissions plus LibreOffice in the image. Re-grant any Cloud Tasks/Run permissions only if returning to the separated topology, and remove them again when reverting.

---

## 10. Verification Plan & Rollout Agreement

### 10.1 Staging Validation (Must Pass Before Production)

The following are explicitly left as **staging validation** because they cannot be verified from documentation alone:

- Cloud Tasks `actAs` grant behaves as expected in the target GCP project.
- OIDC audience resolution matches between `INTERNAL_WORKER_AUDIENCE` and Cloud Tasks `oidcToken.audience`.
- `CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL` is present on both services, exactly matches `api-dispatcher-sa@[PROJECT].iam.gserviceaccount.com`, and produces an audience/issuer/email triple match; a missing or different converter value fails startup/readiness or deployment preflight and prevents cutover.

- Converter-only entrypoint correctly returns 404 for all `/v1/*` routes.
- `/ready` probe reliably reflects LibreOffice warm-up state.
- End-to-end HWP smoke test passes with the pinned converter revision.

### 10.2 Explicit Human-in-the-Loop Approval Gate

> **CRITICAL PRODUCTION GUARDRAIL**: No staging or production resource deployment (including Cloud Tasks queues, GCS bucket changes, Cloud Run instances, or IAM adjustments) is authorized to begin as part of T11 until the operator has reviewed this design and signed off on the execution plan.

```
[ ] OPERATOR APPROVAL: Enforce Isolated Private Converter and Cloud Tasks Deployment
Date of Approval: _____________________
Approver Signature: __________________
```

---

## 11. Evidence & Review Notes

- Current code-level implementation: `apps/api/src/services/cloud-tasks-dispatcher.ts`, `apps/api/src/middleware/worker-auth.ts`, `apps/api/src/routes/v1.ts`.
- Current deployment wiring: `.github/workflows/deploy-api-cloud-run.yml` (single service, `--allow-unauthenticated`, empty worker URL, and an audience sourced from a secret with an empty fallback).
- Container image: `apps/api/Dockerfile` (single image with LibreOffice).
- External review status and redacted resource diff: `.omo/evidence/task-10-code-frontend-improvement-final.md`.
