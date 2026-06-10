// ============================================================
// Job Status Types
// Shared between frontend and backend
// ============================================================

export type JobStatus =
  | "idle"
  | "uploading"
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "expired";

export interface UploadJob {
  jobId: string;
  status: JobStatus;
  originalFileName?: string;
  downloadUrl?: string;
  message?: string;
  createdAt: string;
  expiresAt?: string;
}

export interface UploadRequest {
  file: File;
}

export interface UploadResponse {
  jobId: string;
  status: JobStatus;
  message?: string;
  downloadUrl?: string;
}

export interface JobStatusResponse {
  jobId: string;
  status: JobStatus;
  message?: string;
  downloadUrl?: string;
}

// ============================================================
// API Error Types
// ============================================================

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================================
// Validation Types
// ============================================================

export const ALLOWED_FILE_EXTENSIONS = [".hwp"] as const;
export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB
export const MAX_FILE_SIZE_MB = 20;

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export type AllowedExtension = (typeof ALLOWED_FILE_EXTENSIONS)[number];
