import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createApp } from "../app.js";
import { createJob, updateJob, type JobRecord, type CreateJobInput } from "../services/job-store.js";
import { setTokenVerifierForTesting } from "../middleware/auth.js";
import { hashAccessToken } from "../utils/token.js";
import type { Express } from "express";

// ---------------------------------------------------------------------------
// Tests for protected download boundary at the route level (Todo 4).
//
// Verifies the HTTP boundary checks from the plan:
// - no token → 401/403 and no downloadUrl in status response
// - wrong token → 403 and no downloadUrl
// - correct token → 200 with downloadUrl (or download succeeds)
// - other member's job → 403
// - deleted/expired job → no download URL
// - download endpoint requires auth
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

// Extend JobRecord with owner fields that Todo 3 will add.
// We cast through unknown to set these fields in tests without modifying JobStore.
type OwnerAwareJobRecord = JobRecord & {
  ownerType?: "user" | "anonymous";
  userId?: string;
  accessTokenHash?: string;
};

function makeJob(overrides: Partial<OwnerAwareJobRecord> = {}): OwnerAwareJobRecord {
  const now = new Date().toISOString();
  return {
    jobId: "job-test-001",
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

describe("protected download boundary — route level", () => {
  let app: Express;
  let tempResultDir: string;
  let resultFilePath: string;

  beforeEach(async () => {
    setTokenVerifierForTesting(createMockVerifier(mockTokens));

    // Create a temp result file for local-mode download tests.
    tempResultDir = await fs.mkdtemp(path.join(os.tmpdir(), "hwp2pdf-result-"));
    resultFilePath = path.join(tempResultDir, "job-test-001.pdf");
    await fs.writeFile(resultFilePath, "%PDF-1.4 fake pdf content");

    app = await createApp();
  });

  afterEach(async () => {
    setTokenVerifierForTesting(null);
    await fs.rm(tempResultDir, { recursive: true, force: true });
  });

  // -----------------------------------------------------------------------
  // Anonymous job status — no token
  // -----------------------------------------------------------------------

  describe("anonymous job status without token", () => {
    it("returns 401 (owner-aware job requires token)", async () => {
      const token = "correct-anon-token";
      const job = makeJob({
        jobId: "anon-job-001",
        ownerType: "anonymous",
        accessTokenHash: hashAccessToken(token),
        resultPath: resultFilePath,
      });
      await createJob(job as CreateJobInput);

      const res = await request(app).get(`/v1/jobs/${job.jobId}`);

      expect(res.status).toBe(401);
    });
  });

  // -----------------------------------------------------------------------
  // Anonymous job status — wrong token
  // -----------------------------------------------------------------------

  describe("anonymous job status with wrong token", () => {
    it("returns 403 (wrong token rejected)", async () => {
      const job = makeJob({
        jobId: "anon-job-002",
        ownerType: "anonymous",
        accessTokenHash: hashAccessToken("correct-token"),
        resultPath: resultFilePath,
      });
      await createJob(job as CreateJobInput);

      const res = await request(app)
        .get(`/v1/jobs/${job.jobId}`)
        .set("X-Job-Access-Token", "wrong-token");

      expect(res.status).toBe(403);
    });
  });

  // -----------------------------------------------------------------------
  // Anonymous job status — correct token
  // -----------------------------------------------------------------------

  describe("anonymous job status with correct token", () => {
    it("returns 200 with downloadUrl", async () => {
      const token = "correct-anon-token-003";
      const job = makeJob({
        jobId: "anon-job-003",
        ownerType: "anonymous",
        accessTokenHash: hashAccessToken(token),
        resultPath: resultFilePath,
      });
      await createJob(job as CreateJobInput);

      const res = await request(app)
        .get(`/v1/jobs/${job.jobId}`)
        .set("X-Job-Access-Token", token);

      expect(res.status).toBe(200);
      expect(res.body.jobId).toBe(job.jobId);
      // In local mode, downloadUrl should be the download endpoint URL.
      expect(res.body.downloadUrl).toBeDefined();
      expect(res.body.downloadUrl).toContain(`/v1/jobs/${job.jobId}/download`);
    });
  });

  // -----------------------------------------------------------------------
  // Member job status — no auth
  // -----------------------------------------------------------------------

  describe("member job status without auth", () => {
    it("returns 401 (owner-aware job requires auth)", async () => {
      const job = makeJob({
        jobId: "user-job-001",
        ownerType: "user",
        userId: "user-123",
        resultPath: resultFilePath,
      });
      await createJob(job as CreateJobInput);

      const res = await request(app).get(`/v1/jobs/${job.jobId}`);

      expect(res.status).toBe(401);
    });
  });

  // -----------------------------------------------------------------------
  // Member job status — wrong user
  // -----------------------------------------------------------------------

  describe("member job status with wrong user", () => {
    it("returns 403 (cross-user access denied)", async () => {
      const job = makeJob({
        jobId: "user-job-002",
        ownerType: "user",
        userId: "user-123",
        resultPath: resultFilePath,
      });
      await createJob(job as CreateJobInput);

      const res = await request(app)
        .get(`/v1/jobs/${job.jobId}`)
        .set("Authorization", "Bearer valid-other-user-token");

      expect(res.status).toBe(403);
    });
  });

  // -----------------------------------------------------------------------
  // Member job status — correct user
  // -----------------------------------------------------------------------

  describe("member job status with correct user", () => {
    it("returns 200 with downloadUrl", async () => {
      const job = makeJob({
        jobId: "user-job-003",
        ownerType: "user",
        userId: "user-123",
        resultPath: resultFilePath,
      });
      await createJob(job as CreateJobInput);

      const res = await request(app)
        .get(`/v1/jobs/${job.jobId}`)
        .set("Authorization", "Bearer valid-user-token");

      expect(res.status).toBe(200);
      expect(res.body.downloadUrl).toBeDefined();
      expect(res.body.downloadUrl).toContain(`/v1/jobs/${job.jobId}/download`);
    });
  });

  // -----------------------------------------------------------------------
  // Download endpoint — anonymous job
  // -----------------------------------------------------------------------

  describe("download endpoint — anonymous job", () => {
    it("returns 401 when no token is provided", async () => {
      const job = makeJob({
        jobId: "dl-anon-001",
        ownerType: "anonymous",
        accessTokenHash: hashAccessToken("correct-token"),
        resultPath: resultFilePath,
      });
      await createJob(job as CreateJobInput);

      const res = await request(app).get(`/v1/jobs/${job.jobId}/download`);

      expect(res.status).toBe(401);
    });

    it("returns 403 when wrong token is provided", async () => {
      const job = makeJob({
        jobId: "dl-anon-002",
        ownerType: "anonymous",
        accessTokenHash: hashAccessToken("correct-token"),
        resultPath: resultFilePath,
      });
      await createJob(job as CreateJobInput);

      const res = await request(app)
        .get(`/v1/jobs/${job.jobId}/download`)
        .set("X-Job-Access-Token", "wrong-token");

      expect(res.status).toBe(403);
    });

    it("streams the file when correct token is provided", async () => {
      const token = "correct-dl-token";
      const job = makeJob({
        jobId: "dl-anon-003",
        ownerType: "anonymous",
        accessTokenHash: hashAccessToken(token),
        resultPath: resultFilePath,
      });
      await createJob(job as CreateJobInput);

      const res = await request(app)
        .get(`/v1/jobs/${job.jobId}/download`)
        .set("X-Job-Access-Token", token);

      expect(res.status).toBe(200);
      expect(res.headers["content-disposition"]).toContain("attachment");
      expect(res.body).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // Download endpoint — member job
  // -----------------------------------------------------------------------

  describe("download endpoint — member job", () => {
    it("returns 401 when no auth is provided", async () => {
      const job = makeJob({
        jobId: "dl-user-001",
        ownerType: "user",
        userId: "user-123",
        resultPath: resultFilePath,
      });
      await createJob(job as CreateJobInput);

      const res = await request(app).get(`/v1/jobs/${job.jobId}/download`);

      expect(res.status).toBe(401);
    });

    it("returns 403 when wrong user is authenticated", async () => {
      const job = makeJob({
        jobId: "dl-user-002",
        ownerType: "user",
        userId: "user-123",
        resultPath: resultFilePath,
      });
      await createJob(job as CreateJobInput);

      const res = await request(app)
        .get(`/v1/jobs/${job.jobId}/download`)
        .set("Authorization", "Bearer valid-other-user-token");

      expect(res.status).toBe(403);
    });

    it("streams the file when correct user is authenticated", async () => {
      const job = makeJob({
        jobId: "dl-user-003",
        ownerType: "user",
        userId: "user-123",
        resultPath: resultFilePath,
      });
      await createJob(job as CreateJobInput);

      const res = await request(app)
        .get(`/v1/jobs/${job.jobId}/download`)
        .set("Authorization", "Bearer valid-user-token");

      expect(res.status).toBe(200);
      expect(res.headers["content-disposition"]).toContain("attachment");
    });
  });

  // -----------------------------------------------------------------------
  // Download endpoint — job not found / not ready
  // -----------------------------------------------------------------------

  describe("download endpoint — edge cases", () => {
    it("returns 404 for non-existent job", async () => {
      const res = await request(app).get("/v1/jobs/nonexistent-job/download");
      expect(res.status).toBe(404);
    });

    it("returns 409 for job that is not completed", async () => {
      const token = "processing-token";
      const job = makeJob({
        jobId: "dl-processing-001",
        status: "processing",
        progress: 70,
        ownerType: "anonymous",
        accessTokenHash: hashAccessToken(token),
        resultPath: undefined,
      });
      await createJob(job as CreateJobInput);

      const res = await request(app)
        .get(`/v1/jobs/${job.jobId}/download`)
        .set("X-Job-Access-Token", token);

      expect(res.status).toBe(409);
    });
  });

  // -----------------------------------------------------------------------
  // Legacy job (no owner fields) — status still omits downloadUrl
  // -----------------------------------------------------------------------

  describe("legacy job without owner fields", () => {
    it("status returns 401 (no jobId-only access)", async () => {
      const job = makeJob({
        jobId: "legacy-job-001",
        // No ownerType, userId, or accessTokenHash
        resultPath: resultFilePath,
      });
      await createJob(job as CreateJobInput);

      const res = await request(app).get(`/v1/jobs/${job.jobId}`);

      expect(res.status).toBe(401);
    });

    it("download endpoint returns 401 for legacy job", async () => {
      const job = makeJob({
        jobId: "legacy-job-002",
        resultPath: resultFilePath,
      });
      await createJob(job as CreateJobInput);

      const res = await request(app).get(`/v1/jobs/${job.jobId}/download`);
      expect(res.status).toBe(401);
    });
  });

  // -----------------------------------------------------------------------
  // Status response never exposes unconditional reusable signed URL
  // -----------------------------------------------------------------------

  describe("status response never exposes stored downloadUrl", () => {
    it("does not return the stored job.downloadUrl field (401 without token)", async () => {
      const job = makeJob({
        jobId: "stored-url-001",
        downloadUrl: "https://storage.googleapis.com/bucket/output/old-signed.pdf?signature=abc123",
        ownerType: "anonymous",
        accessTokenHash: hashAccessToken("some-token"),
        resultPath: resultFilePath,
      });
      await createJob(job as CreateJobInput);

      // No token — owner-aware job returns 401, no body leak
      const res1 = await request(app).get(`/v1/jobs/${job.jobId}`);
      expect(res1.status).toBe(401);
      expect(res1.body.downloadUrl).toBeUndefined();

      // Wrong token — returns 403, no body leak
      const res2 = await request(app)
        .get(`/v1/jobs/${job.jobId}`)
        .set("X-Job-Access-Token", "wrong");
      expect(res2.status).toBe(403);
      expect(res2.body.downloadUrl).toBeUndefined();
    });
  });
});