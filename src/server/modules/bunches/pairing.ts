import type { MatchProfile } from "@/server/modules/matching/types";
import type { PairScores } from "@/server/modules/bunches/formation";
import { interestInSentence } from "@/lib/interests";

/**
 * Which two bunches would have a good evening together.
 *
 * ## Why this is not `proposeBunches` with different inputs
 *
 * Formation asks which people should become a group, and admits on the
 * weakest pair in it, because a permanent group is only as good as its worst
 * relationship. A shared evening is a different question with a different
 * answer: two groups of eight are not going to produce sixty-four
 * friendships, and grading them as though they should would refuse every
 * pairing that ever existed.
 *
 * What actually decides whether a mixed evening works is whether **everybody
 * has somebody**. One person standing at the edge of a room where the other
 * fifteen already know each other is the failure mode, and it is invisible to
 * a mean: a pairing where fifteen people click and one is stranded scores
 * beautifully on average.
 *
 * So each person is scored by their best match across the other group, and the
 * pairing is judged by the person whose best is worst. That is the weakest
 * link idea from formation, aimed at the thing that actually goes wrong here.
 */

export interface GroupPairing {
  /** 0-100. The person most likely to stand on their own, scored. */
  everyoneHasSomeone: number;
  /** 0-100. The average of everybody's best match across the other group. */
  typical: number;
  /** Interests held by somebody in each group, most widely shared first. */
  sharedInterests: string[];
  /** Plain sentences for whoever is deciding. */
  reasons: string[];
}

/** Below this, an evening together is not worth proposing. */
export const PAIRING_FLOOR = 45;

function bestAcross(
  person: MatchProfile,
  others: MatchProfile[],
  scores: PairScores,
): number {
  let best = 0;
  for (const other of others) {
    const score = scores.get(person.profileId, other.profileId) ?? 0;
    if (score > best) best = score;
  }
  return best;
}

function sharedInterestLabels(a: MatchProfile[], b: MatchProfile[]): string[] {
  const count = new Map<string, { label: string; slug: string; n: number }>();
  const inB = new Set(b.flatMap((p) => p.interests.map((i) => i.slug)));

  for (const person of a) {
    for (const interest of person.interests) {
      if (!inB.has(interest.slug)) continue;
      const seen = count.get(interest.slug);
      if (seen) seen.n += 1;
      else count.set(interest.slug, { label: interest.label, slug: interest.slug, n: 1 });
    }
  }

  return [...count.values()]
    .sort((x, y) => y.n - x.n)
    .slice(0, 3)
    .map((entry) => entry.label);
}

/**
 * Scores one pairing.
 *
 * Returns a floor-level result rather than throwing when either group is
 * empty: a bunch whose members have all left is not a good evening and is not
 * an error.
 */
export function pairGroups(
  host: MatchProfile[],
  guest: MatchProfile[],
  scores: PairScores,
): GroupPairing {
  if (host.length === 0 || guest.length === 0) {
    return { everyoneHasSomeone: 0, typical: 0, sharedInterests: [], reasons: [] };
  }

  const bests = [
    ...host.map((person) => bestAcross(person, guest, scores)),
    ...guest.map((person) => bestAcross(person, host, scores)),
  ];

  const everyoneHasSomeone = Math.round(100 * Math.min(...bests));
  const typical = Math.round(
    (100 * bests.reduce((sum, value) => sum + value, 0)) / bests.length,
  );

  const sharedInterests = sharedInterestLabels(host, guest);

  const reasons: string[] = [];
  if (sharedInterests.length > 0) {
    reasons.push(`Both into ${interestInSentence(sharedInterests[0]!)}`);
  }
  if (everyoneHasSomeone >= 60) {
    reasons.push("Everybody would have somebody to talk to");
  } else if (everyoneHasSomeone >= PAIRING_FLOOR) {
    reasons.push("Most of you line up, and nobody is left out entirely");
  }
  if (typical >= 70) {
    reasons.push("Strong overlap across both groups");
  }

  return { everyoneHasSomeone, typical, sharedInterests, reasons };
}
