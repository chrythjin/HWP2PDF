// ---------------------------------------------------------------------------
// Cloud Tasks conversion dispatcher (Todo 6).
//
// Replaces the old `void convertJobToPdf(...)` fire-and-forget pattern with
// a durable Cloud Tasks HTTP queue. On upload complete, the route handler
// calls `enqueueConversionJob(jobId)` which creates a Cloud Tasks HTTP task
// targeting the internal worker endpoint. The worker endpoint receives an
// OIDC service account token, verifies audience/issuer, and processes the job.
//
// Modes:
//   - "cloud-tasks": Production. Uses @google-cloud/tasks (dynamic import).
//   - "inline": Local/dev fallback. Calls convertJobToPdf directly in-process.
//   - "mock": Test mode. Records enqueued jobIds in memory for assertions.
//
// The mock mode is automatically selected when FIREBASE_ADMIN_MODE=mock and
// CONVERSION_DISPATCHER is not explicitly set to "cloud-tasks" or "inline".
// This allows tests to run without network access or @google-cloud/tasks.
// ---------------------------------------------------------------------------

import { config } from "../config.js";
import { PROGRESS } from "@hwp2pdf/shared";
import { updateJob } from "./job-store.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CloudTasksQueueConfig {
  queueName: string;
  location: string;
  serviceAccountEmail: string;
  workerUrl: string;
  audience: string;
}

export interface EnqueueResult {
  mode: "cloud-tasks" | "inline" | "mock";
  taskId?: string;
}

export type ConversionDispatchTarget = "legacy" | "converter";

// Minimal interface for the @google-cloud/tasks client.
// We define our own interface to avoid a hard dependency at compile time.
interface CloudTasksClientInterface {
  createTask(request: {
    parent: string;
    task: {
      httpRequest?: {
        url: string;
        httpMethod: string;
        oidcToken?: {
          serviceAccountEmail: string;
          audience?: string;
        };
        body?: Buffer;
        headers?: Record<string, string>;
      };
      name?: string;
    };
  }): Promise<[{ name: string }]>;
}

// ---------------------------------------------------------------------------
// Mock state (for test assertions)
// ---------------------------------------------------------------------------

/**
 * In-memory record of enqueued jobIds when running in mock mode.
 * Tests can inspect this to verify enqueue behavior.
 */
const mockEnqueuedJobIds: string[] = [];

/** Reset mock state. Call in test beforeEach/afterEach. */
export function resetMockDispatcher(): void {
  mockEnqueuedJobIds.length = 0;
}

/** Get the list of jobIds enqueued in mock mode. */
export function getMockEnqueuedJobIds(): readonly string[] {
  return mockEnqueuedJobIds;
}

// ---------------------------------------------------------------------------
// Client factory (lazy singleton)
// ---------------------------------------------------------------------------

let cloudTasksClient: CloudTasksClientInterface | null = null;

/**
 * Get or create the @google-cloud/tasks client.
 *
 * Uses a dynamic import so the dependency is only loaded when actually
 * running in cloud-tasks mode. This allows tests and local dev to run
 * without @google-cloud/tasks installed.
 */
export async function getCloudTasksClient(): Promise<CloudTasksClientInterface> {
  if (cloudTasksClient) return cloudTasksClient;

  // Dynamic import via Function to avoid TypeScript module resolution
  // when @google-cloud/tasks is not installed (local/dev/test mode).
  // In production, the package is installed and the import succeeds.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod = await (new Function("return import('@google-cloud/tasks')")() as Promise<any>);
  const Client = mod.CloudTasksClient ?? mod.default?.CloudTasksClient;
  if (!Client) {
    throw new Error(
      "@google-cloud/tasks is not installed or does not export CloudTasksClient. " +
        "Install it with: pnpm --filter api add @google-cloud/tasks",
    );
  }
  cloudTasksClient = new Client() as unknown as CloudTasksClientInterface;
  return cloudTasksClient;
}

