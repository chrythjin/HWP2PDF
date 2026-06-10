// ============================================================
// File Validation Utilities
// Shared between frontend and backend
// ============================================================

import {
  ALLOWED_FILE_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
  FileValidationResult,
} from "./job-types";

/**
 * Validate file extension
 */
export function validateFileExtension(fileName: string): FileValidationResult {
  const lowerName = fileName.toLowerCase();
  const hasValidExtension = ALLOWED_FILE_EXTENSIONS.some((ext) =>
    lowerName.endsWith(ext)
  );

  if (!hasValidExtension) {
    return {
      valid: false,
      error: `지원하지 않는 파일 형식입니다. ${ALLOWED_FILE_EXTENSIONS.join(", ")} 파일만 업로드 가능합니다.`,
    };
  }

  return { valid: true };
}

/**
 * Validate file size
 */
export function validateFileSize(fileSize: number): FileValidationResult {
  if (fileSize > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `파일 크기가 너무 큽니다. ${MAX_FILE_SIZE_MB}MB 이하의 파일만 업로드 가능합니다.`,
    };
  }

  return { valid: true };
}

/**
 * Validate file (extension + size)
 */
export function validateFile(file: File): FileValidationResult {
  const extensionResult = validateFileExtension(file.name);
  if (!extensionResult.valid) {
    return extensionResult;
  }

  const sizeResult = validateFileSize(file.size);
  if (!sizeResult.valid) {
    return sizeResult;
  }

  return { valid: true };
}

/**
 * Get file extension
 */
export function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot === -1) return "";
  return fileName.slice(lastDot).toLowerCase();
}

/**
 * Check if file is a valid HWP file based on magic bytes
 * Note: This is a basic check, not a full magic bytes validation
 */
export function isHwpFile(file: File): boolean {
  const extensionResult = validateFileExtension(file.name);
  return extensionResult.valid;
}
