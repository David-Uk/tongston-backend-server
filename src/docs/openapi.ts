/**
 * OpenAPI 3.1 rendering of ../api.md (repo root) — the spec is the source of truth.
 * Auth/health are live; the remaining groups describe the target contract.
 */
const bearer = [{ bearerAuth: [] }];

const errorResponse = {
  description: 'Error (standard api.md envelope)',
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
};

const json = (schema: unknown) => ({ 'application/json': { schema } });
const response = (description: string, schema?: unknown) =>
  schema ? { description, content: json(schema) } : { description };
const errors = {
  400: errorResponse,
  401: errorResponse,
  403: errorResponse,
  404: errorResponse,
  409: errorResponse,
  422: errorResponse,
  429: errorResponse,
  502: errorResponse,
};

const pageParam = {
  name: 'page',
  in: 'query',
  schema: { type: 'integer', minimum: 1, default: 1 },
  description: 'Page number',
};
const limitParam = {
  name: 'limit',
  in: 'query',
  schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
  description: 'Page size (max 100)',
};
const idParam = (description: string) => ({
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string' },
  description,
});

export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'T-World Module Service API',
    version: '0.1.0',
    description:
      'Content, AI summarization, token rewards and mock Web3. Auth and health endpoints are live; the other groups describe the target contract from api.md and are implemented in later phases. All errors use the standard envelope: `{ error: { code, message, details, requestId } }`.',
  },
  servers: [
    {
      url: 'http://localhost:{port}',
      description: 'Local development',
      variables: { port: { default: '4000' } },
    },
  ],
  tags: [
    { name: 'Auth', description: 'Register, login and current user' },
    { name: 'Content', description: 'Planned — Phase 2' },
    { name: 'AI', description: 'Planned — Phase 3' },
    { name: 'Tokens', description: 'Planned — Phase 4' },
    { name: 'Admin', description: 'Planned — admin only' },
    { name: 'Media', description: 'Planned — Phase 5' },
    { name: 'Web3', description: 'Planned — stretch' },
    { name: 'Operations', description: 'Health, readiness and these docs' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'object',
            required: ['code', 'message', 'details', 'requestId'],
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: { type: 'array', items: {} },
              requestId: { type: 'string' },
            },
          },
        },
      },
      User: {
        type: 'object',
        required: ['id', 'email', 'role', 'tokenBalance'],
        properties: {
          id: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['admin', 'user'] },
          tokenBalance: { type: 'integer', minimum: 0 },
        },
      },
      Credentials: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8, maxLength: 128, format: 'password' },
        },
      },
      AuthResult: {
        type: 'object',
        required: ['token', 'user'],
        properties: { token: { type: 'string' }, user: { $ref: '#/components/schemas/User' } },
      },
      ContentItem: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string', minLength: 1, maxLength: 200 },
          body: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          createdBy: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateContent: {
        type: 'object',
        required: ['title', 'body'],
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 200 },
          body: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' }, default: [] },
        },
      },
      SummarizeRequest: {
        type: 'object',
        properties: {
          tone: { type: 'string', enum: ['neutral', 'formal', 'casual', 'persuasive'] },
          length: { type: 'string', enum: ['short', 'medium', 'long'] },
        },
      },
      SummarizeResponse: {
        type: 'object',
        properties: {
          output: { type: 'string' },
          latencyMs: { type: 'integer' },
          tokensAwarded: { type: 'integer' },
          totalTokenBalance: { type: 'integer' },
          status: { type: 'string', enum: ['SUCCESS', 'FALLBACK', 'TIMEOUT', 'FAILED'] },
          reason: { type: 'string' },
        },
      },
      AiRun: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          contentId: { type: 'string' },
          userId: { type: 'string' },
          promptVersion: { type: 'string' },
          status: { type: 'string', enum: ['SUCCESS', 'FALLBACK', 'TIMEOUT', 'FAILED'] },
          output: { type: 'string' },
          latencyMs: { type: 'integer' },
          tokensAwarded: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      TokenBalance: {
        type: 'object',
        properties: { userId: { type: 'string' }, tokenBalance: { type: 'integer' } },
      },
      TokenTransaction: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string', enum: ['EARN', 'CONVERT', 'WITHDRAW'] },
          source: { type: 'string' },
          amount: { type: 'integer' },
          balanceAfter: { type: 'integer' },
          referenceId: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      ConvertRequest: {
        type: 'object',
        required: ['toAsset', 'amount'],
        properties: {
          toAsset: { type: 'string', enum: ['MOCK_USDT', 'MOCK_ETH'] },
          amount: { type: 'integer', minimum: 100 },
        },
      },
      ConvertResponse: {
        type: 'object',
        properties: {
          conversionId: { type: 'string' },
          txHashMock: { type: 'string' },
          convertedAmount: { type: 'string' },
          status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'WITHDRAWN', 'FAILED'] },
          totalTokenBalance: { type: 'integer' },
        },
      },
      WithdrawRequest: {
        type: 'object',
        required: ['conversionId'],
        properties: { conversionId: { type: 'string' } },
      },
      WithdrawResponse: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          network: { type: 'string' },
          txHashMock: { type: 'string' },
        },
      },
      MediaAsset: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          status: { type: 'string', enum: ['TEMP', 'PROMOTED', 'FAILED'] },
          provider: { type: 'string' },
          url: { type: 'string' },
          s3Key: { type: 'string' },
          mimeType: { type: 'string' },
          size: { type: 'integer' },
        },
      },
      ListMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
        },
      },
    },
  },
  paths: {
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Create a user (role defaults to user)',
        security: [],
        requestBody: {
          required: true,
          content: json({ $ref: '#/components/schemas/Credentials' }),
        },
        responses: {
          201: response('Created user', { $ref: '#/components/schemas/User' }),
          ...errors,
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in and receive a JWT',
        security: [],
        requestBody: {
          required: true,
          content: json({ $ref: '#/components/schemas/Credentials' }),
        },
        responses: {
          200: response('Token and user', { $ref: '#/components/schemas/AuthResult' }),
          ...errors,
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Current user profile',
        security: bearer,
        responses: {
          200: response('Current user', { $ref: '#/components/schemas/User' }),
          ...errors,
        },
      },
    },
    '/content': {
      post: {
        tags: ['Content'],
        summary: 'Create a content item (createdBy comes from the token)',
        security: bearer,
        requestBody: {
          required: true,
          content: json({ $ref: '#/components/schemas/CreateContent' }),
        },
        responses: {
          201: response('Created content', { $ref: '#/components/schemas/ContentItem' }),
          ...errors,
        },
      },
      get: {
        tags: ['Content'],
        summary: 'List content with tag filter, full-text search and pagination',
        security: bearer,
        parameters: [
          { name: 'tag', in: 'query', schema: { type: 'string' }, description: 'Exact tag match' },
          {
            name: 'q',
            in: 'query',
            schema: { type: 'string' },
            description: 'Full-text search on title and body',
          },
          pageParam,
          limitParam,
        ],
        responses: {
          200: response('Content page', {
            type: 'object',
            properties: {
              data: { type: 'array', items: { $ref: '#/components/schemas/ContentItem' } },
              meta: { $ref: '#/components/schemas/ListMeta' },
            },
          }),
          ...errors,
        },
      },
    },
    '/content/{id}': {
      get: {
        tags: ['Content'],
        summary: 'Get one content item by id',
        security: bearer,
        parameters: [idParam('Content id (ObjectId)')],
        responses: {
          200: response('Content item', { $ref: '#/components/schemas/ContentItem' }),
          ...errors,
        },
      },
    },
    '/content/{id}/ai/summarize': {
      post: {
        tags: ['AI'],
        summary: 'Summarize content; award 5 tokens only on SUCCESS',
        description:
          'Per-user rate limit applies. Timeout/fallback/failure return 200 with 0 tokens awarded and a status/reason flag.',
        security: bearer,
        parameters: [idParam('Content id (ObjectId)')],
        requestBody: {
          required: true,
          content: json({ $ref: '#/components/schemas/SummarizeRequest' }),
        },
        responses: {
          200: response('Summary result', { $ref: '#/components/schemas/SummarizeResponse' }),
          ...errors,
        },
      },
    },
    '/ai-runs': {
      get: {
        tags: ['AI'],
        summary: 'List AI runs (own for users, all for admins)',
        security: bearer,
        parameters: [
          {
            name: 'contentId',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter by content id',
          },
          pageParam,
        ],
        responses: {
          200: response('AI runs', {
            type: 'object',
            properties: {
              data: { type: 'array', items: { $ref: '#/components/schemas/AiRun' } },
              meta: { $ref: '#/components/schemas/ListMeta' },
            },
          }),
          ...errors,
        },
      },
    },
    '/ai-runs/{id}': {
      get: {
        tags: ['AI'],
        summary: 'Get one AI run (owner or admin)',
        security: bearer,
        parameters: [idParam('AI run id')],
        responses: {
          200: response('AI run', { $ref: '#/components/schemas/AiRun' }),
          ...errors,
        },
      },
    },
    '/tokens/balance': {
      get: {
        tags: ['Tokens'],
        summary: 'Current token balance',
        security: bearer,
        responses: {
          200: response('Balance', { $ref: '#/components/schemas/TokenBalance' }),
          ...errors,
        },
      },
    },
    '/tokens/history': {
      get: {
        tags: ['Tokens'],
        summary: 'Append-only token ledger, newest first',
        security: bearer,
        parameters: [
          {
            name: 'type',
            in: 'query',
            schema: { type: 'string', enum: ['EARN', 'CONVERT', 'WITHDRAW'] },
          },
          pageParam,
          limitParam,
        ],
        responses: {
          200: response('Ledger page', {
            type: 'object',
            properties: {
              data: { type: 'array', items: { $ref: '#/components/schemas/TokenTransaction' } },
              meta: { $ref: '#/components/schemas/ListMeta' },
            },
          }),
          ...errors,
        },
      },
    },
    '/tokens/convert': {
      post: {
        tags: ['Tokens'],
        summary: 'Convert tokens to a mock asset in one transaction',
        security: bearer,
        parameters: [
          {
            name: 'Idempotency-Key',
            in: 'header',
            schema: { type: 'string' },
            description: 'Optional; prevents double-submits',
          },
        ],
        requestBody: {
          required: true,
          content: json({ $ref: '#/components/schemas/ConvertRequest' }),
        },
        responses: {
          201: response('Conversion result', { $ref: '#/components/schemas/ConvertResponse' }),
          ...errors,
        },
      },
    },
    '/tokens/withdraw': {
      post: {
        tags: ['Tokens'],
        summary: 'Withdraw a confirmed conversion (owner only)',
        security: bearer,
        parameters: [{ name: 'Idempotency-Key', in: 'header', schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: json({ $ref: '#/components/schemas/WithdrawRequest' }),
        },
        responses: {
          200: response('Confirmation', { $ref: '#/components/schemas/WithdrawResponse' }),
          ...errors,
        },
      },
    },
    '/tokens/conversions': {
      get: {
        tags: ['Tokens'],
        summary: "List the caller's conversions for the withdraw action",
        security: bearer,
        responses: {
          200: response('Conversions', {
            type: 'array',
            items: { $ref: '#/components/schemas/ConvertResponse' },
          }),
          ...errors,
        },
      },
    },
    '/admin/users': {
      get: {
        tags: ['Admin'],
        summary: 'List users with balances (admin only)',
        security: bearer,
        parameters: [pageParam],
        responses: {
          200: response('Users', {
            type: 'object',
            properties: {
              data: { type: 'array', items: { $ref: '#/components/schemas/User' } },
              meta: { $ref: '#/components/schemas/ListMeta' },
            },
          }),
          ...errors,
        },
      },
    },
    '/admin/users/{id}/token-history': {
      get: {
        tags: ['Admin'],
        summary: "Read any user's ledger (admin only)",
        security: bearer,
        parameters: [idParam('User id')],
        responses: {
          200: response('Ledger', {
            type: 'array',
            items: { $ref: '#/components/schemas/TokenTransaction' },
          }),
          ...errors,
        },
      },
    },
    '/admin/tokens/grant': {
      post: {
        tags: ['Admin'],
        summary: 'Grant system test tokens (source: SYSTEM)',
        security: bearer,
        requestBody: {
          required: true,
          content: json({
            type: 'object',
            properties: { userId: { type: 'string' }, amount: { type: 'integer', minimum: 1 } },
          }),
        },
        responses: {
          200: response('Updated balance', { $ref: '#/components/schemas/TokenBalance' }),
          ...errors,
        },
      },
    },
    '/admin/ledger/verify': {
      get: {
        tags: ['Admin'],
        summary: '(Stretch) Verify a user ledger hash chain',
        security: bearer,
        parameters: [{ name: 'userId', in: 'query', schema: { type: 'string' } }],
        responses: {
          200: response('Integrity result', {
            type: 'object',
            properties: { valid: { type: 'boolean' }, userId: { type: 'string' } },
          }),
          ...errors,
        },
      },
    },
    '/media/upload': {
      post: {
        tags: ['Media'],
        summary: 'Upload a file to short-term storage (TEMP)',
        security: bearer,
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: { file: { type: 'string', format: 'binary' } },
              },
            },
          },
        },
        responses: {
          201: response('Created asset', { $ref: '#/components/schemas/MediaAsset' }),
          ...errors,
        },
      },
    },
    '/media/{id}/promote': {
      post: {
        tags: ['Media'],
        summary: 'Promote an asset to long-term storage (idempotent)',
        security: bearer,
        parameters: [idParam('Media asset id')],
        responses: {
          200: response('Promoted asset', { $ref: '#/components/schemas/MediaAsset' }),
          ...errors,
        },
      },
    },
    '/web3/nonce': {
      get: {
        tags: ['Web3'],
        summary: '(Stretch) Issue a single-use signing nonce',
        security: bearer,
        responses: {
          200: response('Nonce', { type: 'object', properties: { nonce: { type: 'string' } } }),
          ...errors,
        },
      },
    },
    '/web3/verify-signature': {
      post: {
        tags: ['Web3'],
        summary: '(Stretch) Verify a signed message',
        security: bearer,
        requestBody: {
          required: true,
          content: json({
            type: 'object',
            required: ['address', 'message', 'signature'],
            properties: {
              address: { type: 'string' },
              message: { type: 'string' },
              signature: { type: 'string' },
            },
          }),
        },
        responses: {
          200: response('Verification result', {
            type: 'object',
            properties: { valid: { type: 'boolean' }, recoveredAddress: { type: 'string' } },
          }),
          ...errors,
        },
      },
    },
    '/health': {
      get: {
        tags: ['Operations'],
        summary: 'Liveness probe',
        security: [],
        responses: {
          200: response('Alive', {
            type: 'object',
            properties: { status: { type: 'string' }, uptimeSeconds: { type: 'integer' } },
          }),
        },
      },
    },
    '/ready': {
      get: {
        tags: ['Operations'],
        summary: 'Readiness probe (pings MongoDB)',
        security: [],
        responses: {
          200: response('Ready', {
            type: 'object',
            properties: { status: { type: 'string' }, database: { type: 'string' } },
          }),
          503: errorResponse,
        },
      },
    },
    '/docs': {
      get: {
        tags: ['Operations'],
        summary: 'Interactive Scalar API reference',
        security: [],
        responses: { 200: { description: 'HTML documentation page' } },
      },
    },
    '/openapi.json': {
      get: {
        tags: ['Operations'],
        summary: 'Raw OpenAPI document',
        security: [],
        responses: { 200: response('OpenAPI 3.1 document', { type: 'object' }) },
      },
    },
  },
};