/** Reset the client singleton. Intended for test isolation. */
export function resetCloudTasksClientForTesting(): void {
  cloudTasksClient = null;
}

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

/**
 * Construct the internal worker URL that Cloud Tasks will call.
 *
 * Resolution order:
 *   1. INTERNAL_WORKER_URL env (explicit override).
 *   2. INTERNAL_API_URL env + /internal/workers/convert.
 *   3. CLOUD_RUN_SERVICE_URLS env (Cloud Run injects the public service URL).
 *   4. Fallback: http://localhost:<port>/internal/workers/convert.
 *
 * Reads process.env directly (not config) so tests can override at runtime.
 */
export function createInternalWorkerUrl(): string {
  const workerUrl = process.env.INTERNAL_WORKER_URL ?? config.internalWorkerUrl;
  if (workerUrl) {
    return workerUrl;
  }

  const apiUrl = process.env.INTERNAL_API_URL ?? config.internalApiUrl;
  if (apiUrl) {
    const normalized = apiUrl.replace(/\/$/, "");
    return `${normalized}/internal/workers/convert`;
  }

  // Cloud Run injects CLOUD_RUN_SERVICE_URLS as a comma-separated list of
  // the revision's public URLs. The first entry is the canonical HTTPS URL.
  // Use it to construct the worker endpoint when no explicit env is set.
  const cloudRunUrls = process.env.CLOUD_RUN_SERVICE_URLS;
  if (cloudRunUrls) {
    const firstUrl = cloudRunUrls.split(",")[0]?.trim();
    if (firstUrl) {
      const normalized = firstUrl.replace(/\/$/, "");
      return `${normalized}/internal/workers/convert`;
    }
  }

  const port = process.env.PORT ?? config.port;
  return `http://localhost:${port}/internal/workers/convert`;
}

export function getConversionDispatchTarget(): ConversionDispatchTarget {
  return process.env.CONVERSION_DISPATCH_TARGET === "converter" ? "converter" : "legacy";
}

function getConverterWorkerUrl(): string {
  return (process.env.CONVERTER_WORKER_URL ?? "").trim();
}

function getConverterWorkerAudience(): string {
  return (process.env.CONVERTER_WORKER_AUDIENCE ?? "").trim();
}

/**
 * The expected OIDC audience for the worker endpoint.
 * Defaults to the worker URL itself if not explicitly configured.
 *
 * Reads process.env directly so tests can override at runtime.
 */
export function getWorkerAudience(): string {
  const audience = process.env.INTERNAL_WORKER_AUDIENCE ?? config.internalWorkerAudience;
  return audience || createInternalWorkerUrl();
}

/**
 * Resolve the project that owns the Cloud Tasks queue.
 *
 * Cloud Tasks uses its own parent resource path, so a deployment that relies
 * on ADC for GCS must not leave that path's project segment empty.
 */
export function getCloudTasksProjectId(): string {
  return (
    process.env.CLOUD_TASKS_PROJECT_ID
    ?? process.env.GCS_PROJECT_ID
    ?? process.env.FIRESTORE_PROJECT_ID
    ?? process.env.FIREBASE_PROJECT_ID
    ?? config.gcsProjectId
    ?? config.firestoreProjectId
    ?? config.firebaseProjectId
  ).trim();
}

// ---------------------------------------------------------------------------
// Queue config resolution
// ---------------------------------------------------------------------------

/**
 * Resolve the Cloud Tasks queue configuration from env.
 * Returns null if required config is missing.
 *
 * Reads process.env directly so tests can override at runtime.
 */
