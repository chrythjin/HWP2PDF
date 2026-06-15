import fs from "node:fs/promises";
import path from "node:path";
import { Router } from "express";
import {
  API_ROUTES,
  PROGRESS,
  type DirectUploadCompleteRequest,
  type DirectUploadInitRequest,
  type DirectUploadInitResponse,
  type JobStatusResponse,
  type UploadResponse,
  validateFile,
} from "@hwp2pdf/shared";
import { handleUploadMiddleware } from "../middleware/upload.js";
import { ApiError } from "../utils/api-error.js";
import { config } from "../config.js";
import { createJob, getJob } from "../services/job-store.js";
import { convertJobToPdf } from "../services/conversion-service.js";
import {
  createOriginalUploadUrl,
  directUploadUrlTtlMs,
  downloadOriginalFile,
  persistOriginalFile,
  removeLocalResultFile,
  shouldUseGcs,
} from "../services/storage-service.js";

export const router = Router();

router.get(API_ROUTES.HEALTH, (_request, response) => {
  response.json({ status: "ok" });
});

router.post(API_ROUTES.UPLOADS_INITIATE, async (request, response, next) => {
  try {
    const body = request.body as Partial<DirectUploadInitRequest>;
    if (!body.fileName || typeof body.fileSize !== "number") {
      next(new ApiError(422, "invalid_upload_request", "파일 이름과 크기를 확인하세요."));
      return;
    }

    const validation = validateFile({ name: body.fileName, size: body.fileSize });
    if (!validation.valid) {
      next(new ApiError(422, "invalid_file", validation.error ?? "지원하지 않는 파일입니다."));
      return;
    }

    if (!shouldUseGcs()) {
      next(new ApiError(409, "direct_upload_unavailable", "직접 업로드는 GCS 저장소 모드에서만 사용할 수 있습니다."));
      return;
    }

    const jobId = crypto.randomUUID();
    const upload = await createOriginalUploadUrl({
      jobId,
      originalFileName: body.fileName,
    });

    if (!upload) {
      next(new ApiError(409, "direct_upload_unavailable", "직접 업로드 URL을 만들 수 없습니다."));
      return;
    }

    const responseBody: DirectUploadInitResponse = {
      uploadMode: "direct",
      jobId,
      uploadUrl: upload.uploadUrl,
      objectPath: upload.objectPath,
      expiresAt: new Date(Date.now() + directUploadUrlTtlMs).toISOString(),
      headers: upload.headers,
    };

    response.status(201).json(responseBody);
  } catch (error) {
    next(error);
  }
});

router.post(API_ROUTES.UPLOADS_COMPLETE, async (request, response, next) => {
  try {
    const body = request.body as Partial<DirectUploadCompleteRequest>;
    if (!body.jobId || !body.objectPath || !body.fileName || typeof body.fileSize !== "number") {
      next(new ApiError(422, "invalid_upload_complete_request", "업로드 완료 정보가 올바르지 않습니다."));
      return;
    }

    const validation = validateFile({ name: body.fileName, size: body.fileSize });
    if (!validation.valid) {
      next(new ApiError(422, "invalid_file", validation.error ?? "지원하지 않는 파일입니다."));
      return;
    }

    const expectedPrefix = `${config.gcsOriginalPrefix}/${body.jobId}/`;
    if (!body.objectPath.startsWith(expectedPrefix)) {
      next(new ApiError(422, "invalid_upload_object", "업로드된 원본 파일 경로가 작업 ID와 일치하지 않습니다."));
      return;
    }

    await fs.mkdir(config.uploadDirectory, { recursive: true });
    const safeOriginalName = body.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const sourcePath = path.join(config.uploadDirectory, `${body.jobId}-${safeOriginalName}`);
    await downloadOriginalFile({ objectPath: body.objectPath, localPath: sourcePath });

    const expiresAt = new Date(Date.now() + config.jobRetentionMs).toISOString();
    const job = await createJob({
      jobId: body.jobId,
      originalFileName: body.fileName,
      sourcePath,
      originalObjectPath: body.objectPath,
      expiresAt,
      status: "queued",
      progress: PROGRESS.QUEUED,
      message: "변환 작업이 대기열에 등록되었습니다.",
    });

    void convertJobToPdf({ jobId: job.jobId, sourcePath: job.sourcePath });

    const responseBody: UploadResponse = {
      jobId: job.jobId,
      status: job.status,
      message: job.message,
      expiresAt: job.expiresAt,
    };

    response.status(202).location(`${API_ROUTES.JOBS}/${job.jobId}`).json(responseBody);
  } catch (error) {
    next(error);
  }
});

router.post(API_ROUTES.UPLOAD, handleUploadMiddleware, async (request, response, next) => {
  const file = request.file;
  if (!file) {
    next(new ApiError(422, "file_required", "업로드할 HWP 파일을 선택하세요."));
    return;
  }

  const jobId = crypto.randomUUID();

  try {
    const originalObjectPath = await persistOriginalFile({
      jobId,
      localPath: file.path,
      originalFileName: file.originalname,
    });

    const expiresAt = new Date(Date.now() + config.jobRetentionMs).toISOString();

    const job = await createJob({
      jobId,
      originalFileName: file.originalname,
      sourcePath: file.path,
      originalObjectPath,
      expiresAt,
      status: "queued",
      progress: PROGRESS.QUEUED,
      message: "변환 작업이 대기열에 등록되었습니다.",
    });

    void convertJobToPdf({ jobId: job.jobId, sourcePath: job.sourcePath });

    const body: UploadResponse = {
      jobId: job.jobId,
      status: job.status,
      message: job.message,
      expiresAt: job.expiresAt,
    };

    response.status(202).location(`${API_ROUTES.JOBS}/${job.jobId}`).json(body);
  } catch (error) {
    next(error);
  }
});

router.get(`${API_ROUTES.JOBS}/:jobId`, async (request, response, next) => {
  const job = await getJob(request.params.jobId);
  if (!job) {
    next(new ApiError(404, "job_not_found", "작업을 찾을 수 없습니다."));
    return;
  }

  const body: JobStatusResponse = {
    jobId: job.jobId,
    status: job.status,
    progress: job.progress,
    message: job.message,
    downloadUrl: job.downloadUrl,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    expiresAt: job.expiresAt,
  };

  response.json(body);
});

router.get("/v1/results/:fileName", async (request, response, next) => {
  const { fileName } = request.params;
  if (!fileName.endsWith(".pdf")) {
    next(new ApiError(404, "result_not_found", "다운로드 파일을 찾을 수 없습니다."));
    return;
  }

  const jobId = fileName.slice(0, -4);
  const job = await getJob(jobId);
  if (!job) {
    next(new ApiError(404, "job_not_found", "작업을 찾을 수 없습니다."));
    return;
  }

  if (job.status === "expired") {
    await removeLocalResultFile(job.resultPath);
    next(new ApiError(410, "job_expired", job.message ?? "다운로드 가능 시간이 만료되었습니다."));
    return;
  }

  if (job.status !== "completed" || !job.resultPath) {
    next(new ApiError(409, "result_not_ready", "아직 다운로드할 수 있는 PDF가 없습니다."));
    return;
  }

  response.download(path.resolve(job.resultPath), `${job.jobId}.pdf`, (error) => {
    if (error) next(error);
  });
});
