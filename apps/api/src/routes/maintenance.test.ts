import type { Express } from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";
import { setMaintenanceOidcVerifierForTesting } from "../middleware/maintenance-auth.js";

const {
  claimExpiredUploadObjectMock,
  deleteExactStoredObjectMock,
  enqueueConversionJobMock,
  expireUploadSessionsForCleanupMock,
  recoverStaleProcessingJobsMock,
} = vi.hoisted(() => ({
  claimExpiredUploadObjectMock: vi.fn(),
  deleteExactStoredObjectMock: vi.fn(),
  enqueueConversionJobMock: vi.fn(),
  expireUploadSessionsForCleanupMock: vi.fn(),
  recoverStaleProcessingJobsMock: vi.fn(),
}));

vi.mock("../services/job-store.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/job-store.js")>()),
  claimExpiredUploadObject: claimExpiredUploadObjectMock,
  expireUploadSessionsForCleanup: expireUploadSessionsForCleanupMock,
  recoverStaleProcessingJobs: recoverStaleProcessingJobsMock,
}));

vi.mock("../services/cloud-tasks-dispatcher.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/cloud-tasks-dispatcher.js")>()),
  enqueueConversionJob: enqueueConversionJobMock,
}));

vi.mock("../services/storage-service.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/storage-service.js")>()),
  deleteExactStoredObject: deleteExactStoredObjectMock,
}));

const endpoint = "/internal/maintenance/run";

function authorization(token = "scheduler-token") {
  return { Authorization: `Bearer ${token}` };
}

