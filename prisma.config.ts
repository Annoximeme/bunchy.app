import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

/**
 * Prisma 7 no longer loads .env implicitly. Node 22 can do it natively, so we
 * avoid pulling in dotenv just for the CLI.
 *
 * ## Why this is written out rather than importing the shared helper
 *
 * `src/server/load-env.ts` does exactly this and is what the seed and both
 * test setups call. This file cannot use it. The migration image is
 * deliberately minimal, it carries the Prisma CLI, the schema and the migration
 * history and nothing else, and `src` is not copied into it. Importing the
 * helper here made every deploy fail at the migrate step with "Cannot find
 * module ./src/server/load-env", which stops the deploy before the app
 * restarts, so the failure is safe and total and entirely self-inflicted.
 *
 * ## The order is backwards from how it reads, on purpose
 *
 * `process.loadEnvFile` does not overwrite a variable that is already set:
 * first writer wins, not last. Reading `.env` first therefore gives it
 * precedence over `.env.local`, which is the opposite of Next.js and the
 * opposite of what the comment here used to claim. `.env.local` is read first
 * so that it claims its keys and `.env` fills in only what is left. Anything
 * already in the real environment beats both.
 *
 * The helper carries the full explanation. Keep the two in step: they are the
 * same three lines and they must not disagree about which file wins.
 */
for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) process.loadEnvFile(file);
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL,
    // Used by `prisma migrate dev` and `migrate diff` to replay migrations
    // against a scratch database. Never written to by the running app.
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
