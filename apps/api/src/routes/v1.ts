import { Router } from "express";
import { API_ROUTES, type JobStatusResponse, type UploadResponse } from "@hwp2pdf/shared";
import { handleUploadMiddleware } from "../middleware/upload.js";
import { ApiError } from "../utils/api-error.js";
import { createJob, getJob } from "../services/job-store.js";
import { convertJobToPdf } from "../services/conversion-service.js";

export const router = Router();

router.get(API_ROUTES.HEALTH, (_request, response) => {
  response.json({ status: "ok" });
});

router.post(API_ROUTES.UPLOAD, handleUploadMiddleware, (request, response, next) => {
  const file = request.file;
  if (!file) {
    next(new ApiError(422, "file_required", "업로드할 HWP 파일을 선택하세요."));
    return;
  }

  const jobId = crypto.randomUUID();
  const job = createJob({
    jobId,
    originalFileName: file.originalname,
    sourcePath: file.path,
    status: "queued",
    progress: 60,
    message: "변환 작업이 대기열에 등록되었습니다.",
  });

  void convertJobToPdf({ jobId: job.jobId, sourcePath: job.sourcePath });

  const body: UploadResponse = {
    jobId: job.jobId,
    status: job.status,
    message: job.message,
  };

  response.status(202).location(`${API_ROUTES.JOBS}/${job.jobId}`).json(body);
});

router.get(`${API_ROUTES.JOBS}/:jobId`, (request, response, next) => {
  const job = getJob(request.params.jobId);
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
  };

  response.json(body);
});
