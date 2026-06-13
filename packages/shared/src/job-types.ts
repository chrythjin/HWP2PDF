export type {
  DirectUploadCompleteRequest,
  DirectUploadInitRequest,
  DirectUploadInitResponse,
  FileValidationResult,
  JobStatusResponse,
  UploadResponse,
  UploadStatus as JobStatus,
  UploadStatus,
} from "./index";

export { ALLOWED_EXTENSIONS as ALLOWED_FILE_EXTENSIONS, MAX_FILE_SIZE as MAX_FILE_SIZE_BYTES } from "./index";

export const MAX_FILE_SIZE_MB = 20;
export type AllowedExtension = ".hwp";
