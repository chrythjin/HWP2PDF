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
  | "expired";

export interface JobStatusResponse {
  jobId: string;
  status: UploadStatus;
  progress?: number;
  message?: string;
  downloadUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  expiresAt?: string;
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

export const API_ROUTES = {
  UPLOAD: "/v1/upload",
  UPLOADS_INITIATE: "/v1/uploads/initiate",
  UPLOADS_COMPLETE: "/v1/uploads/complete",
  JOBS: "/v1/jobs",
  HEALTH: "/health",
} as const;

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
