import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    // Integration tests have their own config, their own database and their own
    // truncating setup. Left in this glob they would run against the *dev*
    // database with none of that — which is exactly what happened once.
    exclude: ["tests/integration/**", "node_modules/**"],
    setupFiles: ["./tests/setup.ts"],
    globals: false,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
