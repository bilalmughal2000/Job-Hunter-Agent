import 'dotenv/config';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

// Modern Prisma config (replaces the deprecated `package.json#prisma` key).
// `dotenv/config` above ensures DATABASE_URL is loaded for CLI commands, since
// a config file disables Prisma's implicit .env loading.
export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
});
