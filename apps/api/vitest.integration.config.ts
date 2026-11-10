import { defineConfig } from 'vitest/config';

/** Runs the Prisma adapters against a real PostgreSQL database (`<db>_test`). */
export default defineConfig({
  test: {
    include: ['test/integration/**/*.test.ts'],
    globalSetup: ['test/integration/global-setup.ts'],
    // Tests share one database and truncate it between cases.
    fileParallelism: false,
    hookTimeout: 60_000,
    testTimeout: 20_000,
  },
});
