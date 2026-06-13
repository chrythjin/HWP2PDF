import path from "node:path";
import { Router } from "express";
import { API_ROUTES, type JobStatusResponse, type UploadResponse } from "@hwp2pdf/shared";
import { handleUploadMiddleware } from "../middleware/upload.js";
import { ApiError } from "../utils/api-error.js";
import { config } from "../config.js";
import { createJob, getJob } from "../services/job-store.js";
import { convertJobToPdf } from "../services/conversion-service.js";
import { persistOriginalFile, removeLocalResultFile } from "../services/storage-service.js";

export const router = Router();

router.get(API_ROUTES.HEALTH, (_request, response) => {
  response.json({ status: "ok" });
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
      progress: 60,
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
