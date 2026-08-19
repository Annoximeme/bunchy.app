import type {
  MatchInterest,
  MatchProfile,
  PersonalityVector,
  ScoringContext,
  SignalResult,
} from "@/server/modules/matching/types";
import { interestAffinity } from "@/server/modules/matching/interest-graph";
import { overlappingWindows, sharedHours } from "@/server/modules/geo/timezone";
import { distanceKm } from "@/server/modules/geo/distance";

/**
 * Individual compatibility signals.
 *
 * Every function here is pure and returns `null` when it has nothing to say,
 * a member who skipped the availability step should not be scored as
 * *incompatible* on availability, they should simply be scored on the signals
 * we do have. The scorer renormalizes weights over whatever came back, so
 * missing data lowers confidence instead of silently lowering the score.
 */

export function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function listPhrase(items: string[], max = 3): string {
  const shown = items.slice(0, max);
  if (shown.length === 0) return "";
  if (shown.length === 1) return shown[0]!;
  const rest = shown.slice(0, -1).join(", ");
  return `${rest} and ${shown.at(-1)}`;
}

/** Strength (1-3) scaled by how rare the interest is across the member base. */
function interestWeight(
  interest: MatchInterest,
  context: ScoringContext,
): number {
  const rarity = clamp(context.interestRarity(interest.interestId));
  return interest.strength * (0.55 + 0.45 * rarity);
}

// --- Shared interests -------------------------------------------------------

export interface SharedInterestOutcome {
  result: SignalResult;
  labels: string[];
}

/**
 * Weighted overlap, blending two views so neither extreme dominates:
 * a Jaccard term (how much of the *combined* interest space is shared) and a
 * coverage term (how much of the *smaller* set is shared). Coverage matters
 * because someone with six carefully chosen interests, all of which you share,
 * is a real match even if you listed thirty.
 */
export function sharedInterestsSignal(
  subject: MatchProfile,
  candidate: MatchProfile,
  context: ScoringContext,
): SharedInterestOutcome | null {
  if (subject.interests.length === 0 || candidate.interests.length === 0) {
    return null;
  }

  const subjectWeights = new Map<string, number>();
  for (const i of subject.interests) {
    subjectWeights.set(i.interestId, interestWeight(i, context));
  }

  let intersection = 0;
  let union = 0;
  let totalCandidate = 0;
  const shared: Array<{ label: string; weight: number }> = [];

  const seen = new Set<string>();
  for (const i of candidate.interests) {
    const wB = interestWeight(i, context);
    totalCandidate += wB;
    const wA = subjectWeights.get(i.interestId) ?? 0;
    seen.add(i.interestId);
    intersection += Math.min(wA, wB);
    union += Math.max(wA, wB);
    if (wA > 0) shared.push({ label: i.label, weight: Math.min(wA, wB) });
  }

  let totalSubject = 0;
  for (const [id, wA] of subjectWeights) {
    totalSubject += wA;
    if (!seen.has(id)) union += wA;
  }

  if (union === 0) return null;

  const jaccard = intersection / union;
  const coverage = intersection / Math.max(1e-9, Math.min(totalSubject, totalCandidate));
  const score = clamp(0.45 * jaccard + 0.55 * coverage);

  const labels = shared
    .sort((a, b) => b.weight - a.weight)
    .map((s) => s.label);

  return {
    labels,
    result: {
      signal: "shared_interests",
      score,
      weight: 1,
      evidence: labels.slice(0, 6),
      reason:
        labels.length > 0
          ? `You both like ${listPhrase(labels)}`
          : "No interests in common yet",
    },
  };
}

// --- Complementary interests ------------------------------------------------

export interface ComplementaryOutcome {
  result: SignalResult;
  labels: string[];
}

/** How much a pair of interests reinforces each other, including teach/learn. */
const TEACH_MULTIPLIER = 1.6;
const LEARN_MULTIPLIER = 1.4;
/** Identical interests are already rewarded by the shared signal. */
const DUPLICATE_MULTIPLIER = 0.45;
const MIN_AFFINITY = 0.4;
const TOP_PAIRS = 5;
/** Roughly the total pair value that counts as a perfect complementary fit. */
const COMPLEMENTARY_SATURATION = 3.2;

