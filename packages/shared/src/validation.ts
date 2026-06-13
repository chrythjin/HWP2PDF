import { ALLOWED_EXTENSIONS, validateFile } from "./index";
import type { FileValidationResult } from "./index";

export function validateFileExtension(fileName: string): FileValidationResult {
  return validateFile({ name: fileName, size: 0 });
}

export function validateFileSize(fileSize: number): FileValidationResult {
  return validateFile({ name: "file.hwp", size: fileSize });
}

export { validateFile };

export function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot === -1) return "";
  return fileName.slice(lastDot).toLowerCase();
}

export function isHwpFile(file: { name: string; size: number }): boolean {
  return ALLOWED_EXTENSIONS.includes(getFileExtension(file.name));
}
