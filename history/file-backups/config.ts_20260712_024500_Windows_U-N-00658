const signedDownloadUrlTtlMinutes = Number(process.env.SIGNED_DOWNLOAD_URL_TTL_MINUTES ?? 15);
const jobRetentionMinutes = Number(process.env.JOB_RETENTION_MINUTES ?? 30);

/**
 * Firebase Admin initialization mode.
 *
 * - "adc": Application Default Credentials (Cloud Run / GCE production default).
 * - "service-account": Service account key file fallback (local/non-GCP only).
 * - "mock": Test mode — no real Firebase calls, verifyIdToken is stubbed.
 *
 * See `.omo/plans/auth-history-delete-board-final.md` decision D1/D13 and
 * project memory: ADC is preferred over private key env for Cloud Run.
 */
const firebaseAdminMode =
  (process.env.FIREBASE_ADMIN_MODE as "adc" | "service-account" | "mock" | undefined) ??
  (process.env.FIREBASE_PRIVATE_KEY_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
    ? "service-account"
    : "adc");

export const config = {
  port: Number(process.env.PORT ?? 8080),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  uploadDirectory: process.env.UPLOAD_DIR ?? "tmp/uploads",
  resultDirectory: process.env.RESULT_DIR ?? "tmp/results",
  converterCommand: process.env.LIBREOFFICE_BIN ?? "soffice",
  rateLimitWindowMs: 60 * 60 * 1000,
  rateLimitMax: 60,
  resultUrlBase: process.env.RESULT_URL_BASE ?? "http://localhost:8080/v1/results",
  storageBackend: process.env.STORAGE_BACKEND ?? (process.env.GCS_BUCKET_NAME ? "gcs" : "local"),
  gcsBucketName: process.env.GCS_BUCKET_NAME ?? "",
  gcsProjectId: process.env.GCS_PROJECT_ID ?? "",
  gcsOriginalPrefix: process.env.GCS_ORIGINAL_PREFIX ?? "staging",
  gcsResultPrefix: process.env.GCS_RESULT_PREFIX ?? "output",
  signedDownloadUrlTtlMs: signedDownloadUrlTtlMinutes * 60 * 1000,
  jobRetentionMs: jobRetentionMinutes * 60 * 1000,
  jobStoreBackend: process.env.JOB_STORE_BACKEND ?? (process.env.FIRESTORE_JOBS_COLLECTION ? "firestore" : "memory"),
  firestoreProjectId: process.env.FIRESTORE_PROJECT_ID ?? "",
  firestoreDatabaseId: process.env.FIRESTORE_DATABASE_ID ?? "(default)",
  firestoreJobsCollection: process.env.FIRESTORE_JOBS_COLLECTION ?? "jobs",
  // Firebase Admin auth configuration
  firebaseAdminMode,
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID ?? "",
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL ?? "",
  firebasePrivateKeyPath: process.env.FIREBASE_PRIVATE_KEY_PATH ?? "",
  /**
   * Inline service account JSON key (base64 or raw JSON). Used as a fallback
   * when `FIREBASE_PRIVATE_KEY_PATH` is not available (e.g. Cloud Run secret
   * passed as env var). Local/non-GCP fallback only — never use in production
   * if ADC is available.
   */
  googleApplicationCredentialsJson: process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ?? "",
  firebaseDatabaseUrl: process.env.FIREBASE_DATABASE_URL ?? "",
  /** Firebase Auth Emulator host for local development/testing. */
  firebaseAuthEmulatorHost:
    process.env.FIREBASE_AUTH_EMULATOR_HOST ?? process.env.FIREBASE_AUTH_EMULATOR_HOST_FALLBACK ?? "",

  // --- Cloud Tasks conversion dispatcher (Todo 6) ---

  /**
   * Conversion dispatch mode.
   *
   * - "cloud-tasks": Production default when Cloud Tasks config is present.
   *   Enqueues an HTTP task to the Cloud Tasks queue; the internal worker
   *   endpoint processes it asynchronously.
   *
   * - "inline": Local/dev fallback. Calls `convertJobToPdf` directly in-process
   *   (fire-and-forget). MUST NOT be used in production.
   *
   * Resolution order:
   *   1. Explicit `CONVERSION_DISPATCHER` env var.
   *   2. "cloud-tasks" when all required Cloud Tasks env vars are present.
   *   3. "inline" otherwise (local/dev default).
   */
  conversionDispatcher:
    (process.env.CONVERSION_DISPATCHER as "cloud-tasks" | "inline" | undefined) ??
    (process.env.CLOUD_TASKS_QUEUE_NAME &&
    process.env.CLOUD_TASKS_LOCATION &&
    process.env.CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL
      ? "cloud-tasks"
      : "inline"),

  /** Cloud Tasks queue name (e.g. "conversion-queue"). */
  cloudTasksQueueName: process.env.CLOUD_TASKS_QUEUE_NAME ?? "",
  /** Cloud Tasks queue location (e.g. "asia-northeast3"). */
  cloudTasksLocation: process.env.CLOUD_TASKS_LOCATION ?? "",
  /** Service account email used for OIDC token generation. */
  cloudTasksServiceAccountEmail: process.env.CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL ?? "",
  /**
   * Internal worker URL that Cloud Tasks will call. If not set, the worker
   * URL is constructed from the service's public URL or INTERNAL_API_URL.
   */
  internalWorkerUrl: process.env.INTERNAL_WORKER_URL ?? "",
  /**
   * Base URL for constructing the internal worker endpoint. Falls back to
   * the service's public URL.
   */
  internalApiUrl: process.env.INTERNAL_API_URL ?? "",
  /**
   * Expected OIDC audience for the worker endpoint. Cloud Tasks generates
   * an OIDC token with this audience; the worker verifies it matches.
   * If not set, defaults to the internal worker URL itself.
   */
  internalWorkerAudience: process.env.INTERNAL_WORKER_AUDIENCE ?? "",
  /**
   * Expected OIDC issuer (accounts.google.com or https://accounts.google.com).
   * If not set, the worker accepts the standard Google issuer.
   */
  internalWorkerIssuer: process.env.INTERNAL_WORKER_ISSUER ?? "",
  /**
   * Stuck-job recovery threshold in minutes. Jobs stuck in "queued" or
   * "processing" for longer than this may be re-enqueued by a cleanup task.
   * Default: 10 minutes.
   */
  stuckJobThresholdMinutes: Number(process.env.STUCK_JOB_THRESHOLD_MINUTES ?? 10),
} as const;
