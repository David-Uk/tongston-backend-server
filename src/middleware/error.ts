import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

type WithRequestId = { requestId?: string };

const requestId = (res: Response): string | undefined => (res.locals as WithRequestId).requestId;

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
      details: [],
      requestId: requestId(res),
    },
  });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const appError =
    err instanceof AppError ? err : new AppError(500, 'INTERNAL_ERROR', 'Something went wrong');

  if (!(err instanceof AppError)) {
    logger.error({ err, requestId: requestId(res) }, 'Unhandled error');
  }

  res.status(appError.statusCode).json({
    error: {
      code: appError.code,
      message: appError.message,
      details: appError.details,
      requestId: requestId(res),
    },
  });
}
