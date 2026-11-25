import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { listAiRunsQuerySchema, objectIdParamSchema, type ListAiRunsInput } from './ai.schema.js';
import { getAiRun, listAiRuns } from './ai.service.js';

export const aiRunsRouter = Router();
aiRunsRouter.use(requireAuth);

aiRunsRouter.get('/', validate({ query: listAiRunsQuerySchema }), async (req, res, next) => {
  try {
    res.json(
      await listAiRuns(req.user!.id, req.user!.role, req.validated.query as ListAiRunsInput),
    );
  } catch (error) {
    next(error);
  }
});

aiRunsRouter.get('/:id', validate({ params: objectIdParamSchema }), async (req, res, next) => {
  try {
    const { id } = req.validated.params as { id: string };
    res.json(await getAiRun(id, req.user!.id, req.user!.role));
  } catch (error) {
    next(error);
  }
});
