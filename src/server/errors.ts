/**
 * Domain error taxonomy.
 *
 * Services throw these; the HTTP layer is the only place that knows how to turn
 * them into status codes. That keeps domain modules transport-agnostic and
 * means a service can be reused from a job, a CLI or a future gRPC surface
 * without dragging Response objects along.
 */

export type ErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "validation_failed"
  | "rate_limited"
  | "blocked"
  | "internal";

const STATUS: Record<ErrorCode, number> = {
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  validation_failed: 422,
  rate_limited: 429,
  blocked: 403,
  internal: 500,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = STATUS[code];
    this.details = details;
  }
}

export const unauthorized = (m = "You need to sign in to do that.") =>
  new AppError("unauthorized", m);

export const forbidden = (m = "You do not have access to that.") =>
  new AppError("forbidden", m);

export const notFound = (m = "We could not find that.") =>
  new AppError("not_found", m);

export const conflict = (m: string) => new AppError("conflict", m);

export const validationFailed = (m: string, details?: unknown) =>
  new AppError("validation_failed", m, details);

export const rateLimited = (m = "That's a bit too fast. Try again shortly.") =>
  new AppError("rate_limited", m);

/**
 * Deliberately indistinguishable from `not_found` at the HTTP edge for
 * discovery endpoints: telling someone "you are blocked" is itself a signal we
 * do not owe them.
 */
export const blocked = (m = "That is not available.") =>
  new AppError("blocked", m);

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError;
}
