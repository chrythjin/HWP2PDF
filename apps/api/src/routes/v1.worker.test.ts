import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import type { Express } from "express";
import { createApp } from "../app.js";
import {
  createJob,
  getJob,
  type JobRecord,
  type CreateJobInput,
} from "../services/job-store.js";
import { setTokenVerifierForTesting } from "../middleware/auth.js";
import {
  setOidcVerifierForTesting,
  buildMockOidcToken,
  getExpectedAudience,
} from "../middleware/worker-auth.js";
import { resetMockDispatcher, getMockEnqueuedJobIds } from "../services/cloud-tasks-dispatcher.js";

// ---------------------------------------------------------------------------
// Tests for the internal worker endpoint (Todo 6).
//
// Verifies:
//   - Worker endpoint without Authorization header returns 401.
//   - Worker endpoint with wrong OIDC token returns 403.
//   - Worker endpoint with correct OIDC processes a queued job.
//   - Duplicate task (already completed) no-ops with 200.
//   - Deleted job no-ops with 200.
//   - Expired job no-ops with 200.
//   - Already-processing job no-ops with 200.
//   - Failed conversion sets job status to "failed".
//   - Upload complete enqueues via dispatcher (mock mode).
// ---------------------------------------------------------------------------

// Mock the conversion service to avoid spawning LibreOffice.
// Use vi.hoisted so the mock fn is available when vi.mock's factory runs.
const { convertJobToPdfMock } = vi.hoisted(() => ({
  convertJobToPdfMock: vi.fn(),
}));
vi.mock("../services/conversion-service.js", () => ({
  convertJobToPdf: convertJobToPdfMock,
}));

// Mock storage-service GCS functions.
vi.mock("../services/storage-service.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/storage-service.js")>();
  return {
    ...actual,
    shouldUseGcs: vi.fn(() => false),
    persistOriginalFile: vi.fn(async () => undefined),
    downloadOriginalFile: vi.fn(async () => undefined),
    createOriginalUploadUrl: vi.fn(async () => undefined),
    getProtectedDownloadUrl: vi.fn(async () => undefined),
  };
});