export function resolveQueueConfig(): CloudTasksQueueConfig | null {
  const queueName = process.env.CLOUD_TASKS_QUEUE_NAME ?? config.cloudTasksQueueName;
  const location = process.env.CLOUD_TASKS_LOCATION ?? config.cloudTasksLocation;
  const serviceAccountEmail =
    process.env.CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL ?? config.cloudTasksServiceAccountEmail;

  if (!queueName || !location || !serviceAccountEmail) {
    return null;
  }

  const target = getConversionDispatchTarget();
  const workerUrl = target === "converter" ? getConverterWorkerUrl() : createInternalWorkerUrl();
  const audience = target === "converter" ? getConverterWorkerAudience() : getWorkerAudience();
  if (!workerUrl || !audience) {
    return null;
  }

  return {
    queueName,
    location,
    serviceAccountEmail,
    workerUrl,
    audience,
  };
}

// ---------------------------------------------------------------------------
// Dispatcher mode resolution
// ---------------------------------------------------------------------------

/**
 * Resolve the effective dispatcher mode.
 *
 * Priority:
 *   1. Explicit CONVERSION_DISPATCHER env.
 *   2. config.conversionDispatcher (which already has smart defaults).
 *
 * In mock Firebase mode, defaults to "mock" unless explicitly overridden.
 */
export function getDispatcherMode(): "cloud-tasks" | "inline" | "mock" {
  const explicit = process.env.CONVERSION_DISPATCHER;
  if (explicit === "cloud-tasks" || explicit === "inline") {
    return explicit;
  }

  // In mock Firebase mode, use mock dispatcher unless explicitly set.
  const firebaseMode = process.env.FIREBASE_ADMIN_MODE ?? config.firebaseAdminMode;
  if (firebaseMode === "mock" && !explicit) {
    return "mock";
  }

  return config.conversionDispatcher === "cloud-tasks" ? "cloud-tasks" : "inline";
}

// ---------------------------------------------------------------------------
// Enqueue
// ---------------------------------------------------------------------------

/**
 * Enqueue a conversion job for asynchronous processing.
 *
 * In "cloud-tasks" mode, creates a Cloud Tasks HTTP task targeting the
 * internal worker endpoint with an OIDC service account token.
 *
 * In "inline" mode, calls convertJobToPdf directly (local/dev fallback).
 *
 * In "mock" mode, records the jobId in memory for test assertions.
 *
 * @param jobId - The job ID to convert.
 * @param queueConfig - Optional override for queue config (testing).
 * @returns The dispatch mode and optional task ID.
 */
export async function enqueueConversionJob(
  jobId: string,
  queueConfig?: CloudTasksQueueConfig | null,
): Promise<EnqueueResult> {
  const mode = getDispatcherMode();

  if (mode === "mock") {
    mockEnqueuedJobIds.push(jobId);
    return { mode: "mock" };
  }

  if (mode === "inline") {
    // Local/dev fallback: call conversion directly.
    // Dynamic import to avoid circular dependency at module load time.
    const { convertJobToPdf } = await import("./conversion-service.js");
    const { getJob } = await import("./job-store.js");
    const job = await getJob(jobId);
    if (job) {
    void convertJobToPdf({ jobId: job.jobId, sourcePath: job.sourcePath }).catch((error: unknown) => {
      console.error("Inline conversion failed", error);
    });
    }
    return { mode: "inline" };
  }

  // cloud-tasks mode
  const resolvedConfig = queueConfig ?? resolveQueueConfig();
  if (!resolvedConfig) {
    throw new Error(
      "Cloud Tasks dispatcher is enabled but required env vars are missing. " +
        "Set CLOUD_TASKS_QUEUE_NAME, CLOUD_TASKS_LOCATION, and " +
        "CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL. When CONVERSION_DISPATCH_TARGET=converter, " +
        "also set CONVERTER_WORKER_URL and CONVERTER_WORKER_AUDIENCE. Or set CONVERSION_DISPATCHER=inline " +
        "for local development.",
    );
  }

  const client = await getCloudTasksClient();
  const projectId = getCloudTasksProjectId();
  if (!projectId) {
    throw new Error(
      "Cloud Tasks dispatcher is enabled but the queue project is missing. " +
        "Set CLOUD_TASKS_PROJECT_ID or a GCS, Firestore, or Firebase project ID.",
    );
  }
  const parent = `projects/${projectId}/locations/${resolvedConfig.location}/queues/${resolvedConfig.queueName}`;

  const body = JSON.stringify({ jobId });
  const taskId = `${parent}/tasks/${jobId}-${Date.now()}`;

  const [response] = await client.createTask({
    parent,
    task: {
      name: taskId,
      httpRequest: {
        url: resolvedConfig.workerUrl,
        httpMethod: "POST",
        oidcToken: {
          serviceAccountEmail: resolvedConfig.serviceAccountEmail,
          audience: resolvedConfig.audience,
        },
        body: Buffer.from(body),
        headers: {
          "Content-Type": "application/json",
        },
      },
    },
  });

  return { mode: "cloud-tasks", taskId: response.name };
}

