import { Router } from 'express';
import { requireAdmin, requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  grantBodySchema,
  objectIdParamSchema,
  paginationQuerySchema,
  tokenHistoryQuerySchema,
  userIdQuerySchema,
  type GrantInput,
  type HistoryInput,
  type PaginationInput,
} from './token.schema.js';
import { grantTokens, listHistory, listUsers, verifyUserLedger } from './token.service.js';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);

adminRouter.get('/users', validate({ query: paginationQuerySchema }), async (req, res, next) => {
  try {
    res.json(await listUsers(req.validated.query as PaginationInput));
  } catch (error) {
    next(error);
  }
});

adminRouter.get(
  '/users/:id/token-history',
  validate({ params: objectIdParamSchema, query: tokenHistoryQuerySchema }),
  async (req, res, next) => {
    try {
      const { id } = req.validated.params as { id: string };
      res.json(await listHistory(id, req.validated.query as HistoryInput));
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.post('/tokens/grant', validate({ body: grantBodySchema }), async (req, res, next) => {
  try {
    res.json(await grantTokens(req.validated.body as GrantInput));
  } catch (error) {
    next(error);
  }
});

adminRouter.get(
  '/ledger/verify',
  validate({ query: userIdQuerySchema }),
  async (req, res, next) => {
    try {
      const { userId } = req.validated.query as { userId: string };
      res.json({ userId, ...(await verifyUserLedger(userId)) });
    } catch (error) {
      next(error);
    }
  },
);
