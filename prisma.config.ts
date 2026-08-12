import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// Prisma 7 no longer loads .env implicitly. Node 22 can do it natively, so we
// avoid pulling in dotenv just for the CLI. `.env.local` wins over `.env`,
// matching Next.js precedence so the app and the CLI always agree on a target.
for (const file of [".env", ".env.local"]) {
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