/**
 * The signal that makes Bunchy more than a tag-intersection engine.
 *
 * An experienced photographer and someone who hikes and wants to learn
 * photography share *no* interest intent, and a naive scorer would rank them
 * near zero. Here the photography/hiking bridge plus the practices/curious
 * asymmetry makes them a strong match, which is the correct answer, because
 * they have an obvious reason to spend a Saturday together.
 */
export function complementaryInterestsSignal(
  subject: MatchProfile,
  candidate: MatchProfile,
): ComplementaryOutcome | null {
  if (subject.interests.length === 0 || candidate.interests.length === 0) {
    return null;
  }

  type Kind = "teach" | "learn" | "duplicate" | "adjacent";
  interface Pair {
    value: number;
    kind: Kind;
    /** The interest worth naming to the viewer. */
    label: string;
    otherLabel: string;
  }

  const pairs: Pair[] = [];

  for (const a of subject.interests) {
    for (const b of candidate.interests) {
      const affinity = interestAffinity(a, b);
      if (affinity < MIN_AFFINITY) continue;

      let kind: Kind = "adjacent";
      let multiplier = 1;
      if (a.intent === "CURIOUS" && b.intent === "PRACTICES") {
        kind = "teach";
        multiplier = TEACH_MULTIPLIER;
      } else if (a.intent === "PRACTICES" && b.intent === "CURIOUS") {
        kind = "learn";
        multiplier = LEARN_MULTIPLIER;
      } else if (a.slug === b.slug) {
        kind = "duplicate";
        multiplier = DUPLICATE_MULTIPLIER;
      }

      const strength = (a.strength * b.strength) / 9;
      const value = affinity * multiplier * (0.4 + 0.6 * strength);

      pairs.push({
        value,
        kind,
        // For teach/learn, the interesting interest is the one being passed on.
        label: kind === "teach" ? b.label : a.label,
        otherLabel: kind === "teach" ? a.label : b.label,
      });
    }
  }

  if (pairs.length === 0) return null;

  const ranked = pairs.sort((x, y) => y.value - x.value);
  const top = ranked.slice(0, TOP_PAIRS);
  const total = top.reduce((sum, p) => sum + p.value, 0);
  const score = clamp(total / COMPLEMENTARY_SATURATION);

  // One interest can pair with several of the other person's, which would
  // otherwise print the same word three times.
  const labels = [...new Set(top.map((p) => p.label))];

  return {
    labels,
    result: {
      signal: "complementary_interests",
      score,
      weight: 1,
      evidence: labels.slice(0, 4),
      reason: describePair(ranked[0]!),
    },
  };
}

/** One clear sentence about the strongest pairing, rather than a list of pairs. */
function describePair(pair: {
  kind: "teach" | "learn" | "duplicate" | "adjacent";
  label: string;
  otherLabel: string;
}): string {
  switch (pair.kind) {
    case "teach":
      return `They could get you into ${pair.label.toLowerCase()}`;
    case "learn":
      return `You could get them into ${pair.label.toLowerCase()}`;
    case "duplicate":
      return `You're both into ${pair.label.toLowerCase()}`;
    default:
      return `${pair.label} and ${pair.otherLabel.toLowerCase()} go well together`;
  }
}

// --- Social goals -----------------------------------------------------------

/**
 * Goals that pair well without being identical. "I want a mentor" and "I'm
 * building a business" is a better introduction than two people who both ticked
 * the same box.
 */
const COMPLEMENTARY_GOALS: Array<[string, string]> = [
  ["MENTORS", "BUSINESS_PARTNERS"],
  ["MENTORS", "CREATIVE_COLLABORATORS"],
  ["MENTORS", "STUDY_PARTNERS"],
  ["GAMING_FRIENDS", "NEW_FRIENDS"],
  ["HOBBY_PARTNERS", "SIMILAR_INTERESTS"],
  ["LOCAL_COMMUNITIES", "GOING_OUT"],
  ["LOCAL_COMMUNITIES", "NEW_FRIENDS"],
  ["FITNESS_PARTNERS", "HOBBY_PARTNERS"],
  ["CREATIVE_COLLABORATORS", "BUSINESS_PARTNERS"],
  ["STUDY_PARTNERS", "SIMILAR_INTERESTS"],
  ["TRAVEL_COMPANIONS", "ACTIVITY_PARTNERS"],
  ["TRAVEL_COMPANIONS", "NEW_FRIENDS"],
  ["ACTIVITY_PARTNERS", "HOBBY_PARTNERS"],
  ["ACTIVITY_PARTNERS", "GOING_OUT"],
];

