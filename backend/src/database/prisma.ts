import { PrismaClient } from '@prisma/client';
import { isProd } from '../config/index.js';
import { logger } from '../utils/logger.js';

/**
 * Single shared PrismaClient. Cached on globalThis so `tsx watch` hot-reloads
 * don't open a new connection pool on every change (a classic dev-time leak).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProd ? ['warn', 'error'] : ['query', 'warn', 'error'],
  });

if (!isProd) {
  globalForPrisma.prisma = prisma;
}

/** Verify connectivity at boot; callers can fail fast if the DB is unreachable. */
export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  logger.info('🗄️  Database connected');
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}
