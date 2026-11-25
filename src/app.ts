import { randomUUID } from 'node:crypto';
import compression from 'compression';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import type { Config } from './config/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { createGlobalLimiter } from './middleware/rateLimit.js';
import { authRouter } from './modules/auth/auth.router.js';
import { contentRouter } from './modules/content/content.router.js';
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

  // Scalar is served from this app but injects inline scripts/styles, so /docs
  // needs a slightly relaxed CSP. Mounted before the strict global helmet.
  app.use(
    '/docs',
    helmet({
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
    }),
  );
  app.use(docsRouter);

  app.use(helmet());
  app.use(cors({ origin: config.corsOrigins, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(createGlobalLimiter(config));

  app.use(healthRouter);
  app.use('/auth', authRouter);
  app.use('/content', contentRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