const GOAL_LABELS: Record<string, string> = {
  NEW_FRIENDS: "new friends",
  GAMING_FRIENDS: "gaming friends",
  HOBBY_PARTNERS: "hobby partners",
  GOING_OUT: "people to go out with",
  STUDY_PARTNERS: "study partners",
  FITNESS_PARTNERS: "fitness partners",
  CREATIVE_COLLABORATORS: "creative collaborators",
  BUSINESS_PARTNERS: "project partners",
  MENTORS: "mentors",
  SIMILAR_INTERESTS: "people with similar interests",
  LOCAL_COMMUNITIES: "local communities",
  TRAVEL_COMPANIONS: "travel companions",
  ACTIVITY_PARTNERS: "activity partners",
};

export function socialGoalsSignal(
  subject: MatchProfile,
  candidate: MatchProfile,
): SignalResult | null {
  if (subject.goals.length === 0 || candidate.goals.length === 0) return null;

  const candidateGoals = new Set<string>(candidate.goals);
  const overlap = subject.goals.filter((g) => candidateGoals.has(g));
  const base =
    overlap.length / Math.min(subject.goals.length, candidate.goals.length);

  let complementary = 0;
  for (const [x, y] of COMPLEMENTARY_GOALS) {
    const forward =
      subject.goals.includes(x as never) && candidateGoals.has(y);
    const backward =
      subject.goals.includes(y as never) && candidateGoals.has(x);
    if (forward || backward) complementary += 1;
  }

  const score = clamp(base + Math.min(0.3, complementary * 0.12));
  const labels = overlap.map((g) => GOAL_LABELS[g] ?? g.toLowerCase());

  return {
    signal: "social_goals",
    score,
    weight: 1,
    evidence: labels,
    reason:
      labels.length > 0
        ? `You're both looking for ${listPhrase(labels, 2)}`
        : "Different goals, but they fit together",
  };
}

// --- Personality ------------------------------------------------------------

type AxisMode = "similar" | "tolerant";

interface Axis {
  key: keyof PersonalityVector;
  weight: number;
  mode: AxisMode;
  /** Rendered when the two people line up strongly on this axis. */
  agreement: (value: number) => string;
}

const AXES: Axis[] = [
  {
    key: "onlineOffline",
    weight: 1.25,
    mode: "similar",
    // Whether you'll ever actually meet is the single most predictive axis.
    agreement: (v) =>
      v < 40 ? "you both prefer hanging out online" : "you both like meeting in person",
  },
  {
    key: "deepCasual",
    weight: 1.15,
    mode: "similar",
    agreement: (v) =>
      v < 40 ? "you both go for real conversations" : "you both keep it light",
  },
  {
    key: "competitiveRelaxed",
    weight: 1.0,
    mode: "similar",
    agreement: (v) =>
      v < 40 ? "you're both competitive" : "you both take things at a relaxed pace",
  },
  {
    key: "smallLargeGroups",
    weight: 0.95,
    mode: "similar",
    agreement: (v) =>
      v < 40 ? "you both prefer small groups" : "you both enjoy bigger groups",
  },
  {
    key: "spontaneityPlanning",
    weight: 0.9,
    mode: "similar",
    agreement: (v) =>
      v < 40 ? "you're both spontaneous" : "you both like a plan",
  },
  {
    key: "nightMorning",
    weight: 0.8,
    mode: "similar",
    agreement: (v) =>
      v < 40 ? "you're both night owls" : "you're both early risers",
  },
  {
    // Introvert/extrovert gaps are frequently *good*. Only extremes cost.
    key: "introversionExtraversion",
    weight: 0.85,
    mode: "tolerant",
    agreement: (v) =>
      v < 40 ? "you're both fairly introverted" : "you're both outgoing",
  },
];

