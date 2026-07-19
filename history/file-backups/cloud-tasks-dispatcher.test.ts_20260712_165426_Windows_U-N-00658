import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  enqueueConversionJob,
  resetMockDispatcher,
  getMockEnqueuedJobIds,
  getDispatcherMode,
  resolveQueueConfig,
  createInternalWorkerUrl,
  getWorkerAudience,
  resetCloudTasksClientForTesting,
  type CloudTasksQueueConfig,
} from "./cloud-tasks-dispatcher.js";

// ---------------------------------------------------------------------------
// Tests for the Cloud Tasks conversion dispatcher (Todo 6).
//
// Verifies:
//   - Mock mode: enqueue records jobId in memory, no network calls.
//   - Mock mode: duplicate enqueue is recorded (caller decides idempotency).
//   - Production config missing: explicit error when cloud-tasks mode is
//     forced but env vars are missing.
//   - URL helpers construct correct worker URL and audience.
//   - Dispatcher mode resolution respects env overrides.
// ---------------------------------------------------------------------------

describe("cloud-tasks-dispatcher", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetMockDispatcher();
    resetCloudTasksClientForTesting();
    // Default to mock mode for tests.
    process.env.FIREBASE_ADMIN_MODE = "mock";
    delete process.env.CONVERSION_DISPATCHER;
    delete process.env.CLOUD_TASKS_QUEUE_NAME;
    delete process.env.CLOUD_TASKS_LOCATION;
    delete process.env.CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL;
    delete process.env.INTERNAL_WORKER_URL;
    delete process.env.INTERNAL_API_URL;
    delete process.env.INTERNAL_WORKER_AUDIENCE;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // Dispatcher mode resolution
  // -----------------------------------------------------------------------

  describe("getDispatcherMode", () => {
    it("returns 'mock' when FIREBASE_ADMIN_MODE=mock and no explicit CONVERSION_DISPATCHER", () => {
      process.env.FIREBASE_ADMIN_MODE = "mock";
      delete process.env.CONVERSION_DISPATCHER;
      expect(getDispatcherMode()).toBe("mock");
    });

    it("returns 'cloud-tasks' when CONVERSION_DISPATCHER=cloud-tasks", () => {
      process.env.CONVERSION_DISPATCHER = "cloud-tasks";
      expect(getDispatcherMode()).toBe("cloud-tasks");
    });

    it("returns 'inline' when CONVERSION_DISPATCHER=inline", () => {
      process.env.CONVERSION_DISPATCHER = "inline";
      expect(getDispatcherMode()).toBe("inline");
    });

    it("returns 'inline' when no config and no mock mode", () => {
      process.env.FIREBASE_ADMIN_MODE = "adc";
      delete process.env.CONVERSION_DISPATCHER;
      delete process.env.CLOUD_TASKS_QUEUE_NAME;
      expect(getDispatcherMode()).toBe("inline");
    });
  });

  // -----------------------------------------------------------------------
  // Mock mode: enqueue
  // -----------------------------------------------------------------------

  describe("mock mode enqueue", () => {
    it("records jobId in mock state", async () => {
      const result = await enqueueConversionJob("job-001");
      expect(result.mode).toBe("mock");
      expect(getMockEnqueuedJobIds()).toContain("job-001");
    });

    it("records multiple jobIds", async () => {
      await enqueueConversionJob("job-001");
      await enqueueConversionJob("job-002");
      expect(getMockEnqueuedJobIds()).toEqual(["job-001", "job-002"]);
    });

    it("duplicate enqueue records both (caller decides idempotency)", async () => {
      await enqueueConversionJob("job-001");
      await enqueueConversionJob("job-001");
      expect(getMockEnqueuedJobIds()).toEqual(["job-001", "job-001"]);
    });

    it("resetMockDispatcher clears state", async () => {
      await enqueueConversionJob("job-001");
      resetMockDispatcher();
      expect(getMockEnqueuedJobIds()).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // Production config missing error
  // -----------------------------------------------------------------------

  describe("cloud-tasks mode with missing config", () => {
    it("throws explicit error when cloud-tasks mode is forced but env vars are missing", async () => {
      process.env.CONVERSION_DISPATCHER = "cloud-tasks";
      process.env.FIREBASE_ADMIN_MODE = "adc";
      delete process.env.CLOUD_TASKS_QUEUE_NAME;
      delete process.env.CLOUD_TASKS_LOCATION;
      delete process.env.CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL;

      await expect(enqueueConversionJob("job-001")).rejects.toThrow(
        /Cloud Tasks dispatcher is enabled but required env vars are missing/,
      );
    });

    it("throws when queue config is explicitly null", async () => {
      process.env.CONVERSION_DISPATCHER = "cloud-tasks";
      process.env.FIREBASE_ADMIN_MODE = "adc";

      await expect(enqueueConversionJob("job-001", null)).rejects.toThrow(
        /Cloud Tasks dispatcher is enabled but required env vars are missing/,
      );
    });
  });

  // -----------------------------------------------------------------------
  // Queue config resolution
  // -----------------------------------------------------------------------

  describe("resolveQueueConfig", () => {
    it("returns null when env vars are missing", () => {
      delete process.env.CLOUD_TASKS_QUEUE_NAME;
      expect(resolveQueueConfig()).toBeNull();
    });

    it("returns config when all env vars are present", () => {
      process.env.CLOUD_TASKS_QUEUE_NAME = "conversion-queue";
      process.env.CLOUD_TASKS_LOCATION = "asia-northeast3";
      process.env.CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL = "worker@project.iam.gserviceaccount.com";
      process.env.INTERNAL_WORKER_URL = "https://api.example.com/internal/workers/convert";
      process.env.INTERNAL_WORKER_AUDIENCE = "https://api.example.com/internal/workers/convert";

      const config = resolveQueueConfig();
      expect(config).not.toBeNull();
      expect(config!.queueName).toBe("conversion-queue");
      expect(config!.location).toBe("asia-northeast3");
      expect(config!.serviceAccountEmail).toBe("worker@project.iam.gserviceaccount.com");
      expect(config!.workerUrl).toBe("https://api.example.com/internal/workers/convert");
      expect(config!.audience).toBe("https://api.example.com/internal/workers/convert");
    });
  });

  // -----------------------------------------------------------------------
  // URL helpers
  // -----------------------------------------------------------------------

  describe("createInternalWorkerUrl", () => {
    it("uses INTERNAL_WORKER_URL when set", () => {
      process.env.INTERNAL_WORKER_URL = "https://custom-worker.example.com/internal/workers/convert";
      expect(createInternalWorkerUrl()).toBe("https://custom-worker.example.com/internal/workers/convert");
    });

    it("constructs from INTERNAL_API_URL when INTERNAL_WORKER_URL is not set", () => {
      delete process.env.INTERNAL_WORKER_URL;
      process.env.INTERNAL_API_URL = "https://api.example.com";
      expect(createInternalWorkerUrl()).toBe("https://api.example.com/internal/workers/convert");
    });

    it("strips trailing slash from INTERNAL_API_URL", () => {
      delete process.env.INTERNAL_WORKER_URL;
      process.env.INTERNAL_API_URL = "https://api.example.com/";
      expect(createInternalWorkerUrl()).toBe("https://api.example.com/internal/workers/convert");
    });

    it("falls back to localhost when no URL env is set", () => {
      delete process.env.INTERNAL_WORKER_URL;
      delete process.env.INTERNAL_API_URL;
      const url = createInternalWorkerUrl();
      expect(url).toContain("localhost");
      expect(url).toContain("/internal/workers/convert");
    });
  });

  describe("getWorkerAudience", () => {
    it("uses INTERNAL_WORKER_AUDIENCE when set", () => {
      process.env.INTERNAL_WORKER_AUDIENCE = "custom-audience-string";
      expect(getWorkerAudience()).toBe("custom-audience-string");
    });

    it("falls back to worker URL when audience is not set", () => {
      delete process.env.INTERNAL_WORKER_AUDIENCE;
      process.env.INTERNAL_WORKER_URL = "https://api.example.com/internal/workers/convert";
      expect(getWorkerAudience()).toBe("https://api.example.com/internal/workers/convert");
    });
  });

  // -----------------------------------------------------------------------
  // Inline mode
  // -----------------------------------------------------------------------

  describe("inline mode", () => {
    it("calls convertJobToPdf directly without network", async () => {
      process.env.CONVERSION_DISPATCHER = "inline";
      process.env.FIREBASE_ADMIN_MODE = "adc";

      // Mock the conversion service and job store to avoid actual conversion.
      const conversionMock = vi.fn().mockResolvedValue(undefined);
      vi.doMock("../services/conversion-service.js", () => ({
        convertJobToPdf: conversionMock,
      }));

      // Mock getJob to return a job.
      const { createJob } = await import("./job-store.js");
      const job = await createJob({
        jobId: "inline-test-001",
        originalFileName: "test.hwp",
        sourcePath: "/tmp/test.hwp",
        status: "queued",
        progress: 60,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      });

      const result = await enqueueConversionJob(job.jobId);
      expect(result.mode).toBe("inline");
    });
  });
});