import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

/**
 * Component tests.
 *
 * A third config rather than a jsdom environment on the whole unit suite: the
 * domain tests are pure functions and should not pay for a DOM, and keeping
 * them separate means `npm test` stays a fraction of a second.
 *
 * What belongs here is narrow. These do not test that a button is blue — they
 * test the promises the UI makes on the product's behalf: that opening the
 * notification screen does not mark anything read, that a failed save puts the
 * switch back, that the delete button will not arm itself early.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["tests/components/**/*.test.tsx"],
    setupFiles: ["./tests/components/setup.ts"],
    globals: false,
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
