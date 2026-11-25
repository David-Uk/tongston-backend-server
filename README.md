# T-World Module Service — Server

Express + TypeScript API for content, AI summarization, token rewards and mock Web3. MongoDB (Mongoose), Zod validation, JWT auth and Pino logging.

## Requirements

- **Node.js 22 LTS** (see `.nvmrc`; `engines` requires `>=22 <23`) and npm
- **MongoDB**: MongoDB Atlas M0 (recommended) or a local MongoDB instance
  - `docker compose up -d` starts a local Mongo 8 container plus the API (see `docker-compose.yml`)
  - Multi-document transactions used in later phases need a replica set — Atlas M0 provides one; the bundled standalone container does not

## Quick start

```bash
cd server
npm ci
cp .env.example .env
# edit .env: set MONGODB_URI, MONGODB_DB_NAME and JWT_SECRET
npm run dev
```

Generate a strong `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Verify it is running:

```bash
curl http://localhost:4000/health   # {"status":"ok","uptimeSeconds":...}
curl http://localhost:4000/ready    # 200 when MongoDB is reachable, 503 otherwise
```

Open the interactive API reference at **http://localhost:4000/docs**.

## Environment

All variables are documented in `.env.example`. Required at boot:

| Variable          | Purpose                                                                            |
| ----------------- | ---------------------------------------------------------------------------------- |
| `MONGODB_URI`     | Connection string (Atlas `mongodb+srv://...` or local `mongodb://127.0.0.1:27017`) |
| `MONGODB_DB_NAME` | Database name                                                                      |
| `JWT_SECRET`      | At least 32 characters; used to sign access tokens                                 |

Everything else has a safe local default (port, CORS origins, rate limits, token rates, AI mock settings, upload limits). The app exits with a readable list of problems if any variable is missing or invalid. Secrets belong in `.env` only — it is gitignored; never commit it.

## Seed data

```bash
npm run seed
```

Creates (idempotently, via `$setOnInsert` — re-running does not reset balances or passwords):

| Role    | Email               | Password      |
| ------- | ------------------- | ------------- |
| `admin` | `admin@example.com` | `Admin@12345` |
| `user`  | `user1@example.com` | `User@12345`  |
| `user`  | `user2@example.com` | `User@12345`  |

Plus three sample `content_items`. The script refuses to run when `NODE_ENV=production`.

## Using the API

```bash
# 1. Log in — copy the "token" value from the response
curl -X POST http://localhost:4000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"user1@example.com","password":"User@12345"}'

# 2. Call a protected endpoint
curl -H 'Authorization: Bearer <token>' http://localhost:4000/auth/me
```

- Rate limiting: `RATE_LIMIT_MAX` requests per `RATE_LIMIT_WINDOW_MS` (defaults: 100 / 15 min), per IP.
- Every response includes `X-Request-Id`; the same id appears in logs for tracing.
- Errors use one envelope: `{ "error": { "code", "message", "details", "requestId" } }`.
- `POST /auth/register` creates a `user`; login is required afterwards to obtain a JWT.

## AI provider (OpenRouter)

`AI_PROVIDER=openrouter` is the default and calls OpenRouter's OpenAI-compatible `/api/v1/chat/completions` endpoint.

1. Create an API key at <https://openrouter.ai/keys>.
2. Set `OPENROUTER_API_KEY` in `.env` (required; the app refuses to boot without it).
3. `OPENROUTER_BASE_URL` defaults to `https://openrouter.ai/api/v1`; `OPENROUTER_MODEL` defaults to the small free model `liquid/lfm-3-1.7b:free`. Browse other slugs at <https://openrouter.ai/models>. Optional `OPENROUTER_SITE_URL` / `OPENROUTER_APP_NAME` headers add app attribution on OpenRouter leaderboards.

For deterministic runs without an API key, set `AI_PROVIDER=mock`.

`POST /content/:id/ai/summarize` calls the provider with a timeout (`AI_TIMEOUT_MS`) and up to `AI_MAX_RETRIES` retries for transient errors. A success awards `TOKENS_PER_AI_RUN` tokens in one MongoDB transaction (balance, ledger row and `ai_runs` row commit together); timeouts and failures award **0** tokens and return a fallback response. The AI endpoint has a separate per-user limit (`AI_RATE_LIMIT_MAX`).

> Token rewards use MongoDB transactions: use Atlas M0 or a local replica set. A standalone `mongod` will reject transactions.

## Tokens and mock Web3

| Endpoint                                                 | Purpose                                                                   |
| -------------------------------------------------------- | ------------------------------------------------------------------------- |
| `GET /tokens/balance`                                    | Current token balance                                                     |
| `GET /tokens/history?type=&page=&limit=`                 | Append-only ledger, newest first, filter by `EARN`/`CONVERT`/`WITHDRAW`   |
| `POST /tokens/convert`                                   | Debit tokens and create a `CONFIRMED` mock conversion                     |
| `POST /tokens/withdraw`                                  | Mark a confirmed conversion `WITHDRAWN` and write a `WITHDRAW` ledger row |
| `GET /tokens/conversions`                                | List your conversions for the withdraw action                             |
| `GET /admin/users`, `GET /admin/users/:id/token-history` | Admin user/balance and ledger views                                       |
| `POST /admin/tokens/grant`                               | Admin-only system tokens (`source: SYSTEM`)                               |
| `GET /admin/ledger/verify?userId=`                       | Recompute a user's hash chain and report integrity                        |

