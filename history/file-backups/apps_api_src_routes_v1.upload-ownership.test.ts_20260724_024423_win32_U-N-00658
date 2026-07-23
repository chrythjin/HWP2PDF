import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createApp } from "../app.js";
import {
  createJob,
  createUploadSession,
  getUploadSession,
  type JobRecord,
  type CreateJobInput,
  type UploadSessionRecord,
} from "../services/job-store.js";
import { setTokenVerifierForTesting } from "../middleware/auth.js";
import { hashAccessToken, generateAnonymousAccessTokenWithHash } from "../utils/access-token.js";
import {
  API_ROUTES,
  ANONYMOUS_ACCESS_TOKEN_HEADER,
  UPLOAD_SESSION_TTL_MS,
} from "@hwp2pdf/shared";
import type { Express } from "express";

// ---------------------------------------------------------------------------
// Tests for upload initiate/complete/status ownership API (Todo 5).
//
// Verifies:
// - anonymous initiate returns jobId + accessToken once
// - authenticated initiate binds userId, no token returned
// - complete requires matching UploadSession (same jobId, owner, objectPath)
// - wrong user/token complete fails with 403
// - status without token fails with 401
// - wrong token status fails with 403
// - correct token status succeeds with 200
// - member job queried by other member returns 403
// - multipart upload returns accessToken for anonymous, binds userId for auth
// ---------------------------------------------------------------------------

interface MockDecodedToken {
  uid: string;
  email?: string;
  name?: string;
  admin?: boolean;
  boardModerator?: boolean;
}

const mockTokens: Record<string, MockDecodedToken> = {
  "valid-user-token": {
    uid: "user-123",
    email: "user@example.com",
    name: "Test User",
  },
  "valid-other-user-token": {
    uid: "user-456",
    email: "other@example.com",
    name: "Other User",
  },
};

const HWP_OLE_HEADER = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

function fakeHwp(size = 64): Buffer {
  return Buffer.concat([HWP_OLE_HEADER, Buffer.alloc(Math.max(0, size - HWP_OLE_HEADER.length))]);
}

function createMockVerifier(tokens: Record<string, MockDecodedToken>) {
  return async (idToken: string): Promise<MockDecodedToken> => {
    const decoded = tokens[idToken];
    if (!decoded) {
      const err = new Error("Firebase ID token has invalid signature");
      (err as Error & { code?: string }).code = "auth/invalid-id-token";
      throw err;
    }
    return decoded;
  };
}

type OwnerAwareJobRecord = JobRecord & {
  ownerType?: "user" | "anonymous";
  userId?: string;
  accessTokenHash?: string;
};

function makeJob(overrides: Partial<OwnerAwareJobRecord> = {}): OwnerAwareJobRecord {
  const now = new Date().toISOString();
  return {
    jobId: "job-test-base",
    originalFileName: "test.hwp",
    sourcePath: "/tmp/uploads/test.hwp",
    status: "completed",
    progress: 100,
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// Mock the conversion service to avoid spawning LibreOffice.
vi.mock("../services/conversion-service.js", () => ({
  convertJobToPdf: vi.fn().mockResolvedValue(undefined),
}));

// Mock storage-service GCS functions to avoid real GCS calls.
// shouldUseGcs returns true so the initiate route works, but all actual
// GCS operations (upload, download, signed URL) are stubbed.
vi.mock("../services/storage-service.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/storage-service.js")>();
  return {
    ...actual,
    shouldUseGcs: vi.fn(() => true),
    persistOriginalFile: vi.fn(async () => undefined),
    downloadOriginalFile: vi.fn(async (input: { localPath: string; expectedFileSize?: number }) => {
      await fs.writeFile(input.localPath, fakeHwp(input.expectedFileSize));
    }),
    createOriginalUploadUrl: vi.fn(async (input: { jobId: string; originalFileName: string }) => ({
      objectPath: `staging/${input.jobId}/${input.originalFileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`,
      uploadUrl: "https://fake-gcs-upload-url.example.com",
      headers: { "Content-Type": "application/octet-stream" },
    })),
    getProtectedDownloadUrl: vi.fn(async (job: JobRecord) => {
      if (job.status !== "completed") return undefined;
      return `http://localhost:8080/v1/jobs/${job.jobId}/download`;
    }),
  };
});

