import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Integration tests: real database, no mocks.
 *
 * Kept in its own config rather than a tag on the unit suite so `npm test`
 * stays fast and runnable with no infrastructure — a test suite people skip
 * because it needs a database is a test suite that stops being run.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    setupFiles: ["./tests/integration/setup.ts"],
    globals: false,
    // Tests share one database, so they must not run concurrently.
    pool: "forks",
    singleFork: true,
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
