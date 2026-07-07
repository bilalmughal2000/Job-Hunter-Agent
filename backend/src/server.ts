import type { Server } from 'node:http';
import { createApp } from './app.js';
import { env } from './config/index.js';
import { logger } from './utils/logger.js';

/**
 * Boots the HTTP server and wires graceful shutdown. Returns the server
 * handle so it can be awaited/closed by callers or tests.
 */
export function startServer(): Server {
  const app = createApp();

  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 AI Job Hunter API listening on http://localhost:${env.PORT}/api/v1`);
    logger.info(`   environment: ${env.NODE_ENV}`);
  });

  const shutdown = (signal: string): void => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
    // Force-exit if connections linger.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection');
  });

  return server;
}
