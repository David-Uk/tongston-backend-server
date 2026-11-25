import { Router } from 'express';
import type { Config } from '../../config/index.js';
import { requireAuth } from '../../middleware/auth.js';
import { createAiRateLimiter } from '../../middleware/aiRateLimit.js';
import { validate } from '../../middleware/validate.js';
import type { AiProvider } from '../../providers/ai/ai.provider.js';
import { getContentById } from '../content/content.service.js';
import { objectIdParamSchema, summarizeBodySchema, type SummarizeInputDto } from './ai.schema.js';
import { summarizeContent } from './ai.service.js';

export function createAiRouter(provider: AiProvider, config: Config): Router {
  const router = Router({ mergeParams: true });
  const rateLimiter = createAiRateLimiter(config);

  router.post(
    '/summarize',
    requireAuth,
    rateLimiter,
    validate({ params: objectIdParamSchema, body: summarizeBodySchema }),
    async (req, res, next) => {
      try {
        const { id } = req.validated.params as { id: string };
        const content = await getContentById(id);
        const result = await summarizeContent(
          content,
          req.user!.id,
          req.validated.body as SummarizeInputDto,
          provider,
          config,
        );
        res.json(result);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
