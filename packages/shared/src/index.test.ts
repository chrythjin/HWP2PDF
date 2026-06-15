import { describe, expect, it } from "vitest";
import {
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
  validateFile,
} from "./index";

const invalidExtensionError = "현재는 .hwp 파일만 지원합니다.";
const fileTooLargeError = `파일 크기는 ${MAX_FILE_SIZE / 1024 / 1024}MB 이하여야 합니다.`;

describe("validateFile", () => {
  it("accepts a supported HWP file at the size boundary", () => {
    expect(validateFile({ name: "sample.hwp", size: MAX_FILE_SIZE })).toEqual({
      valid: true,
    });
  });

  it("rejects unsupported file extensions", () => {
    expect(validateFile({ name: "sample.txt", size: 1 })).toEqual({
      valid: false,
      error: invalidExtensionError,
    });
  });

  it("uses only the last four filename characters for extension checks", () => {
    expect(validateFile({ name: "sample.hwpx", size: 1 })).toEqual({
      valid: false,
      error: invalidExtensionError,
    });
  });

  it("rejects files larger than the configured size limit", () => {
    expect(validateFile({ name: "sample.hwp", size: MAX_FILE_SIZE + 1 })).toEqual({
      valid: false,
      error: fileTooLargeError,
    });
  });
});

describe("shared constants", () => {
  it("exports the allowed HWP extension", () => {
    expect(ALLOWED_EXTENSIONS).toEqual([".hwp"]);
  });
});
