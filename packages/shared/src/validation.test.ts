import { describe, expect, it } from "vitest";
import { MAX_FILE_SIZE } from "./index";
import { validateFileExtension, validateFileSize } from "./validation";

const invalidExtensionError = "현재는 .hwp 파일만 지원합니다.";
const fileTooLargeError = `파일 크기는 ${MAX_FILE_SIZE / 1024 / 1024}MB 이하여야 합니다.`;

describe("validateFileExtension", () => {
  it("accepts a supported HWP filename", () => {
    expect(validateFileExtension("sample.hwp")).toEqual({ valid: true });
  });

  it("rejects an unsupported filename", () => {
    expect(validateFileExtension("sample.txt")).toEqual({
      valid: false,
      error: invalidExtensionError,
    });
  });
});

describe("validateFileSize", () => {
  it("accepts the configured size boundary", () => {
    expect(validateFileSize(MAX_FILE_SIZE)).toEqual({ valid: true });
  });

  it("rejects values larger than the configured limit", () => {
    expect(validateFileSize(MAX_FILE_SIZE + 1)).toEqual({
      valid: false,
      error: fileTooLargeError,
    });
  });
});