const TOLERANT_FREE_GAP = 40;

export function personalitySignal(
  subject: MatchProfile,
  candidate: MatchProfile,
): SignalResult | null {
  const a = subject.personality;
  const b = candidate.personality;
  if (!a || !b) return null;

  let weighted = 0;
  let totalWeight = 0;
  const agreements: Array<{ text: string; closeness: number }> = [];

  for (const axis of AXES) {
    const delta = Math.abs(a[axis.key] - b[axis.key]);
    const score =
      axis.mode === "similar"
        ? 1 - delta / 100
        : 1 - Math.max(0, delta - TOLERANT_FREE_GAP) / (100 - TOLERANT_FREE_GAP);

    weighted += clamp(score) * axis.weight;
    totalWeight += axis.weight;

    if (delta <= 20) {
      const midpoint = (a[axis.key] + b[axis.key]) / 2;
      // Only mention an axis when both sit clearly on one side of the middle.
      if (midpoint < 40 || midpoint > 60) {
        agreements.push({
          text: axis.agreement(midpoint),
          closeness: 1 - delta / 100,
        });
      }
    }
  }

  const best = agreements.sort((x, y) => y.closeness - x.closeness).slice(0, 2);

  return {
    signal: "personality",
    score: clamp(weighted / totalWeight),
    weight: 1,
    evidence: best.map((x) => x.text),
    reason:
      best.length > 0
        ? `Similar styles, ${listPhrase(best.map((x) => x.text), 2)}`
        : "Different styles that can balance out",
  };
}

// --- Availability -----------------------------------------------------------

const AVAILABILITY_LABELS: Record<string, string> = {
  WEEKDAY_MORNING: "weekday mornings",
  WEEKDAY_AFTERNOON: "weekday afternoons",
  WEEKDAY_EVENING: "weekday evenings",
  WEEKEND_MORNING: "weekend mornings",
  WEEKEND_AFTERNOON: "weekend afternoons",
  WEEKEND_EVENING: "weekend evenings",
  LATE_NIGHT: "late nights",
};

/**
 * Overlapping free time. Two people who are never free at the same moment will
 * never meet, no matter how well their interests line up.
 */
/**
 * How much free time two people genuinely share.
 *
 * Availability is stored as local labels, so this compares *hours*, not
 * labels: two people both picking "weekday evening" in Antwerp and Tokyo have
 * nothing in common, and comparing the labels used to score that as a perfect
 * overlap. `sharedHours` converts each window into the member's zone and
 * intersects in UTC.
 *
 * Same zone or unknown zones fall back to exactly the old behaviour, so the
 * common case is unchanged, this only ever removes false overlap.
 */
const FULL_OVERLAP_HOURS = 25;

export function availabilitySignal(
  subject: MatchProfile,
  candidate: MatchProfile,
  now = new Date(),
): SignalResult | null {
  if (subject.availability.length === 0 || candidate.availability.length === 0) {
    return null;
  }

  const hours = sharedHours(
    { windows: subject.availability, timezone: subject.timezone },
    { windows: candidate.availability, timezone: candidate.timezone },
    now,
  );

  // One window shared in the same zone (five evenings a week) is a full score;
  // more than that is not "better than free".
  const score = clamp(hours / FULL_OVERLAP_HOURS);

  // The reason is built from the windows that genuinely overlap, not the
  // labels both people happened to tick. Across zones those are different
  // sets: two people who both chose "weekday evening" in Antwerp and Tokyo
  // share a label and no hours, while an Antwerp evening and a Tokyo late
  // night share hours and no label.
  const pairs = overlappingWindows(
    { windows: subject.availability, timezone: subject.timezone },
    { windows: candidate.availability, timezone: candidate.timezone },
    now,
  );

  const label = (w: string) => AVAILABILITY_LABELS[w] ?? w.toLowerCase();
  const sameName = pairs.filter((p) => p.subject === p.candidate);
  const evidence = (sameName.length > 0 ? sameName : pairs).map((p) =>
    label(p.subject),
  );

  let reason: string;
  if (sameName.length > 0) {
    reason = `You're both free ${listPhrase(sameName.map((p) => label(p.subject)), 2)}`;
  } else if (pairs[0]) {
    reason = `Your ${label(pairs[0].subject)} line up with their ${label(pairs[0].candidate)}`;
  } else {
    const differentZones =
      subject.timezone !== null &&
      candidate.timezone !== null &&
      subject.timezone !== candidate.timezone;
    reason = differentZones
      ? "Your hours barely overlap across time zones"
      : "Your free time doesn't overlap much";
  }

  return { signal: "availability", score, weight: 1, evidence, reason };
}

