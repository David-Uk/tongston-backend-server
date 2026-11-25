import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { apiReference } from '@scalar/express-api-reference';
import express, { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiDocument } from '../docs/openapi.js';
import { postmanCollection } from '../docs/postman.js';

export const docsRouter = Router();

// Serve Scalar's own UMD bundle locally so /docs needs no internet access.
const localRequire = createRequire(import.meta.url);
const scalarBrowserDir = join(dirname(localRequire.resolve('@scalar/api-reference')), 'browser');
docsRouter.use('/scalar', express.static(scalarBrowserDir));

/** Raw spec so the docs UI and external clients render the same contract. */
docsRouter.get('/openapi.json', (_req, res) => {
  res.json(openApiDocument);
});

/** Interactive Scalar API reference. */
docsRouter.get(
  '/docs',
  apiReference({
    theme: 'purple',
    pageTitle: 'T-World Module Service API',
    cdn: '/scalar/standalone.js',
    withDefaultFonts: false,
    spec: { url: '/openapi.json' },
  }),
);

/** Swagger UI alternative, served from local assets. */
docsRouter.use('/swagger', swaggerUi.serve);
docsRouter.get(
  '/swagger',
  swaggerUi.setup(openApiDocument, { customSiteTitle: 'T-World Module Service API' }),
);

/** Postman v2.1 collection derived from the same spec. */
docsRouter.get('/postman.json', (_req, res) => {
  res.json(postmanCollection);
});
