import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/server/env";

/**
 * A single Prisma client for the process.
 *
 * Next.js dev mode re-evaluates modules on every hot reload, which would open a
 * new connection pool each time and exhaust Postgres. Stashing the client on
 * `globalThis` keeps exactly one pool alive across reloads.
 */
const globalForPrisma = globalThis as unknown as {
  bunchyPrisma?: PrismaClient;
};

/**
 * How many connections this process may hold, and how long one query may run.
 *
 * Both were previously whatever `pg` defaults to, which is a pool of 10 and no
 * timeout at all. Neither default is wrong so much as unchosen, and the shape
 * of this app makes the second one matter: the bunch chat holds a Server-Sent
 * Events connection per open tab and runs a query on it every two seconds, up
 * to twelve per member. That is a steady floor of work competing for the same
 * pool as page loads, and with no `statement_timeout` a single pathological
 * query holds its connection until it finishes or the process dies.
 *
 * Ten is kept as the pool size, not raised. Four containers share one Postgres
 * (`app`, `jobs`, `bot`, and whatever a preview run adds) against the default
 * `max_connections` of 100, so there is headroom, and a bigger pool would not
 * fix contention, it would only move the queue from this process into the
 * database. What was missing was the ceiling, not the capacity.
 *
 * Fifteen seconds for a statement. Every query in this product is an indexed
 * lookup that should finish in single-digit milliseconds; anything still
 * running after fifteen seconds is a mistake, and killing it returns a
 * connection to a pool that something else is waiting on. Long enough that a
 * cold cache or a slow disk cannot trip it, short enough to be well inside the
 * patience of somebody looking at a spinner.
 *
 * Migrations run in their own container with their own client and are not
 * bounded by this, which is right: a migration that takes a minute is a
 * migration, not a runaway.
 */
const POOL_SIZE = 10;
const STATEMENT_TIMEOUT_MS = 15_000;

function createClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: env().DATABASE_URL,
    max: POOL_SIZE,
    // Applied by the driver on each new connection, so it covers every query
    // Prisma issues without any of them having to opt in.
    statement_timeout: STATEMENT_TIMEOUT_MS,
    // A connection that cannot be established should fail fast and let the
    // request return an error, rather than holding the request open while the
    // pool waits on a database that is not there.
    connectionTimeoutMillis: 10_000,
  });
  return new PrismaClient({
    adapter,
    log:
      env().NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const db: PrismaClient = globalForPrisma.bunchyPrisma ?? createClient();

if (env().NODE_ENV !== "production") {
  globalForPrisma.bunchyPrisma = db;
}
