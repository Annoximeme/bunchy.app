import { db } from "@/server/db/client";
import type { Prisma } from "@/generated/prisma/client";
import {
  bunchChemistry,
  type BunchChemistry,
  type ChemistrySignal,
} from "@/server/modules/bunches/chemistry";
import { scorer } from "@/server/modules/matching/index";
import {
  buildScoringContext,
  loadMatchProfile,
} from "@/server/modules/matching/repository";
import { track } from "@/server/modules/analytics/track";
import { ANALYTICS_EVENTS } from "@/server/modules/analytics/events";

/**
 * Loading what `bunchChemistry` needs, computing it, and storing the result.
 *
 * The scoring itself is a pure function with no database access, so this is the
 * only file in the feature that knows Prisma exists — the same split the
 * matching engine uses, and for the same reason: the interesting logic stays
 * testable without a server.
 *
 * **Nothing here runs during a page render.** Computing a full reading means
 * loading every member's match profile and scoring every pair — measured at
 * 78ms against 4ms for the rest of the bunch page. `readChemistry` serves the
 * stored row; `recomputeChemistry` is called by the scheduled job (§21).
 */

const MESSAGE_WINDOW_DAYS = 35;
/** Above this, pairwise scoring stops being worth it and the mean stops moving. */
const MAX_PAIRWISE_MEMBERS = 12;

export interface StoredChemistry {
  score: number | null;
  previousScore: number | null;
  confidence: string;
  signals: ChemistrySignal[];
  observations: string[];
  computedAt: Date;
}

/**
 * The stored reading. One indexed lookup, no scoring.
 *
 * Returns null when a bunch has never been scored — which is the normal state
 * for the first hour of its life, and reads on screen as "too new to tell"
 * rather than as an error.
 */
export async function readChemistry(
  bunchId: string,
): Promise<StoredChemistry | null> {
  const row = await db.bunchChemistry.findUnique({
    where: { bunchId },
    select: {
      score: true,
      previousScore: true,
      confidence: true,
      signals: true,
      observations: true,
      computedAt: true,
    },
  });
  if (!row) return null;

  return {
    score: row.score,
    previousScore: row.previousScore,
    confidence: row.confidence,
    signals: (row.signals as unknown as ChemistrySignal[]) ?? [],
    observations: (row.observations as unknown as string[]) ?? [],
    computedAt: row.computedAt,
  };
}

/**
 * Scores one bunch and stores the result.
 *
 * Unlike the old read path, this *does* include pairwise compatibility. It was
 * dropped before because it cost 78ms on every page load to produce a number
 * the page then discarded; now the number is shown, and the work happens in a
 * job where 78ms is free.
 */
export async function recomputeChemistry(
  bunchId: string,
  now = new Date(),
): Promise<BunchChemistry> {
  const since = new Date(now.getTime() - MESSAGE_WINDOW_DAYS * 86_400_000);

  const [memberships, messages, activities] = await Promise.all([
    db.bunchMembership.findMany({
      where: { bunchId, status: "ACTIVE" },
      select: { profileId: true, joinedAt: true },
    }),
    db.bunchMessage.findMany({
      where: { bunchId, kind: "TEXT", createdAt: { gte: since } },
      select: { authorId: true, createdAt: true },
    }),
    db.activity.findMany({
      where: { bunchId },
      select: {
        startsAt: true,
        status: true,
        participants: { where: { status: "JOINED" }, select: { profileId: true } },
      },
    }),
  ]);

  const result = bunchChemistry({
    members: memberships,
    pairs: await pairwiseScores(memberships.map((m) => m.profileId), now),
    messages,
    activities: activities.map((a) => ({
      startsAt: a.startsAt,
      cancelled: a.status === "CANCELLED",
      participantIds: a.participants.map((p) => p.profileId),
    })),
    now,
  });

  const existing = await db.bunchChemistry.findUnique({
    where: { bunchId },
    select: { score: true },
  });

  await db.bunchChemistry.upsert({
    where: { bunchId },
    create: {
      bunchId,
      score: result.score,
      previousScore: null,
      confidence: result.confidence,
      signals: result.signals as unknown as Prisma.InputJsonValue,
      observations: result.observations as unknown as Prisma.InputJsonValue,
      computedAt: now,
    },
    update: {
      score: result.score,
      // Only moves when there is a new number to compare against, so a run
      // that produces null does not erase the last real reading's context.
      previousScore: result.score !== null ? existing?.score ?? null : undefined,
      confidence: result.confidence,
      signals: result.signals as unknown as Prisma.InputJsonValue,
      observations: result.observations as unknown as Prisma.InputJsonValue,
      computedAt: now,
    },
  });

  track({
    name: ANALYTICS_EVENTS.CHEMISTRY_UPDATED,
    profileId: null,
    properties: {
      bunchId,
      score: result.score,
      confidence: result.confidence,
      members: memberships.length,
    },
  });

  return result;
}

/**
 * Mean pairwise compatibility across the group.
 *
 * Capped: past a dozen members the pair count grows quadratically while the
 * mean barely moves, so a large bunch is sampled by its first members rather
 * than scored exhaustively. The alternative is a job whose cost is O(n²) in the
 * size of the biggest group on the platform.
 */
async function pairwiseScores(
  profileIds: string[],
  now: Date,
): Promise<Array<{ score: number }>> {
  const sample = profileIds.slice(0, MAX_PAIRWISE_MEMBERS);
  if (sample.length < 2) return [];

  const [profiles, context] = await Promise.all([
    Promise.all(sample.map((id) => loadMatchProfile(id, now))),
    buildScoringContext(now),
  ]);
  const present = profiles.filter((p): p is NonNullable<typeof p> => p !== null);
  if (present.length < 2) return [];

  const engine = scorer();
  const pairs: Array<{ score: number }> = [];

  for (let i = 0; i < present.length; i++) {
    const subject = present[i]!;
    const others = present.slice(i + 1);
    if (others.length === 0) break;

    const matches = await engine.scorePeople(subject, others, context);
    for (const match of matches) pairs.push({ score: match.score / 100 });
  }

  return pairs;
}

/**
 * Rescores every bunch that could plausibly have changed.
 *
 * Bunches with no members are skipped entirely — there is nothing to say about
 * a group nobody has accepted into yet, and scoring them would be the bulk of
 * the work on a young platform.
 */
export async function recomputeAllChemistry(
  now = new Date(),
): Promise<{ scored: number; skipped: number }> {
  const bunches = await db.bunch.findMany({
    where: { archivedAt: null, memberships: { some: { status: "ACTIVE" } } },
    select: { id: true },
  });

  let scored = 0;
  for (const bunch of bunches) {
    try {
      await recomputeChemistry(bunch.id, now);
      scored += 1;
    } catch (error) {
      // One bad bunch must not stop the rest of the run.
      console.error(`[chemistry] failed for ${bunch.id}`, error);
    }
  }

  return { scored, skipped: bunches.length - scored };
}
