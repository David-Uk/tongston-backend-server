import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  contentIdSchema,
  createContentBodySchema,
  listContentQuerySchema,
  type CreateContentInput,
  type ListContentInput,
} from './content.schema.js';
import { createContent, getContentById, listContent } from './content.service.js';

export const contentRouter = Router();
contentRouter.use(requireAuth);

contentRouter.post('/', validate({ body: createContentBodySchema }), async (req, res, next) => {
  try {
    const created = await createContent(req.validated.body as CreateContentInput, req.user!.id);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

contentRouter.get('/', validate({ query: listContentQuerySchema }), async (req, res, next) => {
  try {
    res.json(await listContent(req.validated.query as ListContentInput));
  } catch (error) {
    next(error);
  }
});

contentRouter.get('/:id', validate({ params: contentIdSchema }), async (req, res, next) => {
  try {
    const { id } = req.validated.params as { id: string };
    res.json(await getContentById(id));
  } catch (error) {
    next(error);
  }
});
