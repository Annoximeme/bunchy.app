import { existsSync } from "node:fs";

/**
 * Test environment bootstrap.
 *
 * Several modules construct a database client at import time, so any test that
 * transitively imports one needs `DATABASE_URL` present even when it never
 * touches the database. Loading the same `.env` the app uses keeps tests and
 * runtime pointed at the same place, and means a future integration suite works
 * without extra setup.
 *
 * `.env.local` wins over `.env`, matching Next.js precedence.
 */
for (const file of [".env", ".env.local"]) {
  if (existsSync(file)) process.loadEnvFile(file);
}
