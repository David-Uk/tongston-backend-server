import { rateLimit } from 'express-rate-limit';
import type { Config } from '../config/index.js';
import { TooManyRequestsError } from '../utils/AppError.js';

/** Global IP-based limiter; configured entirely from env. */
export function createGlobalLimiter(config: Config) {
  return rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    limit: config.RATE_LIMIT_MAX,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, _res, next) => {
      next(new TooManyRequestsError('Too many requests, please try again later'));
    },
  });
}
