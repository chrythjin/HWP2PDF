import { afterEach, describe, expect, it, vi } from "vitest";

const execFileMock = vi.fn();

vi.mock("node:child_process", () => ({
  execFile: execFileMock,
}));

describe("converter readiness", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
    execFileMock.mockReset();
  });

  it("fails closed before LibreOffice warm-up when a dedicated converter value is missing", async () => {
    process.env.CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL = "dispatcher@example.invalid";
    process.env.INTERNAL_WORKER_URL = "https://converter.example.invalid/internal/workers/convert";
    process.env.INTERNAL_WORKER_AUDIENCE = "https://converter.example.invalid";
    delete process.env.INTERNAL_WORKER_ISSUER;

    const { initializeConverterRuntime } = await import("./converter-readiness.js");

    await expect(initializeConverterRuntime()).rejects.toThrow(/INTERNAL_WORKER_ISSUER/);
    expect(execFileMock).not.toHaveBeenCalled();
  });

  it("warms LibreOffice only after every dedicated converter value is configured", async () => {
    process.env.CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL = "dispatcher@example.invalid";
    process.env.INTERNAL_WORKER_URL = "https://converter.example.invalid/internal/workers/convert";
    process.env.INTERNAL_WORKER_AUDIENCE = "https://converter.example.invalid";
    process.env.INTERNAL_WORKER_ISSUER = "https://accounts.google.com";
    execFileMock.mockImplementation((_file, _args, callback) => callback(null, "", ""));

    const { initializeConverterRuntime, isConverterReady } = await import("./converter-readiness.js");

    await initializeConverterRuntime();

    expect(execFileMock).toHaveBeenCalledOnce();
    expect(isConverterReady()).toBe(true);
  });
});
