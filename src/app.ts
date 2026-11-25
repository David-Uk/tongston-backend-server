import { randomUUID } from 'node:crypto';
import compression from 'compression';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import type { Config } from './config/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { createGlobalLimiter } from './middleware/rateLimit.js';
import { aiRunsRouter } from './modules/ai/ai-runs.router.js';
import { createAiRouter } from './modules/ai/ai.router.js';
import { authRouter } from './modules/auth/auth.router.js';
import { contentRouter } from './modules/content/content.router.js';
import { createMediaRouter } from './modules/media/media.router.js';
import { adminRouter } from './modules/tokens/admin.router.js';
import { createTokensRouter } from './modules/tokens/tokens.router.js';
import { createAiProvider } from './providers/ai/index.js';
import { createChainClient } from './providers/chain/index.js';
import { createStorageProviders } from './providers/storage/index.js';
import { docsRouter } from './routes/docs.js';
import { healthRouter } from './routes/health.js';
import { logger } from './utils/logger.js';

/** Builds the Express instance without listening — kept separate for tests. */
export function createApp(config: Config): Express {
  const app = express();
  app.disable('x-powered-by');

  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => {
        const incoming = req.headers['x-request-id'];
        return typeof incoming === 'string' ? incoming : randomUUID();
      },
      redact: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.body.password',
        'req.body.token',
        'res.headers["set-cookie"]',
      ],
    }),
  );

  app.use((req, res, next) => {
    const id = (req as typeof req & { id?: string }).id ?? randomUUID();
    res.locals.requestId = id;
    res.setHeader('X-Request-Id', id);
    next();
  });

  // Scalar/Swagger inject inline scripts and styles, so their pages need a
  // slightly relaxed CSP. Mounted before the strict global helmet.
  const docsHelmet = helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        fontSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
      },
    },
  });
  app.use('/docs', docsHelmet);
  app.use('/swagger', docsHelmet);
  app.use(docsRouter);

  app.use(helmet());
  app.use(cors({ origin: config.corsOrigins, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(createGlobalLimiter(config));

  // Mounted before /content so summarize authenticates only once.
  app.use('/content/:id/ai', createAiRouter(createAiProvider(config), config));
  app.use(healthRouter);
  app.use('/auth', authRouter);
  app.use('/content', contentRouter);
  app.use('/ai-runs', aiRunsRouter);
  app.use('/tokens', createTokensRouter(config, createChainClient(config)));
  app.use('/admin', adminRouter);
  const storage = createStorageProviders(config);
  app.use('/media', createMediaRouter(config, storage.shortTerm, storage.longTerm));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
