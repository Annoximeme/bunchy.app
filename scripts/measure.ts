/**
 * Query counts and wall time for the hot service calls, against real data.
 *
 * `npm run measure`. Query count matters more than the millisecond figure — a
 * call whose count grows with the size of a bunch or a member base is the one
 * that falls over at scale, and it is invisible in a wall-clock number taken on
 * a seeded database of thirteen people.
 *
 * This exists because guessing was wrong: `bunchHealth` looked cheap and was
 * costing 78ms and 15 queries on every bunch page render, loading twelve match
 * profiles to compute a number the page then discarded.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// The app client caches itself on globalThis outside production. Seeding that
// slot with an instrumented client makes every service call countable.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const instrumented = new PrismaClient({ adapter, log: [{ emit: "event", level: "query" }] });
let queries = 0;
(instrumented as never as { $on: (e: string, cb: () => void) => void }).$on("query", () => { queries += 1; });
(globalThis as never as { bunchyPrisma: unknown }).bunchyPrisma = instrumented;

async function measure(label: string, fn: () => Promise<unknown>) {
  await fn();               // warm
  queries = 0;
  const t = Date.now();
  await fn();
  console.log(`${label.padEnd(38)} ${String(queries).padStart(4)} queries ${String(Date.now() - t).padStart(5)}ms`);
}

async function main() {
  const { db } = await import("@/server/db/client");
  if (db !== instrumented) throw new Error("instrumentation did not take");

  const sarah = (await db.profile.findFirst({ where: { username: "sarah" }, select: { id: true } }))!;

  // Build a 12-member bunch — the top of the product's stated range.
  const profiles = await db.profile.findMany({ take: 12, select: { id: true } });
  const big = await db.bunch.create({
    data: {
      slug: "perf-probe", name: "Perf probe", description: "temporary",
      memberships: { create: profiles.map((p, i) => ({ profileId: p.id, role: i === 0 ? "OWNER" as const : "MEMBER" as const, status: "ACTIVE" as const })) },
    },
    select: { id: true, slug: true },
  });
  const small = (await db.bunch.findFirst({ where: { slug: { not: "perf-probe" } }, select: { id: true, slug: true, _count: { select: { memberships: true } } } }))!;

  const { recommendPeople } = await import("@/server/modules/matching/engine");
  const { bunchHealth } = await import("@/server/modules/bunches/health");
  const { getBunch, listMyBunches } = await import("@/server/modules/bunches/service");

  console.log(`(small bunch = ${small._count.memberships} members, big = 12)\n`);
  await measure("recommendPeople(limit 8)", () => recommendPeople(sarah.id, { limit: 8 }));
  await measure(`bunchHealth — ${small._count.memberships} members`, () => bunchHealth(small.id));
  await measure("bunchHealth — 12 members", () => bunchHealth(big.id));
  await measure("getBunch(slug)", () => getBunch(small.slug, sarah.id));
  await measure("listMyBunches", () => listMyBunches(sarah.id));

  await db.bunch.delete({ where: { id: big.id } });
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
