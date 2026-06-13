import type { NextFunction, Request, Response } from "express";
import { ApiError, toApiErrorBody } from "../utils/api-error.js";

export function notFoundHandler(_request: Request, _response: Response, next: NextFunction) {
  next(new ApiError(404, "not_found", "요청한 API 경로를 찾을 수 없습니다."));
}

export function errorHandler(error: unknown, _request: Request, response: Response, _next: NextFunction) {
  if (error instanceof ApiError) {
    response.status(error.statusCode).json(toApiErrorBody(error));
    return;
  }

  console.error(error);
  response.status(500).json({
    error: {
      code: "internal_error",
      message: "서버 오류가 발생했습니다.",
    },
  });
}
