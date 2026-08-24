import { execFileSync } from "node:child_process";
import { Client } from "pg";
import { loadEnvFiles } from "@/server/load-env";
import { afterAll, beforeAll, beforeEach } from "vitest";

/**
 * Integration test bootstrap.
 *
 * These tests run against a real PostgreSQL database, because the things they
 * exist to check, cascade behaviour, `SetNull` on a foreign key, a transaction
 * that must not half-commit, are properties of the database and cannot be
 * observed against a mock. A test double that returns whatever we told it to
 * would have happily agreed that deleting an account preserves its reports.
 *
 * Three rules make that safe to run repeatedly:
 *
 * 1. **A separate database.** `bunchy_test`, never the development one. The
 *    URL is rewritten here rather than read from `.env`, so there is no
 *    configuration mistake that can point this suite at real data.
 * 2. **Truncate between tests, migrate once.** Re-running migrations per test
 *    would take minutes; truncating every table takes milliseconds and leaves
 *    exactly the same clean slate.
 * 3. **One worker.** Tests share a database, so they run serially, see
 *    `singleFork` in the config. Parallel workers truncating each other's rows
 *    is a flake generator, not a speed-up.
 */

loadEnvFiles();

const source = process.env.DATABASE_URL;
if (!source) throw new Error("DATABASE_URL must be set to run integration tests");

/** Same server and credentials, different database. */
export const TEST_DATABASE_URL = source.replace(
  /\/([^/?]+)(\?|$)/,
  (_match, _name: string, tail: string) => `/bunchy_test${tail}`,
);

if (TEST_DATABASE_URL === source) {
  throw new Error(`Could not derive a test database name from DATABASE_URL`);
}
process.env.DATABASE_URL = TEST_DATABASE_URL;

/**
 * Runs one statement against a sibling database, using the `pg` client the app
 * already depends on rather than shelling out to `psql`. A CI runner is not
 * guaranteed to have the Postgres client tools installed, and an undeclared
 * dependency on a binary is the kind of thing that works locally and fails on
 * the first push.
 */
async function statement(database: string, sql: string) {
  const url = TEST_DATABASE_URL.replace(/\/bunchy_test(\?|$)/, `/${database}$1`);
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}

let tables: string[] = [];

beforeAll(async () => {
  // `postgres` is the one database guaranteed to exist to connect through.
  try {
    await statement("postgres", `CREATE DATABASE bunchy_test`);
  } catch {
    // Already there, the normal case after the first run.
  }

  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: ["ignore", "ignore", "pipe"],
  });

  const { db } = await import("./db");
  const rows = await db.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  tables = rows.map((r) => `"${r.tablename}"`);
  if (tables.length === 0) throw new Error("Test database has no tables");
}, 120_000);

beforeEach(async () => {
  const { db } = await import("./db");
  // One statement so it is atomic, and CASCADE so ordering does not matter.
  await db.$executeRawUnsafe(
    `TRUNCATE TABLE ${tables.join(", ")} RESTART IDENTITY CASCADE`,
  );
});

afterAll(async () => {
  const { db } = await import("./db");
  await db.$disconnect();
});
