import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config/index.js';
import { connectDB } from '../src/db/connection.js';

// Reuse the app and DB connection across warm serverless invocations.
let cachedApp: Promise<ReturnType<typeof createApp>> | undefined;

function getApp(): Promise<ReturnType<typeof createApp>> {
  if (!cachedApp) {
    cachedApp = (async () => {
      const config = loadConfig();
      await connectDB(config.MONGODB_URI, config.MONGODB_DB_NAME);
      return createApp(config);
    })();
  }
  return cachedApp;
}

/** Vercel serverless entry point — the Express app handles the request as-is. */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const app = await getApp();
  app(req, res);
}
