import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    globals: true,
    // Set before any module loads so config/env.ts validates with these present.
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-secret-not-for-production',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      // Ramp to the spec's 80% target as real logic lands in later phases.
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 60,
        statements: 60,
      },
      // Bootstrap / DB-bound files aren't unit-tested (covered by integration
      // tests against a live Postgres in later phases).
      exclude: [
        'dist/**',
        'tests/**',
        '**/*.config.*',
        'src/index.ts',
        'src/server.ts',
        'src/database/**',
        'prisma/**',
      ],
    },
  },
});
