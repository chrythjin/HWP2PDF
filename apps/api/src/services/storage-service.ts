import fs from "node:fs/promises";
import { Storage } from "@google-cloud/storage";
import {
  ANONYMOUS_ACCESS_TOKEN_HEADER,
  type JobStatusResponse,
  type UploadStatus,
} from "@hwp2pdf/shared";
import { config } from "../config.js";
import type { JobRecord } from "./job-store.js";
import { verifyAccessTokenHash } from "../utils/token.js";
import type { AuthenticatedUser } from "../middleware/auth.js";

const hwpContentType = "application/octet-stream";
const pdfContentType = "application/pdf";
export const directUploadUrlTtlMs = 10 * 60 * 1000;

/**
 * TTL for protected download signed URLs minted after owner verification.
 *
 * Kept very short (default 2 minutes) so that even if a URL leaks after being
 * issued to an authenticated client, the exposure window is minimal. This is
 * separate from the longer {@link config.signedDownloadUrlTtlMs} used for the
 * legacy unconditional publish path, which is being phased out.
 */
export const PROTECTED_DOWNLOAD_URL_TTL_MS =
  Number(process.env.PROTECTED_DOWNLOAD_URL_TTL_MS ?? 2 * 60 * 1000);

type UploadKind = "original" | "result";

let storageClient: Storage | undefined;

export function shouldUseGcs() {
  return config.storageBackend === "gcs";
}

function getBucket() {
  if (!config.gcsBucketName) {
    throw new Error("GCS 저장소를 사용하려면 GCS_BUCKET_NAME을 설정하세요.");
  }

  storageClient ??= new Storage({
    projectId: config.gcsProjectId || undefined,
  });

  return storageClient.bucket(config.gcsBucketName);
}

// ---------------------------------------------------------------------------
// Owner verification (decision D6/D13)
// ---------------------------------------------------------------------------

/**
 * Owner verifier result. When `authorized` is true, the caller may receive
 * `downloadUrl` in the status response or use the download endpoint.
 */
export interface OwnerVerification {
  authorized: boolean;
  /** Reason code for logging/diagnostics; never contains tokens or paths. */
  reason: "anonymous_token_match" | "user_owner_match" | "no_owner" | "token_mismatch" | "user_mismatch" | "missing_token" | "missing_user" | "anonymous_no_token";
}

/**
 * Input for {@link createOwnerVerifier}. The job record is captured at verifier
 * creation time; the request-side credentials are passed to the verifier call.
 */
export interface OwnerVerifierInput {
  job: JobRecord;
  /** Anonymous access token hash from the job record, if anonymous-owned. */
  accessTokenHash?: string;
  /** User ID of the job owner, if user-owned. */
  userId?: string;
  /** Owner type discriminator. */
  ownerType: "user" | "anonymous";
}

/**
 * Request-side credentials presented by the caller.
 */
export interface OwnerCredentials {
  /** Plaintext anonymous access token from the `X-Job-Access-Token` header. */
  anonymousToken?: string;
  /** Authenticated Firebase user from `requireAuth`/`optionalAuth` middleware. */
  user?: AuthenticatedUser;
}

/**
 * Create an owner verifier bound to a specific job's ownership metadata.
 *
 * The verifier performs constant-time token comparison for anonymous jobs and
 * direct userId equality for member jobs. It never logs tokens or object paths.
 */
export function createOwnerVerifier(input: OwnerVerifierInput) {
  return function verifyOwner(credentials: OwnerCredentials): OwnerVerification {
    if (input.ownerType === "anonymous") {
      if (!input.accessTokenHash) {
        return { authorized: false, reason: "no_owner" };
      }
      if (!credentials.anonymousToken) {
        return { authorized: false, reason: "anonymous_no_token" };
      }
      const match = verifyAccessTokenHash(credentials.anonymousToken, input.accessTokenHash);
      return match
        ? { authorized: true, reason: "anonymous_token_match" }
        : { authorized: false, reason: "token_mismatch" };
    }

    if (input.ownerType === "user") {
      if (!input.userId) {
        return { authorized: false, reason: "no_owner" };
      }
      if (!credentials.user) {
        return { authorized: false, reason: "missing_user" };
      }
      const match = credentials.user.uid === input.userId;
      return match
        ? { authorized: true, reason: "user_owner_match" }
        : { authorized: false, reason: "user_mismatch" };
    }

    return { authorized: false, reason: "no_owner" };
  };
}

