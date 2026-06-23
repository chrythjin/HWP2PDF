import { ALLOWED_EXTENSIONS, validateFile } from "./index";
import type { FileValidationResult } from "./index";

export {
  validateFile,
  validateFileExtension,
  validateFileSize,
  validateBoardCategory,
  validateBoardPost,
  validateUploadSession,
} from "./index";

export function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot === -1) return "";
  return fileName.slice(lastDot).toLowerCase();
}

export function isHwpFile(file: { name: string; size: number }): boolean {
  return ALLOWED_EXTENSIONS.includes(getFileExtension(file.name));
}