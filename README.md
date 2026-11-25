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

## API documentation

| URL                                  | What it is                                                       |
| ------------------------------------ | ---------------------------------------------------------------- |
| `http://localhost:4000/docs`         | Scalar interactive API reference (try requests from the browser) |
| `http://localhost:4000/openapi.json` | The raw OpenAPI 3.1 document                                     |
| `../api.md`                          | The written contract the spec is generated from                  |

The Scalar UI bundle is served by this app, so `/docs` and `/openapi.json` work fully offline. Auth and health endpoints are live; groups from Content onward describe the target contract and are implemented in later phases.

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
  db/                 Connection and seed script
  docs/               OpenAPI 3.1 document
  middleware/         request validation, auth/RBAC, rate limit, errors
  modules/auth/       User model, Zod schemas, service, router
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
