import type { MatchProfile } from "@/server/modules/matching/types";

/**
 * Forming a bunch out of people who aren't in one.
 *
 * The matching engine answers "who should this person meet". This answers the
 * harder question the product is actually built on: given a pool of people who
 * have nobody, which *group of five to twelve* would work.
 *
 * That is not the same as taking the top N matches for one person. A star,
 * one popular member everybody scores well against, who have nothing in common
 * with each other, is a bad bunch and a very good list. So the objective here
 * is the **mean score across every pair in the group**, and a candidate is only
 * admitted if they hold up against everyone already in it, not just the seed.
 *
 * Greedy, with a floor. Start from the least-connected person in the pool
 * (bunches should serve the people who need one, not the people who already
 * have options), then repeatedly admit whoever raises the group's weakest link
 * the most. Stop when nobody left clears the floor.
 *
 * Nothing here creates anything. It proposes, and a human decides, see the
 * note on consent in `proposeBunches`.
 */

export interface ProposedMember {
  profileId: string;
  displayName: string;
  /** Mean compatibility with everyone else in the proposal, 0-100. */
  fit: number;
}

export interface BunchProposal {
  members: ProposedMember[];
  /** Mean across every pair, 0-100: the number that matters. */
  cohesion: number;
  /** The worst pair in the group. A good mean can hide one bad fit. */
  weakestPair: number;
  /** Interests shared by at least half the group, most common first. */
  commonInterests: string[];
  /** A suggested name, from the strongest shared interest. */
  suggestedName: string;
  /** Plain sentences explaining why these people, for a human reviewer. */
  rationale: string[];
}

/** A symmetric lookup of pair scores, 0-1. */
export interface PairScores {
  get(a: string, b: string): number | undefined;
}

export interface FormationOptions {
  targetSize?: number;
  minSize?: number;
  /** A candidate must score at least this with *every* existing member. */
  floor?: number;
  maxProposals?: number;
}

const DEFAULTS = {
  targetSize: 7,
  minSize: 5,
  floor: 0.45,
  maxProposals: 5,
} as const;

export interface FormationResult {
  proposals: BunchProposal[];
  /**
   * People no viable group could be built around. Reported rather than hidden:
   * "we cannot place these four yet" is a real answer, and a staff screen that
   * silently dropped them would look like the pool was smaller than it is.
   */
  unplaced: string[];
}

export function proposeBunches(
  pool: MatchProfile[],
  scores: PairScores,
  options: FormationOptions = {},
): FormationResult {
  const { targetSize, minSize, floor, maxProposals } = { ...DEFAULTS, ...options };

  const remaining = new Map(pool.map((p) => [p.profileId, p]));
  const proposals: BunchProposal[] = [];
  const unplaced: string[] = [];

  while (remaining.size >= minSize && proposals.length < maxProposals) {
    const available = [...remaining.values()].filter(
      (p) => !unplaced.includes(p.profileId),
    );
    if (available.length < minSize) break;

    const seed = hardestToPlace(available, scores, floor);
    const group = growGroup(seed, available, scores, { targetSize, floor });

    if (group.length < minSize) {
      // This seed cannot reach a viable size. Set them aside and try the next
      // hardest to place, one unplaceable person must not block everyone else,
      // which is what abandoning the whole pass here used to do.
      unplaced.push(seed.profileId);
      continue;
    }

    proposals.push(describe(group, scores));
    for (const member of group) remaining.delete(member.profileId);
  }

  return { proposals, unplaced };
}

/**
 * The pool member with the *fewest* strong options.
 *
 * Seeding on the best-connected person fills groups with people who already
 * have options and strands exactly the members this feature exists for.
 */
function hardestToPlace(
  pool: MatchProfile[],
  scores: PairScores,
  floor: number,
): MatchProfile {
  const strongOptions = (p: MatchProfile) =>
    pool.filter(
      (other) =>
        other.profileId !== p.profileId &&
        (scores.get(p.profileId, other.profileId) ?? 0) >= floor,
    ).length;

  return pool.reduce((best, p) =>
    strongOptions(p) < strongOptions(best) ? p : best,
  );
}

