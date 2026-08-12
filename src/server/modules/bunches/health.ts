import { db } from "@/server/db/client";
import {
  bunchChemistry,
  type BunchChemistry,
} from "@/server/modules/bunches/chemistry";
import {
  buildScoringContext,
  loadMatchProfile,
} from "@/server/modules/matching/repository";
import type { MatchProfile } from "@/server/modules/matching/types";
import { scorer } from "@/server/modules/matching";

/**
 * Loading what `bunchChemistry` needs, and nothing else.
 *
 * The scoring itself is a pure function with no database access, so this is the
 * only file in the feature that knows Prisma exists — the same split the
 * matching engine uses, and for the same reason: the interesting logic stays
 * testable without a server.
 */

const MESSAGE_WINDOW_DAYS = 35;

export async function bunchHealth(bunchId: string): Promise<BunchChemistry> {
  const now = new Date();
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
        participants: {
          where: { status: "JOINED" },
          select: { profileId: true },
        },
      },
    }),
  ]);

  return bunchChemistry({
    members: memberships,
    pairs: await pairwiseCompatibility(memberships.map((m) => m.profileId)),
    messages,
    activities: activities.map((a) => ({
      startsAt: a.startsAt,
      cancelled: a.status === "CANCELLED",
      participantIds: a.participants.map((p) => p.profileId),
    })),
    now,
  });
}

/**
 * Mean pairwise compatibility across the group.
 *
 * Scoring every pair is O(n²) in the size of a bunch, which is fine precisely
 * because a bunch is capped in the low tens — the same query on an unbounded
 * group would be a mistake. Above `MAX_PAIRWISE_MEMBERS` the signal is dropped
 * rather than approximated, because a wrong number is worse than none.
 */
const MAX_PAIRWISE_MEMBERS = 16;

async function pairwiseCompatibility(
  profileIds: string[],
): Promise<Array<{ score: number }>> {
  if (profileIds.length < 2 || profileIds.length > MAX_PAIRWISE_MEMBERS) return [];

  const loaded = await Promise.all(profileIds.map((id) => loadMatchProfile(id)));
  const profiles = loaded.filter((p): p is MatchProfile => p !== null);
  if (profiles.length < 2) return [];

  const context = await buildScoringContext();
  const active = scorer();
  const pairs: Array<{ score: number }> = [];

  for (let i = 0; i < profiles.length; i++) {
    const subject = profiles[i]!;
    const others = profiles.slice(i + 1);
    if (others.length === 0) break;
    const matches = await active.scorePeople(subject, others, context);
    for (const match of matches) pairs.push({ score: match.score / 100 });
  }

  return pairs;
}
