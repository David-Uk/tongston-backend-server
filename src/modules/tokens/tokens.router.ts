import { Router } from 'express';
import type { Config } from '../../config/index.js';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import type { ChainClient } from '../../providers/chain/chain.client.js';
import {
  convertBodySchema,
  tokenHistoryQuerySchema,
  withdrawBodySchema,
  type ConvertInput,
  type HistoryInput,
  type WithdrawInput,
} from './token.schema.js';
import { convert, getBalance, listConversions, listHistory, withdraw } from './token.service.js';

export function createTokensRouter(config: Config, chain: ChainClient): Router {
  const router = Router();
  router.use(requireAuth);

  router.get('/balance', async (req, res, next) => {
    try {
      res.json(await getBalance(req.user!.id));
    } catch (error) {
      next(error);
    }
  });

  router.get('/history', validate({ query: tokenHistoryQuerySchema }), async (req, res, next) => {
    try {
      res.json(await listHistory(req.user!.id, req.validated.query as HistoryInput));
    } catch (error) {
      next(error);
    }
  });

  router.get('/conversions', async (req, res, next) => {
    try {
      res.json(await listConversions(req.user!.id));
    } catch (error) {
      next(error);
    }
  });

  router.post('/convert', validate({ body: convertBodySchema }), async (req, res, next) => {
    try {
      const result = await convert(
        req.user!.id,
        req.validated.body as ConvertInput,
        req.get('Idempotency-Key'),
        config,
        chain,
      );
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post('/withdraw', validate({ body: withdrawBodySchema }), async (req, res, next) => {
    try {
      const result = await withdraw(
        req.user!.id,
        req.validated.body as WithdrawInput,
        req.get('Idempotency-Key'),
        chain,
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
