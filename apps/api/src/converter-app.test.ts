import { describe, expect, it } from "vitest";
import request from "supertest";

import { createApp } from "./app.js";
import { buildMockOidcToken, setOidcVerifierForTesting } from "./middleware/worker-auth.js";

describe("converter-only application surface", () => {
  it("rejects public API routes while preserving health", async () => {
    const app = await createApp({ converterOnly: true });

    await expect(request(app).get("/health")).resolves.toMatchObject({ status: 200 });
    await expect(request(app).post("/v1/upload")).resolves.toMatchObject({ status: 404 });
    await expect(request(app).get("/v1/jobs/example")).resolves.toMatchObject({ status: 404 });
    await expect(request(app).get("/v1/results/example.pdf")).resolves.toMatchObject({ status: 404 });
  });

  it("fails closed when converter mode has no expected OIDC email", async () => {
    const priorMode = process.env.CONVERTER_ONLY;
    const priorEmail = process.env.CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL;
    const priorFirebaseMode = process.env.FIREBASE_ADMIN_MODE;
    process.env.CONVERTER_ONLY = "true";
    delete process.env.CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL;
    process.env.FIREBASE_ADMIN_MODE = "mock";
    setOidcVerifierForTesting(async () => ({
      aud: "http://localhost:8080/internal/workers/convert",
      iss: "https://accounts.google.com",
      email: "unexpected@example.invalid",
    }));

    const app = await createApp({ converterOnly: true });
    const response = await request(app)
      .post("/internal/workers/convert")
      .set("Authorization", `Bearer ${buildMockOidcToken({ aud: "unused", iss: "https://accounts.google.com" })}`)
      .send({ jobId: "example" });

    expect(response.status).toBe(503);
    setOidcVerifierForTesting(null);
    if (priorMode === undefined) delete process.env.CONVERTER_ONLY;
    else process.env.CONVERTER_ONLY = priorMode;
    if (priorEmail === undefined) delete process.env.CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL;
    else process.env.CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL = priorEmail;
    if (priorFirebaseMode === undefined) delete process.env.FIREBASE_ADMIN_MODE;
    else process.env.FIREBASE_ADMIN_MODE = priorFirebaseMode;
  });

  it("rejects a token without the required Google issuer", async () => {
    const priorMode = process.env.CONVERTER_ONLY;
    const priorEmail = process.env.CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL;
    const priorFirebaseMode = process.env.FIREBASE_ADMIN_MODE;
    process.env.CONVERTER_ONLY = "true";
    process.env.CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL = "dispatcher@example.invalid";
    process.env.FIREBASE_ADMIN_MODE = "mock";
    setOidcVerifierForTesting(async () => ({
      aud: "http://localhost:8080/internal/workers/convert",
      iss: "",
      email: "dispatcher@example.invalid",
    }));

    const app = await createApp({ converterOnly: true });
    const response = await request(app)
      .post("/internal/workers/convert")
      .set("Authorization", `Bearer ${buildMockOidcToken({ aud: "unused", iss: "https://accounts.google.com" })}`)
      .send({ jobId: "example" });

    expect(response.status).toBe(403);
    setOidcVerifierForTesting(null);
    if (priorMode === undefined) delete process.env.CONVERTER_ONLY;
    else process.env.CONVERTER_ONLY = priorMode;
    if (priorEmail === undefined) delete process.env.CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL;
    else process.env.CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL = priorEmail;
    if (priorFirebaseMode === undefined) delete process.env.FIREBASE_ADMIN_MODE;
    else process.env.FIREBASE_ADMIN_MODE = priorFirebaseMode;
  });
});
