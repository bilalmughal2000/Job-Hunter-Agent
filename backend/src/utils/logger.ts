import { pino } from 'pino';
import { env, isProd, isTest } from '../config/index.js';

/**
 * Central Pino logger. Pretty-printed in dev, JSON in prod, silent in tests.
 * Domain modules should create child loggers, e.g. `logger.child({ agent: 'search' })`.
 */
export const logger = pino({
  level: isTest ? 'silent' : env.LOG_LEVEL,
  transport: isProd
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss',
          ignore: 'pid,hostname',
        },
      },
  base: { service: 'ai-job-hunter-backend' },
});

export type Logger = typeof logger;