Exchange rates are config-driven (`RATE_TOKENS_PER_MOCK_USDT`, `RATE_TOKENS_PER_MOCK_ETH`, `MIN_CONVERT_AMOUNT`). Convert and withdraw accept an optional `Idempotency-Key` header; a repeated key returns `409`. The mock chain client returns deterministic `0x`-prefixed 32-byte hashes, so a real adapter can replace it later. Every ledger row stores `balanceAfter` plus `prevHash`/`hash`; there are no update or delete routes.

## Media storage

`POST /media/upload` accepts `multipart/form-data` with a `file` field (MIME allow-list and `MAX_UPLOAD_MB` from env) and stores it in your **live Cloudinary account**. Fill all three `CLOUDINARY_*` variables in `.env`; uploads return `502` until the secret is set.

`POST /media/:id/promote` streams the Cloudinary file into long-term storage, updates the asset to `PROMOTED`, then deletes the temporary Cloudinary copy. With `STORAGE_LONGTERM_MODE=mock` (default) the long-term store is a local directory (`tmp/mock-s3/`), so no AWS credentials are needed. Promotion is idempotent; a failure leaves the asset `TEMP` with its original intact and returns `502`. `STORAGE_LONGTERM_MODE=s3` selects the real AWS S3 adapter when credentials are available.

## API documentation

| URL                                  | What it is                                                       |
| ------------------------------------ | ---------------------------------------------------------------- |
| `http://localhost:4000/docs`         | Scalar interactive API reference (try requests from the browser) |
| `http://localhost:4000/swagger`      | Swagger UI alternative using the same spec                       |
| `http://localhost:4000/openapi.json` | The raw OpenAPI 3.1 document                                     |
| `http://localhost:4000/postman.json` | Postman v2.1 collection (also exported to `../docs/`)            |
| `../api.md`                          | The written contract the spec is generated from                  |

Both UI bundles are served by this app, so `/docs`, `/swagger`, `/openapi.json` and `/postman.json` work offline. Import the Postman collection and set the `token` variable with a JWT from `POST /auth/login`; `baseUrl` defaults to `http://localhost:4000`. Auth, health, content, AI, token, admin and media endpoints are live; Web3 describes the target contract for a later phase.

## Scripts

| Command                             | Purpose                                           |
| ----------------------------------- | ------------------------------------------------- |
| `npm run dev`                       | Start with hot reload (`tsx watch`)               |
| `npm run build`                     | Compile TypeScript to `dist/`                     |
| `npm start`                         | Run the compiled server (`dist/server.js`)        |
| `npm test`                          | Run the Vitest suite once                         |
| `npm run test:watch`                | Vitest in watch mode                              |
| `npm run test:coverage`             | Coverage report                                   |
| `npm run typecheck`                 | Type-check without emitting                       |
| `npm run lint` / `npm run lint:fix` | ESLint check / fix                                |
| `npm run format`                    | Prettier write                                    |
| `npm run seed`                      | Insert demo users and sample content (idempotent) |

Husky + lint-staged run ESLint and Prettier on staged files before each commit.

## Project layout

```
src/
  app.ts              Express instance (no listen) — middleware wiring, testable
  server.ts           Boot: connect DB, listen, graceful shutdown
  config/             Zod env schema + config loader
  db/                 Connection, seed and transaction helper
  docs/               OpenAPI 3.1 document
  middleware/         request validation, auth/RBAC, rate limits, errors
  modules/ai/         AI runs, prompt versioning, orchestration, routers
  modules/auth/       User model, Zod schemas, service, router
  modules/content/    Content model, Zod schemas, repository, service, router
  modules/media/      Media assets, upload/promote service and router
  modules/tokens/     Ledger/hash chain, conversions, rates, token and admin routers
  providers/ai/       OpenRouter and mock adapters behind one interface
  providers/chain/    Mock smart-contract client behind one interface
  providers/storage/  Cloudinary, S3 and mock-S3 providers behind one interface
  routes/             health and docs routers
  types/              Express request augmentation
  utils/              AppError classes, Pino logger
```

Layering rule: `route → validate → controller → service → model`. Route handlers do not contain database logic.

## Troubleshooting

- **Boot exits with "Invalid or missing environment variables"** — copy `.env.example` to `.env` and fill the required values.
- **`/ready` returns 503** — MongoDB is unreachable; check `MONGODB_URI`, credentials and the Atlas IP allow-list.
- **429 responses** — the global rate limit was hit; adjust `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS` in `.env`.
- **`/docs` is blank** — check the browser console; the page and its bundle are both served locally (`/scalar/standalone.js`), and `/openapi.json` contains the raw spec.
- **AI summary returns `AI_FAILED` fallback** — check `OPENROUTER_API_KEY` and `OPENROUTER_MODEL`. OpenRouter returns HTTP 402 when the account has insufficient credits; add credits, pick a `:free` model, or use `AI_PROVIDER=mock` for offline demos.
