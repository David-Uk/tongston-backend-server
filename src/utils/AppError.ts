/** Typed application errors mapped to the standard api.md error envelope. */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: unknown[];

  constructor(statusCode: number, code: string, message: string, details: unknown[] = []) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, new.target);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details: unknown[] = []) {
    super(400, 'BAD_REQUEST', message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You are not allowed to perform this action') {
    super(403, 'FORBIDDEN', message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(404, 'NOT_FOUND', message);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict', details: unknown[] = []) {
    super(409, 'CONFLICT', message, details);
  }
}

export class UnprocessableError extends AppError {
  constructor(code: string, message: string, details: unknown[] = []) {
    super(422, code, message, details);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests') {
    super(429, 'RATE_LIMITED', message);
  }
}

export class UpstreamError extends AppError {
  constructor(message = 'Upstream provider failed', code = 'UPSTREAM_ERROR') {
    super(502, code, message);
  }
}
