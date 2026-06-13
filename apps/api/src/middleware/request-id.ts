import type { NextFunction, Request, Response } from "express";

export function requestIdMiddleware(request: Request, response: Response, next: NextFunction) {
  const incomingRequestId = request.header("x-request-id");
  const requestId = incomingRequestId && incomingRequestId.trim() ? incomingRequestId.trim() : crypto.randomUUID();

  response.locals.requestId = requestId;
  response.setHeader("x-request-id", requestId);
  next();
}