// ---------------------------------------------------------------------------
// Protected download URL (decision: fresh signed URL after verification)
// ---------------------------------------------------------------------------

/**
 * Mint a fresh short-lived signed download URL for a job's result file, only
 * after owner verification has passed.
 *
 * In local mode, returns the proxy download route URL (no signed URL needed;
 * the route itself performs auth). In GCS mode, mints a v4 signed URL with
 * {@link PROTECTED_DOWNLOAD_URL_TTL_MS} expiry.
 *
 * @param job - The job record with a completed result.
 * @returns The download URL string, or undefined if no result is available.
 */
export async function getProtectedDownloadUrl(job: JobRecord): Promise<string | undefined> {
  if (job.status !== "completed") return undefined;
  if (!job.resultPath && !job.resultObjectPath) return undefined;

  if (!shouldUseGcs()) {
    // Local mode: the proxy download route handles auth + file streaming.
    return `${config.resultUrlBase.replace(/\/v1\/results$/, "")}/v1/jobs/${job.jobId}/download`;
  }

  if (!job.resultObjectPath) return undefined;

  const [downloadUrl] = await getBucket().file(job.resultObjectPath).getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + PROTECTED_DOWNLOAD_URL_TTL_MS,
  });

  return downloadUrl;
}

// ---------------------------------------------------------------------------
// Status response builder (omits downloadUrl when unauthorized)
// ---------------------------------------------------------------------------

/**
 * Build a {@link JobStatusResponse} from a job record, optionally including
 * `downloadUrl` only when the owner verifier has authorized the caller.
 *
 * Without a verifier (or when verification fails), `downloadUrl` is always
 * omitted from the response. This is the core download-boundary guard.
 */
export async function getStatusResponse(
  job: JobRecord,
  verifier?: (credentials: OwnerCredentials) => OwnerVerification,
  credentials?: OwnerCredentials,
): Promise<JobStatusResponse> {
  let downloadUrl: string | undefined;

  if (verifier && credentials) {
    const result = verifier(credentials);
    if (result.authorized) {
      downloadUrl = await getProtectedDownloadUrl(job);
    }
  }

  return {
    jobId: job.jobId,
    status: job.status as UploadStatus,
    progress: job.progress,
    message: job.message,
    downloadUrl,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    expiresAt: job.expiresAt,
  };
}

// ---------------------------------------------------------------------------
// Idempotent file deletion (decision D7/D12)
// ---------------------------------------------------------------------------

/**
 * Best-effort delete a GCS object. Does not throw if the object is missing.
 * Errors are logged with a generic message — object paths are never included
 * in logs or thrown errors.
 */
async function deleteGcsObject(objectPath: string | undefined): Promise<void> {
  if (!objectPath || !shouldUseGcs()) return;

  try {
    await getBucket().file(objectPath).delete({ ignoreNotFound: true });
  } catch (error) {
    // Log a generic error without the object path to avoid leaking names.
    const detail = error instanceof Error ? error.message : "unknown";
    console.error(
      JSON.stringify({
        level: "error",
        message: "GCS object deletion failed",
        detail: detail.replace(objectPath, "[REDACTED_PATH]"),
      }),
    );
  }
}

/**
 * Best-effort delete a local file. Does not throw if the file is missing.
 * Errors are logged with a generic message — file paths are never included.
 */
async function deleteLocalFile(localPath: string | undefined): Promise<void> {
  if (!localPath || shouldUseGcs()) return;

  try {
    await fs.rm(localPath, { force: true });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown";
    console.error(
      JSON.stringify({
        level: "error",
        message: "Local file deletion failed",
        detail: detail.replace(localPath, "[REDACTED_PATH]"),
      }),
    );
  }
}

