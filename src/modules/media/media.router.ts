import { Router } from 'express';
import multer from 'multer';
import type { Config } from '../../config/index.js';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import type { StorageProvider } from '../../providers/storage/index.js';
import { AppError, BadRequestError } from '../../utils/AppError.js';
import { mediaIdSchema } from './media.schema.js';
import { promoteMedia, uploadMedia } from './media.service.js';

export function createMediaRouter(
  config: Config,
  shortTerm: StorageProvider,
  longTerm: StorageProvider,
): Router {
  const router = Router();
  router.use(requireAuth);

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.MAX_UPLOAD_MB * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
      if (config.allowedMimeTypes.includes(file.mimetype)) callback(null, true);
      else callback(new BadRequestError('Unsupported MIME type'));
    },
  }).single('file');

  router.post('/upload', (req, res, next) => {
    upload(req, res, (error) => {
      if (error) {
        next(error instanceof AppError ? error : new BadRequestError(error.message));
        return;
      }
      if (!req.file) {
        next(new BadRequestError('No file provided'));
        return;
      }
      uploadMedia(req.file, req.user!.id, config, shortTerm)
        .then((result) => res.status(201).json(result))
        .catch(next);
    });
  });

  router.post('/:id/promote', validate({ params: mediaIdSchema }), async (req, res, next) => {
    try {
      const { id } = req.validated.params as { id: string };
      res.json(await promoteMedia(id, req.user!, shortTerm, longTerm));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
