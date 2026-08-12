/**
 * The database handle for integration tests, and the guard that comes with it.
 *
 * Integration tests truncate every table between cases. Pointed at the wrong
 * database that is not a test run, it is data loss — which is exactly what
 * happened once, when the unit config's `tests/**` glob swept these files up
 * and ran them against the development database with none of the integration
 * setup. A thousand rows went into `bunchy_dev` before anyone noticed.
 *
 * The glob was fixed. This exists because a glob is a thing someone can change
 * back: the only way to get a database handle in an integration test is through
 * here, and this refuses to hand one over unless the URL says `bunchy_test`.
 */
const url = process.env.DATABASE_URL ?? "";

if (!/\/bunchy_test(\?|$)/.test(url)) {
  throw new Error(
    "Integration tests must run against bunchy_test. " +
      `DATABASE_URL points at "${url.replace(/:\/\/[^@]*@/, "://***@")}". ` +
      "Run them with `npm run test:integration`.",
  );
}

// Imported *after* the check, not at the top of the file, so the guard is what
// fails on a bad URL. A static import is hoisted above this block, and the
// environment validator would then throw first with a less useful message.
const { db: client } = await import("@/server/db/client");

export const db = client;