// ---------------------------------------------------------------------------
// Stuck-job recovery policy (documentation + optional helper)
// ---------------------------------------------------------------------------

/**
 * Stuck-job recovery policy (Todo 6):
 *
 * Jobs may get stuck in "queued" or "processing" if:
 *   - Cloud Tasks delivery fails or the worker crashes mid-processing.
 *   - The worker endpoint is temporarily unavailable.
 *   - A deploy replaces the service while a task is in-flight.
 *
 * Recovery strategy:
 *   1. Cloud Tasks has built-in retry with exponential backoff (max attempts
 *      configured on the queue, typically 100).
 *   2. The worker endpoint is idempotent: if a job is already "processing"
 *      by another worker invocation, the duplicate no-ops (returns 200).
 *   3. For jobs stuck beyond `stuckJobThresholdMinutes` (default 10 min),
 *      a separate cleanup task (Cloud Scheduler → Cloud Tasks → cleanup
 *      endpoint) can re-enqueue them. This is documented for MVP; the
 *      cleanup endpoint is not yet implemented.
 *   4. Jobs stuck in "processing" for >N minutes should NOT be auto-reset
 *      to "queued" without investigation — the worker may still be running.
 *      The cleanup should only re-enqueue "queued" jobs that were never
 *      picked up, or "processing" jobs past a longer threshold (e.g. 30 min).
 *
 * This function checks if a job is stuck. It does NOT re-enqueue — that
 * is left to a future cleanup endpoint to avoid race conditions.
 */
export function isJobStuck(job: {
  status: string;
  updatedAt: string;
}): boolean {
  if (job.status !== "queued" && job.status !== "processing") {
    return false;
  }

  const thresholdMs = config.stuckJobThresholdMinutes * 60 * 1000;
  const elapsed = Date.now() - Date.parse(job.updatedAt);
  return elapsed > thresholdMs;
}

/**
 * Recover a batch of stale processing jobs and report whether `jobId` was
 * included in the jobs recovered by that batch.
 *
 * The batch uses the configured stuck-job cutoff and is limited to 100 jobs.
 * It does not target only the requested job ID; `false` means this job was not
 * recovered in this batch, not that no other stale jobs were recovered.
 *
 * WARNING: Only call this from a dedicated cleanup task, not from the worker.
 * The worker should use optimistic locking instead.
 */
export async function resetStuckJob(jobId: string): Promise<boolean> {
  const thresholdMs = config.stuckJobThresholdMinutes * 60 * 1000;
  const { recoverStaleProcessingJobs } = await import("./job-store.js");
  const result = await recoverStaleProcessingJobs({
    cutoff: new Date(Date.now() - thresholdMs),
    limit: 100,
  });
  return result.jobs.some((job) => job.jobId === jobId);
}

export async function enqueueRecoveredJobs(jobs: ReadonlyArray<{ jobId: string }>): Promise<EnqueueResult[]> {
  return Promise.all(jobs.map((job) => enqueueConversionJob(job.jobId)));
}
