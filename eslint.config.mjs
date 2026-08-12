import coreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/**
 * Flat config. `eslint-config-next` v16 ships native flat configs, so there is
 * no FlatCompat shim here.
 */
const config = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "src/generated/**",
      "coverage/**",
      "next-env.d.ts",
    ],
  },
  ...coreWebVitals,
  ...nextTypescript,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // The domain layer is transport-agnostic. If a service needs something from
    // the request, the route handler passes it in.
    files: ["src/server/**"],
    ignores: ["src/server/auth/cookies.ts", "src/server/http/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app/*", "next/navigation", "next/server"],
              message:
                "Domain modules must not depend on the Next.js transport layer.",
            },
          ],
        },
      ],
    },
  },
];

export default config;
