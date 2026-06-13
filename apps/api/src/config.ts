export const config = {
  port: Number(process.env.PORT ?? 8080),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  uploadDirectory: process.env.UPLOAD_DIR ?? "tmp/uploads",
  resultDirectory: process.env.RESULT_DIR ?? "tmp/results",
  converterCommand: process.env.LIBREOFFICE_BIN ?? "soffice",
  rateLimitWindowMs: 60 * 60 * 1000,
  rateLimitMax: 60,
  resultUrlBase: process.env.RESULT_URL_BASE ?? "http://localhost:8080/v1/results",
} as const;
