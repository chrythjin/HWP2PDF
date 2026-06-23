// ---------------------------------------------------------------------------
// Shared API contracts for HWP2PDF.
//
// This module is the single source of truth for request/response DTOs, route
// constants, validation helpers, and retention policy constants shared across
// the API (`apps/api`) and the web client (`apps/web`).
//
// Guardrail: this module MUST NOT export server password/login DTOs. Auth is
// delegated to Firebase Client SDK + Firebase Admin ID token verification.
// See `.omo/plans/auth-history-delete-board-final.md` decisions D1/D13.
// ---------------------------------------------------------------------------

export interface UploadResponse {
  jobId: string;
  status: UploadStatus;
  message?: string;
  downloadUrl?: string;
  expiresAt?: string;
}

export type UploadStatus =
  | "idle"
  | "uploading"
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "expired"
  | "deleted";

export interface JobStatusResponse {
  jobId: string;
  status: UploadStatus;
  progress?: number;
  message?: string;
  downloadUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  expiresAt?: string;
  /** When the downloadable result file expires. Separate from metadataExpiresAt. */
  downloadExpiresAt?: string;
  /** When the job metadata/history entry expires (member 30-day retention). */
  metadataExpiresAt?: string;
  /** ISO timestamp when the member deleted the job. */
  deletedAt?: string;
  /** Who deleted the job (userId or "system"). */
  deletedBy?: string;
  /** Tombstone retention deadline; after this the metadata row may be purged. */
  tombstoneUntil?: string;
}

export interface DirectUploadInitRequest {
  fileName: string;
  fileSize: number;
}

export interface DirectUploadInitResponse {
  uploadMode: "direct";
  jobId: string;
  uploadUrl: string;
  objectPath: string;
  expiresAt: string;
  headers: Record<string, string>;
}

export interface DirectUploadCompleteRequest {
  jobId: string;
  objectPath: string;
  fileName: string;
  fileSize: number;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
  message?: string;
}

// ---------------------------------------------------------------------------
// Owner-aware job contracts (decision D6/D7/D12)
// ---------------------------------------------------------------------------

/** Discriminated owner model for a job or upload session. */
export type JobOwner =
  | { ownerType: "user"; userId: string }
  | { ownerType: "anonymous"; accessTokenHash: string };

/**
 * Server-side UploadSession that binds direct-upload initiate -> complete ->
 * status/download ownership (decision D6).
 *
 * The plaintext anonymous access token is NEVER stored here; only its hash is
 * persisted. The plaintext token is returned exactly once in the initiate
 * response via {@link AnonymousAccessTokenResponse}.
 */
export interface UploadSession {
  jobId: string;
  objectPath: string;
  fileName: string;
  fileSize: number;
  ownerType: "user" | "anonymous";
  /** Present when ownerType === "user". */
  userId?: string;
  /** SHA-256 hash of the anonymous access token. Present when ownerType === "anonymous". */
  accessTokenHash?: string;
  /** When the upload session itself expires (initiate window). */
  expiresAt: string;
  /** When the client called upload-complete; absent until then. */
  completedAt?: string;
}

/**
 * Response issued exactly once at upload initiate time for anonymous jobs.
 * The plaintext `accessToken` MUST be sent back by the client via the
 * `X-Job-Access-Token` header (decision D13). It is never stored server-side
 * and never returned again.
 */
export interface AnonymousAccessTokenResponse {
  jobId: string;
  /** Plaintext token, returned once. Server stores only the hash. */
  accessToken: string;
  /** Header name the client must use for status/download calls. */
  header: string;
}

// ---------------------------------------------------------------------------
// Board DTOs (decision D8)
// ---------------------------------------------------------------------------

export type BoardCategory = "general" | "qna" | "notice";

export const BOARD_CATEGORIES: readonly BoardCategory[] = [
  "general",
  "qna",
  "notice",
] as const;

export const BOARD_DEFAULT_PAGE_SIZE = 20;
export const BOARD_MAX_PAGE_SIZE = 100;

export interface BoardCreatePostRequest {
  title: string;
  body: string;
  category: BoardCategory;
}

export interface BoardUpdatePostRequest {
  title?: string;
  body?: string;
  category?: BoardCategory;
}

