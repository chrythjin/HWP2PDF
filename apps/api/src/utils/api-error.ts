export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function toApiErrorBody(error: ApiError): ApiErrorBody {
  return {
    error: {
      code: error.code,
      message: error.message,
    },
  };
}