function makeJob(overrides: Partial<JobRecord> = {}): JobRecord {
  const now = new Date().toISOString();
  return {
    jobId: "job-worker-test",
    originalFileName: "test.hwp",
    sourcePath: "/tmp/uploads/test.hwp",
    status: "queued",
    progress: 60,
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("worker endpoint POST /internal/workers/convert (Todo 6)", () => {
  let app: Express;
  let tempUploadDir: string;
  let tempResultDir: string;

  beforeEach(async () => {
    setTokenVerifierForTesting(async (idToken: string) => {
      // Simple mock Firebase verifier for upload routes.
      if (idToken === "valid-user-token") {
        return { uid: "user-123", admin: false, boardModerator: false };
      }
      throw new Error("invalid token");
    });

    // Set up mock OIDC verifier for worker auth.
    process.env.FIREBASE_ADMIN_MODE = "mock";
    process.env.INTERNAL_WORKER_AUDIENCE = "test-worker-audience";
    process.env.INTERNAL_WORKER_URL = "http://localhost:8080/internal/workers/convert";

    setOidcVerifierForTesting(async (token: string) => {
      // Accept mock OIDC tokens.
      if (token.startsWith("mock_oidc_token_")) {
        const payloadB64 = token.slice("mock_oidc_token_".length);
        const json = Buffer.from(payloadB64, "base64url").toString("utf8");
        const payload = JSON.parse(json);
        return payload;
      }
      throw new Error("invalid OIDC token");
    });

    tempUploadDir = await fs.mkdtemp(path.join(os.tmpdir(), "hwp2pdf-worker-upload-"));
    tempResultDir = await fs.mkdtemp(path.join(os.tmpdir(), "hwp2pdf-worker-result-"));
    process.env.UPLOAD_DIR = tempUploadDir;
    process.env.RESULT_DIR = tempResultDir;

    resetMockDispatcher();
    convertJobToPdfMock.mockReset();
    convertJobToPdfMock.mockResolvedValue(undefined);

    app = await createApp();
  });

  afterEach(async () => {
    setTokenVerifierForTesting(null);
    setOidcVerifierForTesting(null);
    delete process.env.UPLOAD_DIR;
    delete process.env.RESULT_DIR;
    delete process.env.INTERNAL_WORKER_AUDIENCE;
    delete process.env.INTERNAL_WORKER_URL;
    await fs.rm(tempUploadDir, { recursive: true, force: true });
    await fs.rm(tempResultDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // Auth boundary tests
  // -----------------------------------------------------------------------

  describe("authentication", () => {
    it("returns 401 without Authorization header", async () => {
      const res = await request(app)
        .post("/internal/workers/convert")
        .send({ jobId: "job-001" });

      expect(res.status).toBe(401);
    });

    it("returns 401 with empty Bearer token", async () => {
      const res = await request(app)
        .post("/internal/workers/convert")
        .set("Authorization", "Bearer ")
        .send({ jobId: "job-001" });

      expect(res.status).toBe(401);
    });

    it("returns 403 with wrong OIDC token", async () => {
      const res = await request(app)
        .post("/internal/workers/convert")
        .set("Authorization", "Bearer invalid-token")
        .send({ jobId: "job-001" });

      expect(res.status).toBe(403);
    });

    it("returns 403 with correct OIDC format but wrong audience", async () => {
      const token = buildMockOidcToken({
        aud: "wrong-audience",
        iss: "https://accounts.google.com",
        email: "worker@project.iam.gserviceaccount.com",
      });

      const res = await request(app)
        .post("/internal/workers/convert")
        .set("Authorization", `Bearer ${token}`)
        .send({ jobId: "job-001" });

      expect(res.status).toBe(403);
    });
  });

  // -----------------------------------------------------------------------
  // Idempotent processing tests
  // -----------------------------------------------------------------------

  describe("idempotent processing", () => {
    it("processes a queued job and returns 200", async () => {
      const job = makeJob({ jobId: "worker-process-001" });
      await createJob(job as CreateJobInput);

      const token = buildMockOidcToken({
        aud: getExpectedAudience(),
        iss: "https://accounts.google.com",
        email: "worker@project.iam.gserviceaccount.com",
      });

      const res = await request(app)
        .post("/internal/workers/convert")
        .set("Authorization", `Bearer ${token}`)
        .send({ jobId: "worker-process-001" });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.jobId).toBe("worker-process-001");
      expect(convertJobToPdfMock).toHaveBeenCalledWith({
        jobId: "worker-process-001",
        sourcePath: "/tmp/uploads/test.hwp",
      });
    });

    it("claims concurrent duplicate queued worker deliveries exactly once", async () => {
      const job = makeJob({ jobId: "worker-race-001" });
      await createJob(job as CreateJobInput);

      let releaseConversion: (() => void) | undefined;
      convertJobToPdfMock.mockImplementationOnce(
        () => new Promise<void>((resolve) => {
          releaseConversion = resolve;
        }),
      );

      const token = buildMockOidcToken({
        aud: getExpectedAudience(),
        iss: "https://accounts.google.com",
        email: "worker@project.iam.gserviceaccount.com",
      });

      const firstRequest = request(app)
        .post("/internal/workers/convert")
        .set("Authorization", `Bearer ${token}`)
        .send({ jobId: "worker-race-001" })
        .then((res) => res);
      const secondRequest = request(app)
        .post("/internal/workers/convert")
        .set("Authorization", `Bearer ${token}`)
        .send({ jobId: "worker-race-001" })
        .then((res) => res);

      await vi.waitFor(() => {
        expect(convertJobToPdfMock).toHaveBeenCalledTimes(1);
      });
      releaseConversion?.();

      const [firstResponse, secondResponse] = await Promise.all([firstRequest, secondRequest]);
      const responses = [firstResponse, secondResponse];

      expect(responses.every((res) => res.status === 200)).toBe(true);
      expect(convertJobToPdfMock).toHaveBeenCalledTimes(1);
      expect(responses.filter((res) => res.body.ok === true && !res.body.noop)).toHaveLength(1);
      expect(responses.filter((res) => res.body.noop === true)).toHaveLength(1);
      expect(responses.map((res) => res.body.reason).filter(Boolean)).toEqual(
        expect.arrayContaining([expect.stringMatching(/processing|lock_lost/)]),
      );

      const finalJob = await getJob("worker-race-001");
      expect(finalJob?.status).toBe("processing");
      expect(finalJob?.sourcePath).toBe("/tmp/uploads/test.hwp");
    });

    it("does not convert when queued claim loses the lock before mutation", async () => {
      const job = makeJob({ jobId: "worker-lock-lost-001" });
      await createJob(job as CreateJobInput);

      convertJobToPdfMock.mockImplementationOnce(async () => undefined);
      const token = buildMockOidcToken({
        aud: getExpectedAudience(),
        iss: "https://accounts.google.com",
        email: "worker@project.iam.gserviceaccount.com",
      });

      await Promise.all([
        request(app)
          .post("/internal/workers/convert")
          .set("Authorization", `Bearer ${token}`)
          .send({ jobId: "worker-lock-lost-001" }),
        request(app)
          .post("/internal/workers/convert")
          .set("Authorization", `Bearer ${token}`)
          .send({ jobId: "worker-lock-lost-001" }),
      ]);

      convertJobToPdfMock.mockClear();

      const res = await request(app)
        .post("/internal/workers/convert")
        .set("Authorization", `Bearer ${token}`)
        .send({ jobId: "worker-lock-lost-001" });

      expect(res.status).toBe(200);
      expect(res.body.noop).toBe(true);
      expect(res.body.reason).toMatch(/processing|lock_lost/);
      expect(convertJobToPdfMock).not.toHaveBeenCalled();
    });

    it("no-ops when job is already completed (duplicate task)", async () => {
      const job = makeJob({
        jobId: "worker-completed-001",
        status: "completed",
        progress: 100,
      });
      await createJob(job as CreateJobInput);

      const token = buildMockOidcToken({
        aud: getExpectedAudience(),
        iss: "https://accounts.google.com",
      });

      const res = await request(app)
        .post("/internal/workers/convert")
        .set("Authorization", `Bearer ${token}`)
        .send({ jobId: "worker-completed-001" });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.noop).toBe(true);
      expect(res.body.reason).toContain("completed");
      expect(convertJobToPdfMock).not.toHaveBeenCalled();
    });

    it("no-ops when job is already processing", async () => {
      const job = makeJob({
        jobId: "worker-processing-001",
        status: "processing",
        progress: 70,
      });
      await createJob(job as CreateJobInput);

      const token = buildMockOidcToken({
        aud: getExpectedAudience(),
        iss: "https://accounts.google.com",
      });

      const res = await request(app)
        .post("/internal/workers/convert")
        .set("Authorization", `Bearer ${token}`)
        .send({ jobId: "worker-processing-001" });

      expect(res.status).toBe(200);
      expect(res.body.noop).toBe(true);
      expect(res.body.reason).toContain("processing");
      expect(convertJobToPdfMock).not.toHaveBeenCalled();
    });

    it("no-ops when job is deleted", async () => {
      const job = makeJob({
        jobId: "worker-deleted-001",
        status: "deleted",
        deletedAt: new Date().toISOString(),
        deletedBy: "user-123",
      });
      await createJob(job as CreateJobInput);

      const token = buildMockOidcToken({
        aud: getExpectedAudience(),
        iss: "https://accounts.google.com",
      });

      const res = await request(app)
        .post("/internal/workers/convert")
        .set("Authorization", `Bearer ${token}`)
        .send({ jobId: "worker-deleted-001" });

      expect(res.status).toBe(200);
      expect(res.body.noop).toBe(true);
      expect(res.body.reason).toContain("deleted");
      expect(convertJobToPdfMock).not.toHaveBeenCalled();
    });

    it("no-ops when job is expired", async () => {
      const job = makeJob({
        jobId: "worker-expired-001",
        status: "expired",
      });
      await createJob(job as CreateJobInput);

      const token = buildMockOidcToken({
        aud: getExpectedAudience(),
        iss: "https://accounts.google.com",
      });

      const res = await request(app)
        .post("/internal/workers/convert")
        .set("Authorization", `Bearer ${token}`)
        .send({ jobId: "worker-expired-001" });

      expect(res.status).toBe(200);
      expect(res.body.noop).toBe(true);
      expect(res.body.reason).toContain("expired");
      expect(convertJobToPdfMock).not.toHaveBeenCalled();
    });

    it("no-ops when job is not found", async () => {
      const token = buildMockOidcToken({
        aud: getExpectedAudience(),
        iss: "https://accounts.google.com",
      });

      const res = await request(app)
        .post("/internal/workers/convert")
        .set("Authorization", `Bearer ${token}`)
        .send({ jobId: "nonexistent-job" });

      expect(res.status).toBe(200);
      expect(res.body.noop).toBe(true);
      expect(res.body.reason).toContain("not_found");
      expect(convertJobToPdfMock).not.toHaveBeenCalled();
    });

    it("no-ops when job has failed", async () => {
      const job = makeJob({
        jobId: "worker-failed-001",
        status: "failed",
        progress: 0,
      });
      await createJob(job as CreateJobInput);

      const token = buildMockOidcToken({
        aud: getExpectedAudience(),
        iss: "https://accounts.google.com",
      });

      const res = await request(app)
        .post("/internal/workers/convert")
        .set("Authorization", `Bearer ${token}`)
        .send({ jobId: "worker-failed-001" });

      expect(res.status).toBe(200);
      expect(res.body.noop).toBe(true);
      expect(res.body.reason).toContain("failed");
      expect(convertJobToPdfMock).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // Conversion failure tests
  // -----------------------------------------------------------------------

  describe("conversion failure", () => {
    it("returns 200 with failed status when conversion throws terminal error", async () => {
      const job = makeJob({ jobId: "worker-fail-001" });
      await createJob(job as CreateJobInput);

      // Mock conversion to throw a terminal error.
      convertJobToPdfMock.mockRejectedValueOnce(new Error("Invalid HWP file format"));

      const token = buildMockOidcToken({
        aud: getExpectedAudience(),
        iss: "https://accounts.google.com",
      });

      const res = await request(app)
        .post("/internal/workers/convert")
        .set("Authorization", `Bearer ${token}`)
        .send({ jobId: "worker-fail-001" });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(false);
      expect(res.body.status).toBe("failed");
    });

    it("returns 500 for retryable errors (e.g. timeout)", async () => {
      const job = makeJob({ jobId: "worker-retry-001" });
      await createJob(job as CreateJobInput);

      // Mock conversion to throw a retryable error.
      convertJobToPdfMock.mockRejectedValueOnce(new Error("ETIMEDOUT: connection timed out"));

      const token = buildMockOidcToken({
        aud: getExpectedAudience(),
        iss: "https://accounts.google.com",
      });

      const res = await request(app)
        .post("/internal/workers/convert")
        .set("Authorization", `Bearer ${token}`)
        .send({ jobId: "worker-retry-001" });

      expect(res.status).toBe(500);
      expect(res.body.ok).toBe(false);
      expect(res.body.error).toContain("retryable");
    });
  });

  // -----------------------------------------------------------------------
  // Request validation
  // -----------------------------------------------------------------------

  describe("request validation", () => {
    it("returns 422 when jobId is missing", async () => {
      const token = buildMockOidcToken({
        aud: getExpectedAudience(),
        iss: "https://accounts.google.com",
      });

      const res = await request(app)
        .post("/internal/workers/convert")
        .set("Authorization", `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(422);
    });

    it("returns 422 when jobId is not a string", async () => {
      const token = buildMockOidcToken({
        aud: getExpectedAudience(),
        iss: "https://accounts.google.com",
      });

      const res = await request(app)
        .post("/internal/workers/convert")
        .set("Authorization", `Bearer ${token}`)
        .send({ jobId: 123 });

      expect(res.status).toBe(422);
    });
  });

  // -----------------------------------------------------------------------
  // Upload complete enqueues via dispatcher
  // -----------------------------------------------------------------------

  describe("upload complete enqueues via dispatcher", () => {
    it("POST /v1/upload enqueues job in mock mode", async () => {
      // Create a temp HWP file to upload.
      const hwpPath = path.join(tempUploadDir, "test-enqueue.hwp");
      await fs.writeFile(hwpPath, "fake hwp content");

      const res = await request(app)
        .post("/v1/upload")
        .attach("file", hwpPath);

      expect(res.status).toBe(202);
      expect(res.body.jobId).toBeDefined();

      // Verify the job was enqueued in mock mode.
      const enqueued = getMockEnqueuedJobIds();
      expect(enqueued).toContain(res.body.jobId);
    });
  });
});
