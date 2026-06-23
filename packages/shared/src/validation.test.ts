import { describe, expect, it } from "vitest";
import { MAX_FILE_SIZE, UPLOAD_SESSION_TTL_MS } from "./index";
import {
  validateFileExtension,
  validateFileSize,
  validateBoardCategory,
  validateBoardPost,
  validateUploadSession,
} from "./validation";

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

describe("validateBoardCategory (re-exported)", () => {
  it("accepts general/qna/notice", () => {
    expect(validateBoardCategory("general").valid).toBe(true);
    expect(validateBoardCategory("qna").valid).toBe(true);
    expect(validateBoardCategory("notice").valid).toBe(true);
  });

  it("rejects unknown categories", () => {
    expect(validateBoardCategory("foo").valid).toBe(false);
  });
});

describe("validateBoardPost (re-exported)", () => {
  it("accepts a valid post", () => {
    expect(
      validateBoardPost({ title: "t", body: "b", category: "general" }).valid,
    ).toBe(true);
  });

  it("rejects empty title", () => {
    expect(
      validateBoardPost({ title: "", body: "b", category: "general" }).valid,
    ).toBe(false);
  });
});

describe("validateUploadSession (re-exported)", () => {
  it("accepts a valid anonymous session", () => {
    const result = validateUploadSession({
      jobId: "j1",
      objectPath: "originals/j1/f.hwp",
      fileName: "f.hwp",
      fileSize: 10,
      ownerType: "anonymous",
      accessTokenHash: "h",
      expiresAt: new Date(Date.now() + UPLOAD_SESSION_TTL_MS).toISOString(),
    });
    expect(result.valid).toBe(true);
  });

  it("rejects anonymous session without token hash", () => {
    const result = validateUploadSession({
      jobId: "j2",
      objectPath: "originals/j2/f.hwp",
      fileName: "f.hwp",
      fileSize: 10,
      ownerType: "anonymous",
      expiresAt: new Date(Date.now() + UPLOAD_SESSION_TTL_MS).toISOString(),
    });
    expect(result.valid).toBe(false);
  });
});