/** One group, grown greedily from a given seed. */
function growGroup(
  seed: MatchProfile,
  pool: MatchProfile[],
  scores: PairScores,
  opts: { targetSize: number; floor: number },
): MatchProfile[] {
  const group: MatchProfile[] = [seed];
  const candidates = pool.filter((p) => p.profileId !== seed.profileId);

  while (group.length < opts.targetSize && candidates.length > 0) {
    let bestIndex = -1;
    let bestWorstLink = -1;

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i]!;
      // The candidate's worst relationship with the existing group. Admitting
      // on the *minimum* rather than the mean is what stops a group forming
      // around one person everyone else merely tolerates.
      let worst = Infinity;
      for (const member of group) {
        const s = scores.get(candidate.profileId, member.profileId) ?? 0;
        if (s < worst) worst = s;
      }
      if (worst >= opts.floor && worst > bestWorstLink) {
        bestWorstLink = worst;
        bestIndex = i;
      }
    }

    if (bestIndex === -1) break;
    group.push(candidates[bestIndex]!);
    candidates.splice(bestIndex, 1);
  }

  return group;
}

function describe(group: MatchProfile[], scores: PairScores): BunchProposal {
  const pairScores: number[] = [];
  const perMember = new Map<string, number[]>();

  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      const a = group[i]!;
      const b = group[j]!;
      const s = scores.get(a.profileId, b.profileId) ?? 0;
      pairScores.push(s);
      perMember.set(a.profileId, [...(perMember.get(a.profileId) ?? []), s]);
      perMember.set(b.profileId, [...(perMember.get(b.profileId) ?? []), s]);
    }
  }

  const mean = (xs: number[]) =>
    xs.length === 0 ? 0 : xs.reduce((x, y) => x + y, 0) / xs.length;

  // Interests held by at least half the group.
  const counts = new Map<string, { label: string; n: number }>();
  for (const member of group) {
    for (const interest of member.interests) {
      const existing = counts.get(interest.slug);
      counts.set(interest.slug, {
        label: interest.label,
        n: (existing?.n ?? 0) + 1,
      });
    }
  }
  const threshold = Math.ceil(group.length / 2);
  const common = [...counts.values()]
    .filter((c) => c.n >= threshold)
    .sort((a, b) => b.n - a.n);

  const cohesion = Math.round(mean(pairScores) * 100);
  const weakestPair = Math.round(Math.min(...pairScores, 1) * 100);

  const rationale: string[] = [];
  if (common.length > 0) {
    rationale.push(
      `${common.length === 1 ? "Shares" : "Shares"} ${common
        .slice(0, 3)
        .map((c) => c.label.toLowerCase())
        .join(", ")} across most of the group`,
    );
  }
  rationale.push(
    `Average compatibility ${cohesion}%, and the least-matched pair is still ${weakestPair}%`,
  );
  // Only a city *everyone* shares may be named. A group spanning Antwerp and
  // Tokyo must not be called "Gaming in Tokyo" because one member happens to be
  // enumerated first, a wrong name is worse than a generic one.
  const cities = new Set(
    group.map((m) => m.location.cityLabel).filter((c): c is string => !!c),
  );
  const sharedCity =
    cities.size === 1 && group.every((m) => m.location.cityLabel)
      ? [...cities][0]!
      : null;
  if (sharedCity) {
    rationale.push(`Everyone is around ${sharedCity}`);
  }
  const noBunch = group.filter((m) => m.bunchIds.length === 0).length;
  if (noBunch > 0) {
    rationale.push(
      `${noBunch} of ${group.length} ${noBunch === 1 ? "is" : "are"} not in any bunch yet`,
    );
  }

  return {
    members: group.map((m) => ({
      profileId: m.profileId,
      displayName: m.displayName,
      fit: Math.round(mean(perMember.get(m.profileId) ?? []) * 100),
    })),
    cohesion,
    weakestPair,
    commonInterests: common.map((c) => c.label),
    suggestedName: common[0]
      ? sharedCity
        ? `${common[0].label} in ${sharedCity}`
        : common[0].label
      : "New bunch",
    rationale,
  };
}