describe("POST /internal/maintenance/run", () => {
  let app: Express;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.MAINTENANCE_OIDC_AUDIENCE = "https://api.example/internal/maintenance/run";
    process.env.MAINTENANCE_OIDC_SUBJECT = "109876543210987654321";
    process.env.MAINTENANCE_OIDC_ISSUER = "https://accounts.google.com";
    process.env.MAINTENANCE_BATCH_LIMIT = "100";
    process.env.STUCK_JOB_THRESHOLD_MINUTES = "10";

    setMaintenanceOidcVerifierForTesting(async () => ({
      aud: process.env.MAINTENANCE_OIDC_AUDIENCE!,
      iss: process.env.MAINTENANCE_OIDC_ISSUER!,
      sub: process.env.MAINTENANCE_OIDC_SUBJECT!,
    }));
    recoverStaleProcessingJobsMock.mockResolvedValue({ jobs: [], nextCursor: undefined });
    expireUploadSessionsForCleanupMock.mockResolvedValue({ sessions: [], nextCursor: undefined });
    claimExpiredUploadObjectMock.mockResolvedValue(null);
    enqueueConversionJobMock.mockResolvedValue({ mode: "mock" });
    deleteExactStoredObjectMock.mockResolvedValue(undefined);
    app = await createApp();
  });

  afterEach(() => {
    setMaintenanceOidcVerifierForTesting(null);
    delete process.env.MAINTENANCE_OIDC_AUDIENCE;
    delete process.env.MAINTENANCE_OIDC_SUBJECT;
    delete process.env.MAINTENANCE_OIDC_ISSUER;
    delete process.env.MAINTENANCE_BATCH_LIMIT;
    delete process.env.STUCK_JOB_THRESHOLD_MINUTES;
    vi.restoreAllMocks();
  });

  it("rejects a request without a bearer token", async () => {
    const response = await request(app).post(endpoint).send({});

    expect(response.status).toBe(401);
    expect(recoverStaleProcessingJobsMock).not.toHaveBeenCalled();
  });

  it("rejects a malformed bearer token", async () => {
    setMaintenanceOidcVerifierForTesting(async () => {
      throw new Error("malformed token");
    });

    const response = await request(app).post(endpoint).set(authorization("not-a-jwt")).send({});

    expect(response.status).toBe(403);
    expect(recoverStaleProcessingJobsMock).not.toHaveBeenCalled();
  });

  it("fails closed when the Scheduler identity configuration is missing or non-numeric", async () => {
    delete process.env.MAINTENANCE_OIDC_SUBJECT;
    const missing = await request(app).post(endpoint).set(authorization()).send({});

    process.env.MAINTENANCE_OIDC_SUBJECT = "scheduler@example.iam.gserviceaccount.com";
    const mutableIdentity = await request(app).post(endpoint).set(authorization()).send({});

    expect(missing.status).toBe(503);
    expect(mutableIdentity.status).toBe(503);
    expect(recoverStaleProcessingJobsMock).not.toHaveBeenCalled();
  });

  it("rejects a token with the wrong audience", async () => {
    setMaintenanceOidcVerifierForTesting(async () => ({
      aud: "https://wrong.example/maintenance",
      iss: "https://accounts.google.com",
      sub: "109876543210987654321",
    }));

    const response = await request(app).post(endpoint).set(authorization()).send({});

    expect(response.status).toBe(403);
    expect(recoverStaleProcessingJobsMock).not.toHaveBeenCalled();
  });

  it("rejects a token with the wrong issuer", async () => {
    setMaintenanceOidcVerifierForTesting(async () => ({
      aud: "https://api.example/internal/maintenance/run",
      iss: "https://wrong.example",
      sub: "109876543210987654321",
    }));

    const response = await request(app).post(endpoint).set(authorization()).send({});

    expect(response.status).toBe(403);
    expect(recoverStaleProcessingJobsMock).not.toHaveBeenCalled();
  });

  it("rejects a token with the wrong subject", async () => {
    setMaintenanceOidcVerifierForTesting(async () => ({
      aud: "https://api.example/internal/maintenance/run",
      iss: "https://accounts.google.com",
      sub: "123456789012345678901",
    }));

    const response = await request(app).post(endpoint).set(authorization()).send({});

    expect(response.status).toBe(403);
    expect(recoverStaleProcessingJobsMock).not.toHaveBeenCalled();
  });

  it("accepts only the configured identity and uses successful T4 claims", async () => {
    const recoveredJob = { jobId: "recovered-job", status: "queued" };
    const unclaimedSession = { jobId: "unclaimed", objectPath: "staging/unclaimed.hwp" };
    const claimedSession = { jobId: "claimed", objectPath: "staging/claimed.hwp" };
    recoverStaleProcessingJobsMock.mockResolvedValue({ jobs: [recoveredJob] });
    expireUploadSessionsForCleanupMock.mockResolvedValue({
      sessions: [unclaimedSession, claimedSession],
    });
    claimExpiredUploadObjectMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(claimedSession);

    const response = await request(app).post(endpoint).set(authorization()).send({});

    expect(response.status).toBe(200);
    expect(enqueueConversionJobMock).toHaveBeenCalledOnce();
    expect(enqueueConversionJobMock).toHaveBeenCalledWith("recovered-job");
    expect(deleteExactStoredObjectMock).toHaveBeenCalledOnce();
    expect(deleteExactStoredObjectMock).toHaveBeenCalledWith("staging/claimed.hwp");
    expect(response.body).toMatchObject({
      attempted: 3,
      recovered: 2,
      skipped: 1,
      failed: 0,
      hasMore: false,
    });
    expect(JSON.stringify(response.body)).not.toContain("recovered-job");
    expect(JSON.stringify(response.body)).not.toContain("staging/");
  });

  it("does not enqueue or delete a successful T4 claim again on re-invocation", async () => {
    const recoveredJob = { jobId: "one-time-recovery", status: "queued" };
    const claimedSession = { jobId: "one-time-cleanup", objectPath: "staging/one-time.hwp" };
    recoverStaleProcessingJobsMock
      .mockResolvedValueOnce({ jobs: [recoveredJob], nextCursor: undefined })
      .mockResolvedValueOnce({ jobs: [], nextCursor: undefined });
    expireUploadSessionsForCleanupMock
      .mockResolvedValueOnce({ sessions: [claimedSession], nextCursor: undefined })
      .mockResolvedValueOnce({ sessions: [], nextCursor: undefined });
    claimExpiredUploadObjectMock.mockResolvedValueOnce(claimedSession);

    const first = await request(app).post(endpoint).set(authorization()).send({});
    const second = await request(app).post(endpoint).set(authorization()).send({});

    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({
      attempted: 2,
      recovered: 2,
      skipped: 0,
      failed: 0,
      hasMore: false,
    });
    expect(second.status).toBe(200);
    expect(second.body).toMatchObject({
      attempted: 0,
      recovered: 0,
      skipped: 0,
      failed: 0,
      hasMore: false,
    });
    expect(enqueueConversionJobMock).toHaveBeenCalledOnce();
    expect(deleteExactStoredObjectMock).toHaveBeenCalledOnce();
  });

  it("advances past an ineligible cleanup page with batch limit one without duplicate side effects", async () => {
    process.env.MAINTENANCE_BATCH_LIMIT = "1";
    const claimedSession = { jobId: "later-expired", objectPath: "staging/later-expired.hwp" };
    expireUploadSessionsForCleanupMock
      .mockResolvedValueOnce({ sessions: [], nextCursor: "after-ineligible" })
      .mockResolvedValueOnce({ sessions: [claimedSession], nextCursor: undefined })
      .mockResolvedValueOnce({ sessions: [], nextCursor: undefined });
    claimExpiredUploadObjectMock.mockResolvedValueOnce(claimedSession);

    const first = await request(app).post(endpoint).set(authorization()).send({});
    const second = await request(app).post(endpoint).set(authorization()).send({});

    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({
      attempted: 1,
      recovered: 1,
      skipped: 0,
      failed: 0,
      hasMore: false,
    });
    expect(second.status).toBe(200);
    expect(second.body).toMatchObject({
      attempted: 0,
      recovered: 0,
      skipped: 0,
      failed: 0,
      hasMore: false,
    });
    expect(expireUploadSessionsForCleanupMock).toHaveBeenNthCalledWith(1, {
      cutoff: expect.any(Date),
      limit: 1,
    });
    expect(expireUploadSessionsForCleanupMock).toHaveBeenNthCalledWith(2, {
      cutoff: expect.any(Date),
      limit: 1,
      cursor: "after-ineligible",
    });
    expect(expireUploadSessionsForCleanupMock).toHaveBeenCalledTimes(3);
    expect(claimExpiredUploadObjectMock).toHaveBeenCalledOnce();
    expect(claimExpiredUploadObjectMock).toHaveBeenCalledWith(claimedSession);
    expect(deleteExactStoredObjectMock).toHaveBeenCalledOnce();
    expect(deleteExactStoredObjectMock).toHaveBeenCalledWith("staging/later-expired.hwp");
    expect(enqueueConversionJobMock).not.toHaveBeenCalled();
  });

  it("bounds cleanup cursor scans when every page remains ineligible", async () => {
    process.env.MAINTENANCE_BATCH_LIMIT = "1";
    expireUploadSessionsForCleanupMock.mockImplementation(async ({ cursor }: { cursor?: string }) => ({
      sessions: [],
      nextCursor: `after-${cursor ?? "first"}`,
    }));

    const response = await request(app).post(endpoint).set(authorization()).send({});

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      attempted: 0,
      recovered: 0,
      skipped: 0,
      failed: 0,
      hasMore: true,
    });
    expect(expireUploadSessionsForCleanupMock).toHaveBeenCalledTimes(10);
    expect(claimExpiredUploadObjectMock).not.toHaveBeenCalled();
    expect(deleteExactStoredObjectMock).not.toHaveBeenCalled();
    expect(enqueueConversionJobMock).not.toHaveBeenCalled();
  });

  it("aggregates cleanup diagnostics across pages without serializing sensitive values", async () => {
    process.env.MAINTENANCE_BATCH_LIMIT = "1";
    const logSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    expireUploadSessionsForCleanupMock
      .mockResolvedValueOnce({
        sessions: [],
        nextCursor: "opaque-cursor",
        cleanupDiagnostics: {
          completedOrStatus: 1,
          alreadyClaimed: 0,
          invalidExpiry: 0,
          expiryAfterCutoff: 0,
          identityMismatch: 0,
          accepted: 0,
        },
      })
      .mockResolvedValueOnce({
        sessions: [],
        nextCursor: undefined,
        cleanupDiagnostics: {
          completedOrStatus: 0,
          alreadyClaimed: 1,
          invalidExpiry: 1,
          expiryAfterCutoff: 1,
          identityMismatch: 1,
          accepted: 0,
        },
      });

    const response = await request(app).post(endpoint).set(authorization("sensitive-token")).send({});
    const serialized = JSON.stringify({ response: response.body, logs: logSpy.mock.calls });

    expect(response.status).toBe(200);
    expect(response.body.cleanupDiagnostics).toEqual({
      completedOrStatus: 1,
      alreadyClaimed: 1,
      invalidExpiry: 1,
      expiryAfterCutoff: 1,
      identityMismatch: 1,
      accepted: 0,
      claimed: 0,
    });
    expect(serialized).not.toContain("sensitive-token");
    expect(serialized).not.toContain("opaque-cursor");
  });

  it("returns sanitized enqueue failure counts without exposing raw exceptions", async () => {
    const logSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    recoverStaleProcessingJobsMock.mockResolvedValue({
      jobs: [{ jobId: "sensitive-job", status: "queued" }],
    });
    enqueueConversionJobMock.mockRejectedValue(
      new Error("access_token=secret signedUrl=https://signed.example internal/path"),
    );

    const response = await request(app).post(endpoint).set(authorization("secret-token")).send({});

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      attempted: 1,
      recovered: 0,
      skipped: 0,
      failed: 1,
      hasMore: false,
    });
    const serialized = JSON.stringify({ response: response.body, logs: logSpy.mock.calls });
    expect(serialized).not.toContain("secret-token");
    expect(serialized).not.toContain("access_token");
    expect(serialized).not.toContain("signed.example");
    expect(serialized).not.toContain("internal/path");
    expect(serialized).not.toContain("sensitive-job");
  });

  it("returns sanitized cleanup deletion failure counts", async () => {
    const logSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const claimedSession = { jobId: "cleanup-job", objectPath: "staging/private-upload.hwp" };
    expireUploadSessionsForCleanupMock.mockResolvedValue({ sessions: [claimedSession] });
    claimExpiredUploadObjectMock.mockResolvedValue(claimedSession);
    deleteExactStoredObjectMock.mockRejectedValue(
      new Error("signedUrl=https://signed.example/staging/private-upload.hwp"),
    );

    const response = await request(app).post(endpoint).set(authorization()).send({});

    expect(response.status).toBe(200);
    expect(deleteExactStoredObjectMock).toHaveBeenCalledWith("staging/private-upload.hwp");
    expect(response.body).toMatchObject({
      attempted: 1,
      recovered: 0,
      skipped: 0,
      failed: 1,
      hasMore: false,
    });
    const serialized = JSON.stringify({ response: response.body, logs: logSpy.mock.calls });
    expect(serialized).not.toContain("cleanup-job");
    expect(serialized).not.toContain("private-upload");
    expect(serialized).not.toContain("signed.example");
  });
});
