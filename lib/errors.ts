type ErrorCode =
  | "bad_request"
  | "not_configured"
  | "rate_limited"
  | "not_found"
  | "upstream"
  | "internal";

// publicMessage is safe to show users; any other error is reported as internal.
class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly publicMessage: string,
    readonly status: number
  ) {
    super(publicMessage);
    this.name = "AppError";
  }
}

export const errors = {
  badRequest: (message: string) => new AppError("bad_request", message, 400),
  notConfigured: (message: string) => new AppError("not_configured", message, 503),
  rateLimited: (message: string) => new AppError("rate_limited", message, 429),
  notFound: (message: string) => new AppError("not_found", message, 404),
  upstream: (message: string) => new AppError("upstream", message, 502),
};

export function toPublicError(err: unknown): { code: ErrorCode; message: string; status: number } {
  if (err instanceof AppError) {
    return { code: err.code, message: err.publicMessage, status: err.status };
  }
  return { code: "internal", message: "Something went wrong. Please try again.", status: 500 };
}