describe("upload initiate/complete/status ownership API (Todo 5)", () => {
  let app: Express;
  let tempUploadDir: string;
  let tempResultDir: string;

  beforeEach(async () => {
    setTokenVerifierForTesting(createMockVerifier(mockTokens));

    tempUploadDir = await fs.mkdtemp(path.join(os.tmpdir(), "hwp2pdf-upload-"));
    tempResultDir = await fs.mkdtemp(path.join(os.tmpdir(), "hwp2pdf-result-"));

    // Override config directories to temp dirs.
    process.env.UPLOAD_DIR = tempUploadDir;
    process.env.RESULT_DIR = tempResultDir;

    app = await createApp();
  });

  afterEach(async () => {
    setTokenVerifierForTesting(null);
    delete process.env.UPLOAD_DIR;
    delete process.env.RESULT_DIR;
    await fs.rm(tempUploadDir, { recursive: true, force: true });
    await fs.rm(tempResultDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // POST /v1/uploads/initiate — anonymous
  // -----------------------------------------------------------------------

  describe("POST /v1/uploads/initiate — anonymous", () => {
    it("returns 201 with jobId and accessToken", async () => {
      const res = await request(app)
        .post(API_ROUTES.UPLOADS_INITIATE)
        .send({ fileName: "doc.hwp", fileSize: 1024 });

      expect(res.status).toBe(201);
      expect(res.body.jobId).toBeDefined();
      expect(res.body.uploadUrl).toBeDefined();
      expect(res.body.objectPath).toBeDefined();
      expect(res.body.accessToken).toBeDefined();
      expect(typeof res.body.accessToken).toBe("string");
      expect(res.body.accessTokenHeader).toBe(ANONYMOUS_ACCESS_TOKEN_HEADER);
    });

    it("creates an UploadSession with ownerType anonymous and hashed token", async () => {
      const res = await request(app)
        .post(API_ROUTES.UPLOADS_INITIATE)
        .send({ fileName: "doc.hwp", fileSize: 1024 });

      const session = await getUploadSession(res.body.jobId);
      expect(session).not.toBeNull();
      expect(session!.ownerType).toBe("anonymous");
      expect(session!.accessTokenHash).toBeDefined();
      expect(session!.userId).toBeUndefined();
      // The hash should NOT be the plaintext token.
      expect(session!.accessTokenHash).not.toBe(res.body.accessToken);
      // The hash should be the SHA-256 of the plaintext token.
      expect(session!.accessTokenHash).toBe(hashAccessToken(res.body.accessToken));
    });

    it("rejects invalid file extension", async () => {
      const res = await request(app)
        .post(API_ROUTES.UPLOADS_INITIATE)
        .send({ fileName: "doc.txt", fileSize: 1024 });

      expect(res.status).toBe(422);
    });

    it("rejects file exceeding size limit", async () => {
      const res = await request(app)
        .post(API_ROUTES.UPLOADS_INITIATE)
        .send({ fileName: "doc.hwp", fileSize: 30 * 1024 * 1024 });

      expect(res.status).toBe(422);
    });
  });

  // -----------------------------------------------------------------------
  // POST /v1/uploads/initiate — authenticated
  // -----------------------------------------------------------------------

  describe("POST /v1/uploads/initiate — authenticated", () => {
    it("returns 201 with jobId but no accessToken", async () => {
      const res = await request(app)
        .post(API_ROUTES.UPLOADS_INITIATE)
        .set("Authorization", "Bearer valid-user-token")
        .send({ fileName: "doc.hwp", fileSize: 1024 });

      expect(res.status).toBe(201);
      expect(res.body.jobId).toBeDefined();
      expect(res.body.accessToken).toBeUndefined();
    });

    it("creates an UploadSession with ownerType user and userId", async () => {
      const res = await request(app)
        .post(API_ROUTES.UPLOADS_INITIATE)
        .set("Authorization", "Bearer valid-user-token")
        .send({ fileName: "doc.hwp", fileSize: 1024 });

      const session = await getUploadSession(res.body.jobId);
      expect(session).not.toBeNull();
      expect(session!.ownerType).toBe("user");
      expect(session!.userId).toBe("user-123");
      expect(session!.accessTokenHash).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // POST /v1/uploads/complete — anonymous with correct token
  // -----------------------------------------------------------------------

  describe("POST /v1/uploads/complete — anonymous with correct token", () => {
    it("returns 202 and creates a job with owner fields", async () => {
      // First initiate
      const initRes = await request(app)
        .post(API_ROUTES.UPLOADS_INITIATE)
        .send({ fileName: "doc.hwp", fileSize: 1024 });

      const { jobId, objectPath, accessToken } = initRes.body;

      // Then complete with the token
      const res = await request(app)
        .post(API_ROUTES.UPLOADS_COMPLETE)
        .set(ANONYMOUS_ACCESS_TOKEN_HEADER, accessToken)
        .send({ jobId, objectPath, fileName: "doc.hwp", fileSize: 1024 });

      expect(res.status).toBe(202);
      expect(res.body.jobId).toBe(jobId);
      expect(res.body.status).toBe("queued");
    });
  });

  // -----------------------------------------------------------------------
  // POST /v1/uploads/complete — anonymous without token
  // -----------------------------------------------------------------------

  describe("POST /v1/uploads/complete — anonymous without token", () => {
    it("returns 401", async () => {
      const initRes = await request(app)
        .post(API_ROUTES.UPLOADS_INITIATE)
        .send({ fileName: "doc.hwp", fileSize: 1024 });

      const { jobId, objectPath } = initRes.body;

      const res = await request(app)
        .post(API_ROUTES.UPLOADS_COMPLETE)
        .send({ jobId, objectPath, fileName: "doc.hwp", fileSize: 1024 });

      expect(res.status).toBe(401);
    });
  });

  // -----------------------------------------------------------------------
  // POST /v1/uploads/complete — anonymous with wrong token
  // -----------------------------------------------------------------------

  describe("POST /v1/uploads/complete — anonymous with wrong token", () => {
    it("returns 403", async () => {
      const initRes = await request(app)
        .post(API_ROUTES.UPLOADS_INITIATE)
        .send({ fileName: "doc.hwp", fileSize: 1024 });

      const { jobId, objectPath } = initRes.body;

      const res = await request(app)
        .post(API_ROUTES.UPLOADS_COMPLETE)
        .set(ANONYMOUS_ACCESS_TOKEN_HEADER, "wrong-token")
        .send({ jobId, objectPath, fileName: "doc.hwp", fileSize: 1024 });

      expect(res.status).toBe(403);
    });
  });

  // -----------------------------------------------------------------------
  // POST /v1/uploads/complete — wrong user
  // -----------------------------------------------------------------------

  describe("POST /v1/uploads/complete — wrong user", () => {
    it("returns 403", async () => {
      // Initiate as user-123
      const initRes = await request(app)
        .post(API_ROUTES.UPLOADS_INITIATE)
        .set("Authorization", "Bearer valid-user-token")
        .send({ fileName: "doc.hwp", fileSize: 1024 });

      const { jobId, objectPath } = initRes.body;

      // Complete as user-456
      const res = await request(app)
        .post(API_ROUTES.UPLOADS_COMPLETE)
        .set("Authorization", "Bearer valid-other-user-token")
        .send({ jobId, objectPath, fileName: "doc.hwp", fileSize: 1024 });

      expect(res.status).toBe(403);
    });
  });

  // -----------------------------------------------------------------------
  // POST /v1/uploads/complete — session not found
  // -----------------------------------------------------------------------

  describe("POST /v1/uploads/complete — session not found", () => {
    it("returns 404", async () => {
      const res = await request(app)
        .post(API_ROUTES.UPLOADS_COMPLETE)
        .send({
          jobId: "nonexistent-session-id",
          objectPath: "staging/nonexistent/doc.hwp",
          fileName: "doc.hwp",
          fileSize: 1024,
        });

      expect(res.status).toBe(404);
    });
  });

  // -----------------------------------------------------------------------
  // POST /v1/uploads/complete — objectPath mismatch
  // -----------------------------------------------------------------------

  describe("POST /v1/uploads/complete — objectPath mismatch", () => {
    it("returns 403", async () => {
      const initRes = await request(app)
        .post(API_ROUTES.UPLOADS_INITIATE)
        .send({ fileName: "doc.hwp", fileSize: 1024 });

      const { jobId, accessToken } = initRes.body;

      const res = await request(app)
        .post(API_ROUTES.UPLOADS_COMPLETE)
        .set(ANONYMOUS_ACCESS_TOKEN_HEADER, accessToken)
        .send({
          jobId,
          objectPath: "staging/different-path/doc.hwp",
          fileName: "doc.hwp",
          fileSize: 1024,
        });

      expect(res.status).toBe(403);
    });
  });

  // -----------------------------------------------------------------------
  // POST /v1/uploads/complete — fileName/fileSize mismatch
  // -----------------------------------------------------------------------

  describe("POST /v1/uploads/complete — fileName mismatch", () => {
    it("returns 403", async () => {
      const initRes = await request(app)
        .post(API_ROUTES.UPLOADS_INITIATE)
        .send({ fileName: "doc.hwp", fileSize: 1024 });

      const { jobId, objectPath, accessToken } = initRes.body;

      const res = await request(app)
        .post(API_ROUTES.UPLOADS_COMPLETE)
        .set(ANONYMOUS_ACCESS_TOKEN_HEADER, accessToken)
        .send({ jobId, objectPath, fileName: "other.hwp", fileSize: 1024 });

      expect(res.status).toBe(403);
    });
  });

  // -----------------------------------------------------------------------
  // GET /v1/jobs/:jobId — anonymous job status without token
  // -----------------------------------------------------------------------

  describe("GET /v1/jobs/:jobId — anonymous job without token", () => {
    it("returns 401", async () => {
      const token = "correct-anon-token";
      const job = makeJob({
        jobId: "anon-status-001",
        ownerType: "anonymous",
        accessTokenHash: hashAccessToken(token),
      });
      await createJob(job as CreateJobInput);

      const res = await request(app).get(`${API_ROUTES.JOBS}/${job.jobId}`);

      expect(res.status).toBe(401);
    });
  });

  // -----------------------------------------------------------------------
  // GET /v1/jobs/:jobId — anonymous job status with wrong token
  // -----------------------------------------------------------------------

  describe("GET /v1/jobs/:jobId — anonymous job with wrong token", () => {
    it("returns 403", async () => {
      const job = makeJob({
        jobId: "anon-status-002",
        ownerType: "anonymous",
        accessTokenHash: hashAccessToken("correct-token"),
      });
      await createJob(job as CreateJobInput);

      const res = await request(app)
        .get(`${API_ROUTES.JOBS}/${job.jobId}`)
        .set(ANONYMOUS_ACCESS_TOKEN_HEADER, "wrong-token");

      expect(res.status).toBe(403);
    });
  });

  // -----------------------------------------------------------------------
  // GET /v1/jobs/:jobId — anonymous job status with correct token
  // -----------------------------------------------------------------------

  describe("GET /v1/jobs/:jobId — anonymous job with correct token", () => {
    it("returns 200 with downloadUrl", async () => {
      const token = "correct-anon-token-003";
      const resultPath = path.join(tempResultDir, "anon-status-003.pdf");
      await fs.writeFile(resultPath, "%PDF-1.4 fake pdf content");

      const job = makeJob({
        jobId: "anon-status-003",
        ownerType: "anonymous",
        accessTokenHash: hashAccessToken(token),
        resultPath,
      });
      await createJob(job as CreateJobInput);

      const res = await request(app)
        .get(`${API_ROUTES.JOBS}/${job.jobId}`)
        .set(ANONYMOUS_ACCESS_TOKEN_HEADER, token);

      expect(res.status).toBe(200);
      expect(res.body.jobId).toBe(job.jobId);
      expect(res.body.downloadUrl).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // GET /v1/jobs/:jobId — member job without auth
  // -----------------------------------------------------------------------

  describe("GET /v1/jobs/:jobId — member job without auth", () => {
    it("returns 401", async () => {
      const job = makeJob({
        jobId: "user-status-001",
        ownerType: "user",
        userId: "user-123",
      });
      await createJob(job as CreateJobInput);

      const res = await request(app).get(`${API_ROUTES.JOBS}/${job.jobId}`);

      expect(res.status).toBe(401);
    });
  });

  // -----------------------------------------------------------------------
  // GET /v1/jobs/:jobId — member job with wrong user (cross-user)
  // -----------------------------------------------------------------------

  describe("GET /v1/jobs/:jobId — member job with wrong user", () => {
    it("returns 403", async () => {
      const job = makeJob({
        jobId: "user-status-002",
        ownerType: "user",
        userId: "user-123",
      });
      await createJob(job as CreateJobInput);

      const res = await request(app)
        .get(`${API_ROUTES.JOBS}/${job.jobId}`)
        .set("Authorization", "Bearer valid-other-user-token");

      expect(res.status).toBe(403);
    });
  });

  // -----------------------------------------------------------------------
  // GET /v1/jobs/:jobId — member job with correct user
  // -----------------------------------------------------------------------

  describe("GET /v1/jobs/:jobId — member job with correct user", () => {
    it("returns 200 with downloadUrl", async () => {
      const resultPath = path.join(tempResultDir, "user-status-003.pdf");
      await fs.writeFile(resultPath, "%PDF-1.4 fake pdf content");

      const job = makeJob({
        jobId: "user-status-003",
        ownerType: "user",
        userId: "user-123",
        resultPath,
      });
      await createJob(job as CreateJobInput);

      const res = await request(app)
        .get(`${API_ROUTES.JOBS}/${job.jobId}`)
        .set("Authorization", "Bearer valid-user-token");

      expect(res.status).toBe(200);
      expect(res.body.jobId).toBe(job.jobId);
      expect(res.body.downloadUrl).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // GET /v1/jobs/:jobId — legacy job (no owner fields)
  // -----------------------------------------------------------------------

  describe("GET /v1/jobs/:jobId — legacy job without owner fields", () => {
    it("returns 401 (no jobId-only access per plan guardrail)", async () => {
      const job = makeJob({
        jobId: "legacy-status-001",
        // No ownerType, userId, or accessTokenHash
      });
      await createJob(job as CreateJobInput);

      const res = await request(app).get(`${API_ROUTES.JOBS}/${job.jobId}`);

      expect(res.status).toBe(401);
    });
  });

  // -----------------------------------------------------------------------
  // POST /v1/upload — multipart anonymous
  // -----------------------------------------------------------------------

  describe("POST /v1/upload — multipart anonymous", () => {
    it("returns 202 with accessToken", async () => {
      // Create a temp HWP file to upload.
      const hwpPath = path.join(tempUploadDir, "test-multipart.hwp");
      await fs.writeFile(hwpPath, fakeHwp());

      const res = await request(app)
        .post(API_ROUTES.UPLOAD)
        .attach("file", hwpPath);

      expect(res.status).toBe(202);
      expect(res.body.jobId).toBeDefined();
      expect(res.body.accessToken).toBeDefined();
      expect(typeof res.body.accessToken).toBe("string");
      expect(res.body.accessTokenHeader).toBe(ANONYMOUS_ACCESS_TOKEN_HEADER);
    });
  });

  // -----------------------------------------------------------------------
  // POST /v1/upload — multipart authenticated
  // -----------------------------------------------------------------------

  describe("POST /v1/upload — multipart authenticated", () => {
    it("returns 202 without accessToken and binds userId", async () => {
      const hwpPath = path.join(tempUploadDir, "test-multipart-auth.hwp");
      await fs.writeFile(hwpPath, fakeHwp());

      const res = await request(app)
        .post(API_ROUTES.UPLOAD)
        .set("Authorization", "Bearer valid-user-token")
        .attach("file", hwpPath);

      expect(res.status).toBe(202);
      expect(res.body.jobId).toBeDefined();
      expect(res.body.accessToken).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // POST /v1/upload — multipart invalid file
  // -----------------------------------------------------------------------

  describe("POST /v1/upload — multipart invalid file", () => {
    it("rejects non-HWP file", async () => {
      const txtPath = path.join(tempUploadDir, "test.txt");
      await fs.writeFile(txtPath, "not a hwp file");

      const res = await request(app)
        .post(API_ROUTES.UPLOAD)
        .attach("file", txtPath);

      expect(res.status).toBe(422);
    });

    it("preserves the validation response when invalid-file cleanup fails", async () => {
      const invalidHwpPath = path.join(tempUploadDir, "invalid-signature.hwp");
      await fs.writeFile(invalidHwpPath, "not a hwp file");
      vi.spyOn(fs, "rm").mockRejectedValueOnce(new Error("cleanup failed"));

      const res = await request(app)
        .post(API_ROUTES.UPLOAD)
        .attach("file", invalidHwpPath);

      expect(res.status).toBe(422);
      expect(res.body).toEqual({
        error: {
          code: "invalid_file_signature",
          message: "올바른 HWP 파일이 아닙니다.",
        },
      });
    });
  });

  // -----------------------------------------------------------------------
  // Full flow: initiate → complete → status (anonymous)
  // -----------------------------------------------------------------------

  describe("full anonymous flow: initiate → complete → status", () => {
    it("works end-to-end with token", async () => {
      // 1. Initiate
      const initRes = await request(app)
        .post(API_ROUTES.UPLOADS_INITIATE)
        .send({ fileName: "flow.hwp", fileSize: 2048 });

      expect(initRes.status).toBe(201);
      const { jobId, objectPath, accessToken } = initRes.body;

      // 2. Complete
      const completeRes = await request(app)
        .post(API_ROUTES.UPLOADS_COMPLETE)
        .set(ANONYMOUS_ACCESS_TOKEN_HEADER, accessToken)
        .send({ jobId, objectPath, fileName: "flow.hwp", fileSize: 2048 });

      expect(completeRes.status).toBe(202);

      // 3. Status with token
      const statusRes = await request(app)
        .get(`${API_ROUTES.JOBS}/${jobId}`)
        .set(ANONYMOUS_ACCESS_TOKEN_HEADER, accessToken);

      expect(statusRes.status).toBe(200);
      expect(statusRes.body.jobId).toBe(jobId);

      // 4. Status without token should fail
      const noTokenRes = await request(app).get(`${API_ROUTES.JOBS}/${jobId}`);
      expect(noTokenRes.status).toBe(401);
    });
  });
});
