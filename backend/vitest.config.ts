import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    globals: true,
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
      // Bootstrap files (process wiring / port binding) aren't unit-tested.
      exclude: ['dist/**', 'tests/**', '**/*.config.*', 'src/index.ts', 'src/server.ts'],
    },
  },
});
