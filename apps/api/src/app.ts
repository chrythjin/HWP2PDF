import fs from "node:fs/promises";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config } from "./config.js";
import { router } from "./routes/v1.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { requestIdMiddleware } from "./middleware/request-id.js";

export async function createApp() {
  await fs.mkdir(config.uploadDirectory, { recursive: true });
  await fs.mkdir(config.resultDirectory, { recursive: true });

  const app = express();

  app.use(requestIdMiddleware);
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: "1mb" }));
  app.use(
    rateLimit({
      windowMs: config.rateLimitWindowMs,
      limit: config.rateLimitMax,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: {
        error: {
          code: "rate_limit_exceeded",
          message: "요청 한도를 초과했습니다. 잠시 후 다시 시도하세요.",
        },
      },
    }),
  );

  app.use(router);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
