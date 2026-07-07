import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { rateLimit } from 'express-rate-limit';
import { pinoHttp } from 'pino-http';
import { env } from './config/index.js';
import { logger } from './utils/logger.js';
import { createApiRouter } from './routes/index.js';
import { buildContainer, type AppContainer } from './container.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';

/**
 * Builds the Express application. Exported as a factory so tests can spin up
 * an app instance without binding to a port, and inject a fake container.
 */
export function createApp(container: AppContainer = buildContainer()): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // Security & platform middleware
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(pinoHttp({ logger }));

  // Global rate limiter (per-route limiters added in later phases as needed).
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 300,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
    }),
  );

  // API
  app.use('/api/v1', createApiRouter(container));

  // Errors (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
