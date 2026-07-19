import type { Request, Response, NextFunction } from "express";
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

export function handleUploadMiddleware(request: Request, response: Response, next: NextFunction) {
  uploadSingleHwp(request, response, (error) => {
    if (!error) {
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