// --- Location ---------------------------------------------------------------

const NEAR_KM = 10;
const FAR_KM = 150;

export function locationSignal(
  subject: MatchProfile,
  candidate: MatchProfile,
): SignalResult | null {
  const a = subject.location;
  const b = candidate.location;

  if (
    a.approxLat !== null &&
    a.approxLng !== null &&
    b.approxLat !== null &&
    b.approxLng !== null
  ) {
    const km = distanceKm(
      { lat: a.approxLat, lng: a.approxLng },
      { lat: b.approxLat, lng: b.approxLng },
    );
    const score = clamp(1 - Math.max(0, km - NEAR_KM) / (FAR_KM - NEAR_KM));
    return {
      signal: "location",
      score,
      weight: 1,
      // Only nearby gets a reason. "About 39 km apart" is a fact, not a reason
      // to meet someone, and presenting it as one makes every card sound the
      // same. Distance still contributes to the score either way.
      reason:
        km <= NEAR_KM
          ? `Both around ${b.cityLabel ?? "the same area"}`
          : undefined,
    };
  }

  // Label fallback for members who never shared coordinates.
  if (a.cityLabel && b.cityLabel && a.cityLabel === b.cityLabel) {
    return {
      signal: "location",
      score: 0.9,
      weight: 1,
      reason: `Both in ${b.cityLabel}`,
    };
  }
  if (a.regionLabel && b.regionLabel && a.regionLabel === b.regionLabel) {
    return { signal: "location", score: 0.7, weight: 1, reason: `Both in ${b.regionLabel}` };
  }
  if (a.countryCode && b.countryCode && a.countryCode === b.countryCode) {
    return { signal: "location", score: 0.35, weight: 1, reason: "Same country" };
  }

  return null;
}

// --- Age --------------------------------------------------------------------

const AGE_FREE_GAP = 4;
const AGE_ZERO_GAP = 25;

export function ageSignal(
  subject: MatchProfile,
  candidate: MatchProfile,
): SignalResult | null {
  if (subject.age === null || candidate.age === null) return null;

  const delta = Math.abs(subject.age - candidate.age);
  const score = clamp(
    1 - Math.max(0, delta - AGE_FREE_GAP) / (AGE_ZERO_GAP - AGE_FREE_GAP),
  );

  return {
    signal: "age",
    score,
    weight: 1,
    // An age gap is never the reason to introduce two people, so it never
    // becomes a highlight.
    reason: delta <= AGE_FREE_GAP ? "Similar age" : undefined,
  };
}

// --- History & community ----------------------------------------------------

/**
 * What has already happened between these two, and how present the candidate
 * actually is. Recommending someone who signed up and vanished wastes the one
 * introduction a member might act on today.
 */
export function historySignal(
  subject: MatchProfile,
  candidate: MatchProfile,
): SignalResult {
  const subjectBunches = new Set(subject.bunchIds);
  const sharedBunches = candidate.bunchIds.filter((id) =>
    subjectBunches.has(id),
  ).length;

  const subjectActivities = new Set(subject.attendedActivityIds);
  const sharedActivities = candidate.attendedActivityIds.filter((id) =>
    subjectActivities.has(id),
  ).length;

  const community = clamp(sharedBunches * 0.5 + sharedActivities * 0.6);
  const score = clamp(0.6 * community + 0.4 * clamp(candidate.participationScore));

  const reason =
    sharedActivities > 0
      ? "You've been to the same activity before"
      : sharedBunches > 0
        ? `Already in ${sharedBunches === 1 ? "a bunch" : `${sharedBunches} bunches`} together`
        : candidate.participationScore > 0.6
          ? "Active in the community"
          : "New around here";

  return { signal: "history", score, weight: 1, reason };
}
