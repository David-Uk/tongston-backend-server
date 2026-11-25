import { openApiDocument } from './openapi.js';

const METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

interface Operation {
  summary?: string;
  tags?: string[];
  parameters?: Array<{ name: string; in: string; description?: string }>;
}

const BODY_EXAMPLES: Record<string, unknown> = {
  'post /auth/register': { email: 'user@example.com', password: 'Password123' },
  'post /auth/login': { email: 'user@example.com', password: 'Password123' },
  'post /content': { title: 'A title', body: 'Some body', tags: ['example'] },
  'post /content/{id}/ai/summarize': { tone: 'neutral', length: 'short' },
  'post /tokens/convert': { toAsset: 'MOCK_USDT', amount: 100 },
  'post /tokens/withdraw': { conversionId: '{{conversionId}}' },
  'post /admin/tokens/grant': { userId: '{{userId}}', amount: 100 },
};

const variables = [
  { key: 'baseUrl', value: 'http://localhost:4000' },
  { key: 'token', value: '' },
  { key: 'id', value: '' },
  { key: 'contentId', value: '' },
  { key: 'userId', value: '' },
  { key: 'conversionId', value: '' },
];

/** Derives a Postman v2.1 collection from the same OpenAPI document the UIs use. */
export const postmanCollection = {
  info: {
    name: 'T-World Module Service API',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    description: 'Generated from api.md. Set the token variable with a JWT from POST /auth/login.',
  },
  auth: {
    type: 'bearer',
    bearer: [{ key: 'token', value: '{{token}}', type: 'string' }],
  },
  variable: variables,
  item: (() => {
    const folders = new Map<string, unknown[]>();

    for (const [path, pathItem] of Object.entries(openApiDocument.paths)) {
      for (const method of METHODS) {
        const operation = (pathItem as Record<string, unknown>)[method] as Operation | undefined;
        if (!operation) continue;

        const folder = operation.tags?.[0] ?? 'Other';
        const items = folders.get(folder) ?? [];
        const parameters = operation.parameters ?? [];
        const rawPath = path.replace(/\{([^}]+)\}/g, '{{$1}}');

        const request: Record<string, unknown> = {
          method: method.toUpperCase(),
          header:
            method === 'post' &&
            (path === '/media/upload' ? true : BODY_EXAMPLES[`${method} ${path}`])
              ? [{ key: 'Content-Type', value: 'application/json' }]
              : [],
          url: {
            raw: `{{baseUrl}}${rawPath}`,
            host: ['{{baseUrl}}'],
            path: rawPath.split('/').filter(Boolean),
            query: parameters
              .filter((parameter) => parameter.in === 'query')
              .map((parameter) => ({ key: parameter.name, value: '' })),
          },
          description: operation.summary ?? '',
        };

        if (path === '/media/upload' && method === 'post') {
          request.body = {
            mode: 'formdata',
            formdata: [{ key: 'file', type: 'file', src: [] }],
          };
          request.header = [];
        } else {
          const example = BODY_EXAMPLES[`${method} ${path}`];
          if (example !== undefined) {
            request.body = {
              mode: 'raw',
              raw: JSON.stringify(example, null, 2),
              options: { raw: { language: 'json' } },
            };
          }
        }

        items.push({ name: `${method.toUpperCase()} ${path}`, request });
        folders.set(folder, items);
      }
    }

    return [...folders].map(([name, item]) => ({ name, item }));
  })(),
};
