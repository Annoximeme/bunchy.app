import { db } from "@/server/db/client";
import {
  buildScoringContext,
  loadMatchProfile,
} from "@/server/modules/matching/repository";
import { scorer } from "@/server/modules/matching";
import type { MatchProfile } from "@/server/modules/matching/types";
import {
  proposeBunches,
  type BunchProposal,
  type PairScores,
} from "@/server/modules/bunches/formation";

/**
 * Turning "who has nobody" into proposals a human can act on.
 *
 * The pool is members who finished onboarding, are discoverable and are in no
 * active bunch. That last condition is the point of the feature: someone
 * already in two bunches does not need a third assembled for them.
 *
 * **Nothing here creates a bunch.** It returns proposals. Auto-creating a group
 * of real people and dropping them into a chat together is the kind of thing
 * that reads as clever in a spec and as a violation in an inbox, so a staff
 * member reviews the proposal, and every proposed member receives an *invite*
 * they can decline. Consent is the whole design, not a step to optimise away.
 */

/** Scoring is O(n²) in the pool, so the pool is bounded. */
const MAX_POOL = 60;

export interface FormationReport {
  poolSize: number;
  proposals: BunchProposal[];
  unplaced: Array<{ profileId: string; displayName: string }>;
  /** Set when the pool was truncated, so the screen can say so. */
  truncatedFrom: number | null;
}

export async function proposeBunchesForPool(): Promise<FormationReport> {
  const eligible = await db.profile.findMany({
    where: {
      onboardingStage: "COMPLETE",
      user: { status: "ACTIVE" },
      privacy: { discoverable: true },
      bunchMemberships: { none: { status: "ACTIVE" } },
    },
    orderBy: { lastActiveAt: "desc" },
    take: MAX_POOL + 1,
    select: { id: true, displayName: true },
  });

  const truncatedFrom = eligible.length > MAX_POOL ? eligible.length : null;
  const chosen = eligible.slice(0, MAX_POOL);

  if (chosen.length < 5) {
    return {
      poolSize: chosen.length,
      proposals: [],
      unplaced: [],
      truncatedFrom,
    };
  }

  const loaded = await Promise.all(chosen.map((p) => loadMatchProfile(p.id)));
  const pool = loaded.filter((p): p is MatchProfile => p !== null);

  const scores = await scoreEveryPair(pool);
  const { proposals, unplaced } = proposeBunches(pool, scores);

  const names = new Map(pool.map((p) => [p.profileId, p.displayName]));
  return {
    poolSize: pool.length,
    proposals,
    unplaced: unplaced.map((id) => ({
      profileId: id,
      displayName: names.get(id) ?? "Unknown",
    })),
    truncatedFrom,
  };
}

/** Every pair, scored once, held symmetrically. */
async function scoreEveryPair(pool: MatchProfile[]): Promise<PairScores> {
  const context = await buildScoringContext();
  const active = scorer();
  const map = new Map<string, number>();

  for (let i = 0; i < pool.length; i++) {
    const subject = pool[i]!;
    const others = pool.slice(i + 1);
    if (others.length === 0) break;
    const matches = await active.scorePeople(subject, others, context);
    for (const match of matches) {
      const value = match.score / 100;
      map.set(`${subject.profileId}|${match.profileId}`, value);
      map.set(`${match.profileId}|${subject.profileId}`, value);
    }
  }

  return { get: (a, b) => map.get(`${a}|${b}`) };
}
