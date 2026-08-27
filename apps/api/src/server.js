import { createApp } from './app.js';
import { env } from './config/env.js';
import { closeDatabase } from './infrastructure/database.js';
import { logger } from './infrastructure/logger.js';

const app = createApp();
const server = app.listen(env.API_PORT, env.API_HOST, () => {
  logger.info({ host: env.API_HOST, port: env.API_PORT }, 'API started');
});

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'Shutting down');

  server.close(async (error) => {
    try {
      await closeDatabase();
      if (error) throw error;
      process.exitCode = 0;
    } catch (shutdownError) {
      logger.error({ err: shutdownError }, 'Graceful shutdown failed');
      process.exitCode = 1;
    }
  });

  setTimeout(() => {
    logger.fatal('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