/** Full post as returned by the API. authorId/authorName are server-derived. */
export interface BoardPost {
  id: string;
  title: string;
  body: string;
  category: BoardCategory;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

/** Lightweight post row for list views. */
export interface BoardPostSummary {
  id: string;
  title: string;
  category: BoardCategory;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface BoardListRequest {
  category?: BoardCategory;
  page?: number;
  pageSize?: number;
}

export interface BoardListResponse {
  data: BoardPostSummary[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

// ---------------------------------------------------------------------------
// Route constants
// ---------------------------------------------------------------------------

export const API_ROUTES = {
  HEALTH: "/health",
  UPLOAD: "/v1/upload",
  UPLOADS_INITIATE: "/v1/uploads/initiate",
  UPLOADS_COMPLETE: "/v1/uploads/complete",
  JOBS: "/v1/jobs",
  JOB: "/v1/jobs/:jobId",
  JOB_DOWNLOAD: "/v1/jobs/:jobId/download",
  RESULTS: "/v1/results/:fileName",
  ME_JOBS: "/v1/me/jobs",
  ME_JOB: "/v1/me/jobs/:jobId",
  BOARD_POSTS: "/v1/board/posts",
  BOARD_POST: "/v1/board/posts/:postId",
} as const;

// ---------------------------------------------------------------------------
// Retention / TTL constants
// ---------------------------------------------------------------------------

/** How long an upload session initiate window stays valid. */
export const UPLOAD_SESSION_TTL_MS = 1000 * 60 * 15; // 15 minutes

/** Default download result TTL. Separate from metadata retention. */
export const DEFAULT_DOWNLOAD_TTL_MS = 1000 * 60 * 60; // 1 hour

/** Member metadata retention: 30 days (decision D7). */
export const DEFAULT_METADATA_RETENTION_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

/** Tombstone retention after member delete: 30 days (decision D12). */
export const TOMBSTONE_RETENTION_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

/** Header name for anonymous job access token transport (decision D13). */
export const ANONYMOUS_ACCESS_TOKEN_HEADER = "X-Job-Access-Token";

// ---------------------------------------------------------------------------
// File validation
// ---------------------------------------------------------------------------

export const ALLOWED_EXTENSIONS = [".hwp"];
export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
export const SUPPORTED_MIME_TYPES = [
  "application/x-hwp",
  "application/octet-stream",
];

const INVALID_EXTENSION_ERROR = "현재는 .hwp 파일만 지원합니다.";
const FILE_TOO_LARGE_ERROR = `파일 크기는 ${MAX_FILE_SIZE / 1024 / 1024}MB 이하여야 합니다.`;

export function validateFileExtension(fileName: string): FileValidationResult {
  const extension = fileName.toLowerCase().slice(-4);
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: INVALID_EXTENSION_ERROR,
    };
  }

  return { valid: true };
}

export function validateFileSize(fileSize: number): FileValidationResult {
  if (fileSize > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: FILE_TOO_LARGE_ERROR,
    };
  }

  return { valid: true };
}

export function validateFile(file: {
  name: string;
  size: number;
}): FileValidationResult {
  const extensionValidation = validateFileExtension(file.name);
  if (!extensionValidation.valid) {
    return extensionValidation;
  }

  const sizeValidation = validateFileSize(file.size);
  if (!sizeValidation.valid) {
    return sizeValidation;
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// Board validation
// ---------------------------------------------------------------------------

const INVALID_BOARD_CATEGORY_ERROR = "게시판 카테고리는 general, qna, notice 중 하나여야 합니다.";
const BOARD_TITLE_REQUIRED_ERROR = "게시판 제목을 입력하세요.";
const BOARD_BODY_REQUIRED_ERROR = "게시판 내용을 입력하세요.";

export function validateBoardCategory(category: string): FileValidationResult {
  if (!BOARD_CATEGORIES.includes(category as BoardCategory)) {
    return { valid: false, error: INVALID_BOARD_CATEGORY_ERROR };
  }
  return { valid: true };
}

export function validateBoardPost(input: {
  title?: string;
  body?: string;
  category?: string;
}): FileValidationResult {
  if (!input.title || input.title.trim().length === 0) {
    return { valid: false, error: BOARD_TITLE_REQUIRED_ERROR };
  }
  if (!input.body || input.body.trim().length === 0) {
    return { valid: false, error: BOARD_BODY_REQUIRED_ERROR };
  }
  const categoryResult = validateBoardCategory(input.category ?? "");
  if (!categoryResult.valid) {
    return categoryResult;
  }
  return { valid: true };
}

// ---------------------------------------------------------------------------
// UploadSession validation
// ---------------------------------------------------------------------------

const UPLOAD_SESSION_OWNER_ERROR = "업로드 세션 소유자 정보가 올바르지 않습니다.";
const UPLOAD_SESSION_ANON_TOKEN_ERROR = "익명 업로드 세션에는 access token hash가 필요합니다.";
const UPLOAD_SESSION_USER_ID_ERROR = "회원 업로드 세션에는 userId가 필요합니다.";

export function validateUploadSession(session: {
  jobId?: string;
  objectPath?: string;
  fileName?: string;
  fileSize?: number;
  ownerType?: string;
  userId?: string;
  accessTokenHash?: string;
  expiresAt?: string;
}): FileValidationResult {
  if (!session.jobId || !session.objectPath || !session.fileName || typeof session.fileSize !== "number" || !session.expiresAt) {
    return { valid: false, error: UPLOAD_SESSION_OWNER_ERROR };
  }

  if (session.ownerType === "anonymous") {
    if (!session.accessTokenHash) {
      return { valid: false, error: UPLOAD_SESSION_ANON_TOKEN_ERROR };
    }
  } else if (session.ownerType === "user") {
    if (!session.userId) {
      return { valid: false, error: UPLOAD_SESSION_USER_ID_ERROR };
    }
  } else {
    return { valid: false, error: UPLOAD_SESSION_OWNER_ERROR };
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// Polling / progress constants
// ---------------------------------------------------------------------------

export const POLLING_INTERVAL = 2000; // 2 seconds
export const MAX_POLLING_TIME = 1000 * 60 * 5; // 5 minutes

// Progress constants for job lifecycle
export const PROGRESS = {
  UPLOAD_START: 5,
  UPLOAD_COMPLETE: 50,
  QUEUED: 60,
  PROCESSING_START: 70,
  COMPLETED: 100,
  FAILED: 0,
} as const;