/**
 * Idempotently delete all stored files for a job: GCS original, GCS result,
 * local upload, and local result.
 *
 * - Does not throw if objects/files are missing.
 * - Does not leak object paths or file names in errors or logs.
 * - Each deletion is best-effort and independent; a failure on one does not
 *   prevent the others from being attempted.
 *
 * @param job - The job record whose files should be deleted.
 */
export async function deleteStoredJobFiles(job: JobRecord): Promise<void> {
  await Promise.all([
    deleteGcsObject(job.originalObjectPath),
    deleteGcsObject(job.resultObjectPath),
    deleteLocalFile(job.sourcePath),
    deleteLocalFile(job.resultPath),
  ]);
}

/**
 * Extract anonymous access token from request headers using the shared header
 * name constant. Returns undefined if the header is absent.
 */
export function extractAnonymousTokenFromHeaders(headers: Record<string, string | string[] | undefined>): string | undefined {
  const value = headers[ANONYMOUS_ACCESS_TOKEN_HEADER.toLowerCase()]
    ?? headers[ANONYMOUS_ACCESS_TOKEN_HEADER];
  if (Array.isArray(value)) return value[0];
  return typeof value === "string" ? value : undefined;
}

export function createObjectPath(kind: UploadKind, jobId: string, fileName: string) {
  const prefix = kind === "original" ? config.gcsOriginalPrefix : config.gcsResultPrefix;
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${prefix}/${jobId}/${safeFileName}`;
}

async function uploadFile(localPath: string, objectPath: string, contentType: string) {
  await getBucket().upload(localPath, {
    destination: objectPath,
    metadata: {
      contentType,
      metadata: {
        uploadedAt: new Date().toISOString(),
      },
    },
  });
}

export async function createOriginalUploadUrl(input: {
  jobId: string;
  originalFileName: string;
}) {
  if (!shouldUseGcs()) return undefined;

  const objectPath = createObjectPath("original", input.jobId, input.originalFileName);
  const [uploadUrl] = await getBucket().file(objectPath).getSignedUrl({
    version: "v4",
    action: "write",
    expires: Date.now() + directUploadUrlTtlMs,
    contentType: hwpContentType,
  });

  return {
    objectPath,
    uploadUrl,
    headers: {
      "Content-Type": hwpContentType,
    },
  };
}

export async function persistOriginalFile(input: {
  jobId: string;
  localPath: string;
  originalFileName: string;
}) {
  if (!shouldUseGcs()) return undefined;

  const objectPath = createObjectPath("original", input.jobId, input.originalFileName);
  await uploadFile(input.localPath, objectPath, hwpContentType);
  return objectPath;
}

export async function downloadOriginalFile(input: {
  objectPath: string;
  localPath: string;
}) {
  if (!shouldUseGcs()) return;

  try {
    await getBucket().file(input.objectPath).download({
      destination: input.localPath,
    });
  } catch (error) {
    throw new Error(
      `GCS에서 원본 파일을 다운로드할 수 없습니다. objectPath=${input.objectPath}. 파일이 브라우저에서 GCS로 업로드되었는지, CORS 설정이 올바른지 확인하세요.`,
      { cause: error },
    );
  }
}

export async function publishResultFile(input: {
  jobId: string;
  localPath: string;
}) {
  if (!shouldUseGcs()) {
    return {
      objectPath: undefined,
      downloadUrl: `${config.resultUrlBase}/${input.jobId}.pdf`,
    };
  }

  const objectPath = createObjectPath("result", input.jobId, `${input.jobId}.pdf`);
  const bucket = getBucket();
  await uploadFile(input.localPath, objectPath, pdfContentType);

  const [downloadUrl] = await bucket.file(objectPath).getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + config.signedDownloadUrlTtlMs,
  });

  return { objectPath, downloadUrl };
}

export async function removeLocalResultFile(localPath: string | undefined) {
  if (!localPath || shouldUseGcs()) return;

  await fs.rm(localPath, { force: true });
}
