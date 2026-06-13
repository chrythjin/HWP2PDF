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

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export const ALLOWED_EXTENSIONS = [".hwp"];
export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
export const SUPPORTED_MIME_TYPES = [
  "application/x-hwp",
  "application/octet-stream",
];

export function validateFile(file: {
  name: string;
  size: number;
}): FileValidationResult {
  const extension = file.name.toLowerCase().slice(-4);
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: "현재는 .hwp 파일만 지원합니다.",
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `파일 크기는 ${MAX_FILE_SIZE / 1024 / 1024}MB 이하여야 합니다.`,
    };
  }

  return { valid: true };
}

export const API_ROUTES = {
  UPLOAD: "/v1/upload",
  JOBS: "/v1/jobs",
  HEALTH: "/health",
} as const;

export const POLLING_INTERVAL = 2000; // 2 seconds
export const MAX_POLLING_TIME = 1000 * 60 * 5; // 5 minutes