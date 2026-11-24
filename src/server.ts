import { loadConfig } from './config/index.js';
import { createApp } from './app.js';
import { connectDB, disconnectDB } from './db/connection.js';
import { logger } from './utils/logger.js';

const config = loadConfig();

async function main(): Promise<void> {
  await connectDB(config.MONGODB_URI, config.MONGODB_DB_NAME);
  logger.info({ db: config.MONGODB_DB_NAME }, 'Database connected');

  const app = createApp(config);
  const server = app.listen(config.PORT, () => {
    logger.info({ port: config.PORT, env: config.NODE_ENV }, 'API listening');
  });

  let shuttingDown = false;
  const shutdown = (signal: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down');

    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason }, 'Unhandled rejection');
    process.exit(1);
  });

  process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'Uncaught exception');
    process.exit(1);
  });
}

main().catch((error: unknown) => {
  logger.fatal({ err: error }, 'Failed to start API');
  process.exit(1);
});
