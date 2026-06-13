const signedDownloadUrlTtlMinutes = Number(process.env.SIGNED_DOWNLOAD_URL_TTL_MINUTES ?? 15);

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
  jobStoreBackend: process.env.JOB_STORE_BACKEND ?? (process.env.FIRESTORE_JOBS_COLLECTION ? "firestore" : "memory"),
  firestoreProjectId: process.env.FIRESTORE_PROJECT_ID ?? "",
  firestoreDatabaseId: process.env.FIRESTORE_DATABASE_ID ?? "(default)",
  firestoreJobsCollection: process.env.FIRESTORE_JOBS_COLLECTION ?? "jobs",
} as const;
