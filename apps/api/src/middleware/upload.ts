import type { Request, Response, NextFunction } from "express";
import fs from "node:fs/promises";
import multer from "multer";
import { ALLOWED_EXTENSIONS, MAX_FILE_SIZE, validateFile } from "@hwp2pdf/shared";
import { ApiError } from "../utils/api-error.js";
import { config } from "../config.js";

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => {
    callback(null, config.uploadDirectory);
  },
  filename: (_request, file, callback) => {
    const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    callback(null, `${crypto.randomUUID()}-${safeOriginalName}`);
  },
});

export const uploadSingleHwp = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter: (_request, file, callback) => {
    const validation = validateFile({ name: file.originalname, size: file.size ?? 0 });
    if (!validation.valid) {
      callback(new ApiError(422, "invalid_file", validation.error ?? "지원하지 않는 파일입니다."));
      return;
    }

    const extension = file.originalname.toLowerCase().slice(-4);
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      callback(new ApiError(422, "invalid_file_extension", "현재는 .hwp 파일만 지원합니다."));
      return;
    }

    callback(null, true);
  },
}).single("file");

const HWP_OLE_SIGNATURE = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

export async function validateHwpFileSignature(filePath: string): Promise<boolean> {
  const handle = await fs.open(filePath, "r");
  try {
    const header = Buffer.alloc(HWP_OLE_SIGNATURE.length);
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    return bytesRead === header.length && header.equals(HWP_OLE_SIGNATURE);
  } finally {
    await handle.close();
  }
}

async function removeRejectedUpload(filePath: string): Promise<void> {
  try {
    await fs.rm(filePath, { force: true });
  } catch {
    console.error(JSON.stringify({ level: "error", event: "rejected_upload_cleanup_failed" }));
  }
}

export function handleUploadMiddleware(request: Request, response: Response, next: NextFunction) {
  uploadSingleHwp(request, response, async (error) => {
    if (!error) {
      if (request.file) {
        try {
          if (!(await validateHwpFileSignature(request.file.path))) {
            await removeRejectedUpload(request.file.path);
            next(new ApiError(422, "invalid_file_signature", "올바른 HWP 파일이 아닙니다."));
            return;
          }
        } catch (validationError) {
          await removeRejectedUpload(request.file.path);
          next(validationError);
          return;
        }
      }
      next();
      return;
    }

    if (error instanceof ApiError) {
      next(error);
      return;
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        next(new ApiError(413, "file_too_large", `파일 크기는 ${MAX_FILE_SIZE / 1024 / 1024}MB 이하여야 합니다.`));
        return;
      }

      next(new ApiError(400, "upload_error", "파일 업로드 요청이 올바르지 않습니다."));
      return;
    }

    next(new ApiError(400, "upload_error", "파일 업로드에 실패했습니다."));
  });
}
