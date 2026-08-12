import { db } from "@/server/db/client";
import {
  bunchChemistry,
  type BunchChemistry,
} from "@/server/modules/bunches/chemistry";

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
    // No pairwise compatibility. Every observation a member sees is
    // behavioural — who is talking, what is planned, how many people are in
    // it — and none of them read that signal, so computing it meant loading
    // twelve match profiles and running sixty-six scorings to produce a number
    // the page discarded: 78ms of overhead on a page whose own content took
    // 4ms. `bunchChemistry` renormalizes over the signals that ran, so this is
    // a valid behavioural reading rather than a depressed score.
    //
    // When something genuinely needs the number — a staff health view, a
    // ranking — scoring the pairs is the same loop `formation-pool.ts` already
    // runs, and belongs with that caller rather than sitting here unused.
    pairs: [],
    messages,
    activities: activities.map((a) => ({
      startsAt: a.startsAt,
      cancelled: a.status === "CANCELLED",
      participantIds: a.participants.map((p) => p.profileId),
    })),
    now,
  });
}

