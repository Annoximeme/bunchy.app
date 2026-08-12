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

function createClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: env().DATABASE_URL });
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
