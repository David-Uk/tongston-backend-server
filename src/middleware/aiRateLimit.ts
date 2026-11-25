import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import type { Config } from '../config/index.js';
import { TooManyRequestsError } from '../utils/AppError.js';

/** Per-user limit on the AI endpoint so tokens cannot be farmed. */
export function createAiRateLimiter(config: Config) {
  return rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    limit: config.AI_RATE_LIMIT_MAX,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip ?? 'unknown'),
    handler: (_req, _res, next) => {
      next(new TooManyRequestsError('AI rate limit reached, please try again later'));
    },
  });
}
