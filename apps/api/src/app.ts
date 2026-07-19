import fs from "node:fs/promises";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { ANONYMOUS_ACCESS_TOKEN_HEADER } from "@hwp2pdf/shared";
import { config } from "./config.js";
import { router } from "./routes/v1.js";
import { maintenanceRouter } from "./routes/maintenance.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { isConverterReady } from "./converter-readiness.js";
import { ApiError } from "./utils/api-error.js";

export async function createApp(options: { converterOnly?: boolean } = {}) {
  await fs.mkdir(config.uploadDirectory, { recursive: true });
  await fs.mkdir(config.resultDirectory, { recursive: true });

  const app = express();

  // Cloud Run terminates client connections at a single trusted proxy hop.
  // This lets Express derive request.ip without trusting arbitrary left-most
  // X-Forwarded-For values supplied by clients.
  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  app.use(requestIdMiddleware);
  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigin,
      allowedHeaders: ["Content-Type", "Authorization", ANONYMOUS_ACCESS_TOKEN_HEADER],
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(
    rateLimit({
      windowMs: config.rateLimitWindowMs,
      limit: config.rateLimitMax,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      keyGenerator: (request) => ipKeyGenerator(request.ip ?? "unknown"),
      skip: (request) => {
        const path = request.path;
        // Skip rate limiting for health checks, job status polling, and
        // internal worker endpoints (Cloud Tasks calls should not be rate-limited).
        // Download endpoint (/v1/jobs/:jobId/download) stays rate-limited to
        // prevent authenticated download abuse.
        if (path === "/health" || path.startsWith("/internal/")) return true;
        if (path.startsWith("/v1/jobs/") && !path.endsWith("/download")) return true;
        return false;
      },
      message: {
        error: {
          code: "rate_limit_exceeded",
          message: "요청 한도를 초과했습니다. 잠시 후 다시 시도하세요.",
        },
      },
    }),
  );

  const converterOnly = options.converterOnly ?? config.converterOnly;
  if (converterOnly) {
    app.get("/ready", (_request, response) => {
      if (isConverterReady()) {
        response.json({ status: "ready" });
        return;
      }
      response.status(503).json({ status: "starting" });
    });

    app.use((request, _response, next) => {
      if (request.path === "/health" || request.path === "/ready" || request.path === "/internal/workers/convert") {
        next();
        return;
      }
      next(new ApiError(404, "not_found", "요청한 API 경로를 찾을 수 없습니다."));
    });
  } else {
    app.use(maintenanceRouter);
  }
  app.use(router);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
