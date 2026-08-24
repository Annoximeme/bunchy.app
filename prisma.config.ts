import { defineConfig } from "prisma/config";
import { loadEnvFiles } from "./src/server/load-env";

// Prisma 7 no longer loads .env implicitly. Node 22 can do it natively, so we
// avoid pulling in dotenv just for the CLI. `.env.local` wins over `.env`,
// matching Next.js precedence so the app and the CLI always agree on a target.
// The ordering that actually delivers that is not the obvious one; see the
// helper.
loadEnvFiles();

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
