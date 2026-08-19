import type {
  CompatibilityScorer,
  MatchProfile,
  PersonMatch,
  ScoringContext,
  SignalName,
  SignalResult,
} from "@/server/modules/matching/types";
import {
  ageSignal,
  availabilitySignal,
  clamp,
  complementaryInterestsSignal,
  historySignal,
  metWellSignal,
  locationSignal,
  personalitySignal,
  sharedInterestsSignal,
  socialGoalsSignal,
} from "@/server/modules/matching/signals";

/**
 * The MVP scorer: deterministic, explainable, fast enough to rank a few
 * thousand candidates per request without leaving the process.
 *
 * It implements `CompatibilityScorer`, which is the entire point, when there
 * is enough interaction data to train something better, an embedding index or
 * an LLM re-ranker drops into the same slot and every caller is unchanged.
 * Because each recommendation records the scorer `id` that produced it, the two
 * can also run side by side for evaluation.
 */

/**
 * The weighting budget, from the product spec (§14):
 *
 *   interests 40% · social goals 20% · personality 15%
 *   location 10%  · availability 10% · activity preferences 5%
 *
 * Two notes on how that maps onto the signals below.
 *
 * The 40% for interests is split between `shared_interests` (26) and
 * `complementary_interests` (14) rather than spent entirely on overlap, because
 * the same spec requires complementary matching, a photographer and someone
 * who wants to learn photography must be able to match. Spending the whole
 * budget on shared tags would make that impossible.
 *
 * "Activity preferences" maps to `history`: shared bunches, co-attended
 * activities and how present someone actually is.
 *
 * These six sum to exactly 1.0. Age is deliberately *not* in the additive
 * budget, see AGE_PENALTY below.
 */
const BASE_WEIGHTS: Record<SignalName, number> = {
  shared_interests: 0.26,
  complementary_interests: 0.14,
  social_goals: 0.2,
  personality: 0.15,
  location: 0.1,
  availability: 0.1,
  history: 0.05,
  // Both applied multiplicatively instead, so the budget above stays exact.
  age: 0,
  met_well: 0,
};

/**
 * Age as a modifier rather than a weighted signal.
 *
 * The spec's six dimensions account for the whole score, so adding age as a
 * seventh additive term would quietly change every other weight. It still
 * matters though, a 25-year gap is real information, so it scales the final
 * score by at most 15%. Enough to break a tie, never enough to overrule a
 * genuinely good match, and it never becomes the headline reason on a card.
 */
const MAX_AGE_PENALTY = 0.15;

function agePenalty(signals: SignalResult[]): number {
  const age = signals.find((s) => s.signal === "age");
  if (!age) return 1;
  return 1 - MAX_AGE_PENALTY * (1 - clamp(age.score));
}

/**
 * Having already met, well, as a multiplier rather than a weighted signal.
 *
 * Same reasoning as age, and the same mechanism pointed the other way. The six
 * weights come from the product spec and sum to exactly 1.0, so adding an
 * additive term would quietly reweight every other dimension. This scales the
 * finished score instead.
 *
 * It only ever lifts. A pair with no shared history produces no signal at all
 * and multiplies by 1, so nobody is punished for being new: the alternative,
 * scoring an unproven pair below a proven one by subtraction, would make the
 * product progressively harder to join the longer it ran.
 *
 * Twenty percent is chosen to be decisive without being absolute. It is enough
 * to lift somebody you actually got on with above a stranger who ticks more
 * boxes, which is the entire point, and not so much that the product stops
 * introducing you to anybody new once you have met two people.
 */
const MAX_MET_WELL_BOOST = 0.2;

function metWellBoost(signals: SignalResult[]): number {
  const met = signals.find((s) => s.signal === "met_well");
  if (!met) return 1;
  return 1 + MAX_MET_WELL_BOOST * clamp(met.score);
}

/** Goals that mean "I want to actually go somewhere with someone". */
const PLACE_BOUND_GOALS = new Set([
  "LOCAL_COMMUNITIES",
  "GOING_OUT",
  "FITNESS_PARTNERS",
  "STUDY_PARTNERS",
  "HOBBY_PARTNERS",
  "ACTIVITY_PARTNERS",
]);

/**
 * How much distance should matter *for these two people*.
 *
 * A pair of online-first gamers can be 400 km apart and still play together
 * three nights a week; two people who want a hiking partner cannot. Fixed
 * weights get one of those two cases wrong, so the weight moves with intent.
 */
function locationImportance(a: MatchProfile, b: MatchProfile): number {
  let importance = 1;

  const placeBound =
    a.goals.some((g) => PLACE_BOUND_GOALS.has(g)) &&
    b.goals.some((g) => PLACE_BOUND_GOALS.has(g));
  if (placeBound) importance *= 1.45;

  if (a.personality && b.personality) {
    // 0 = online-first, 100 = offline-first.
    const offlineLean =
      (a.personality.onlineOffline + b.personality.onlineOffline) / 200;
    importance *= 0.55 + 0.9 * offlineLean;
  }

  return clamp(importance, 0.35, 1.7);
}

/**
 * Display calibration.
 *
 * Raw weighted scores cluster in the middle of the range, which would make
 * every card read "62%" and tell a member nothing. The exponent stretches the
 * top of the distribution, where the real differences are. It is strictly
 * monotonic, so it changes what a number *looks* like and never changes who
 * ranks above whom, and there is no artificial floor, so a weak match is
 * still allowed to look weak.
 */
const DISPLAY_EXPONENT = 0.6;

function calibrate(raw: number): number {
  return Math.round(100 * clamp(raw) ** DISPLAY_EXPONENT);
}

/**
 * How much of the picture we actually have. A profile that only filled in
 * interests should not outrank a complete one on a technicality, so thin
 * evidence damps the final score slightly.
 */
function confidenceFactor(present: number, total: number): number {
  return 0.85 + 0.15 * (present / total);
}

export class DeterministicScorer implements CompatibilityScorer {
  readonly id = "deterministic@1";

  async scorePeople(
    subject: MatchProfile,
    candidates: MatchProfile[],
    context: ScoringContext,
  ): Promise<PersonMatch[]> {
    return candidates.map((candidate) => this.score(subject, candidate, context));
  }

  score(
    subject: MatchProfile,
    candidate: MatchProfile,
    context: ScoringContext,
  ): PersonMatch {
    const shared = sharedInterestsSignal(subject, candidate, context);
    const complementary = complementaryInterestsSignal(subject, candidate);

    const weightOverrides: Partial<Record<SignalName, number>> = {
      location: BASE_WEIGHTS.location * locationImportance(subject, candidate),
    };

    const collected: SignalResult[] = [];
    const push = (result: SignalResult | null) => {
      if (!result) return;
      collected.push({
        ...result,
        weight: weightOverrides[result.signal] ?? BASE_WEIGHTS[result.signal],
      });
    };

    push(shared?.result ?? null);
    push(complementary?.result ?? null);
    push(socialGoalsSignal(subject, candidate));
    push(personalitySignal(subject, candidate));
    push(availabilitySignal(subject, candidate));
    push(locationSignal(subject, candidate));
    push(ageSignal(subject, candidate));
    push(historySignal(subject, candidate));
    push(metWellSignal(subject, candidate));

    // Age and met_well both carry weight 0, so they contribute only through
    // the multipliers below and through the reasons they produce. Everything
    // else is a weighted mean.
    const totalWeight = collected.reduce((sum, s) => sum + s.weight, 0);
    const raw =
      totalWeight === 0
        ? 0
        : collected.reduce((sum, s) => sum + s.score * s.weight, 0) / totalWeight;

    // Clamped after the boost: a strong pair who have also met well can push
    // the weighted mean above 1, and `calibrate` raises what it is given to a
    // fractional power, where anything over 1 stops being a percentage.
    const damped = clamp(
      raw *
        confidenceFactor(collected.length, Object.keys(BASE_WEIGHTS).length) *
        agePenalty(collected) *
        metWellBoost(collected),
    );

    return {
      profileId: candidate.profileId,
      score: calibrate(damped),
      signals: collected,
      highlights: buildHighlights(collected),
      sharedInterests: shared?.labels ?? [],
      complementaryInterests: complementary?.labels ?? [],
    };
  }
}

/**
 * How interesting each signal is *as a sentence on a card*, independent of how
 * much it contributes to the score.
 *
 * These are not the same thing, and conflating them produced cards whose top
 * line was "About 39 km apart". Distance and age move the ranking a great deal
 * and persuade nobody; a shared obsession or a teach/learn pairing is the
 * reason a person actually clicks Connect.
 */
const HIGHLIGHT_PRIORITY: Record<SignalName, number> = {
  complementary_interests: 1.6,
  shared_interests: 1.5,
  social_goals: 1.25,
  availability: 1.1,
  personality: 1.0,
  history: 0.9,
  location: 0.6,
  age: 0.3,
  // Ranked separately below rather than through this table. Kept here so the
  // Record stays exhaustive and adding a tenth signal is still a compile error
  // rather than a silent zero.
  met_well: 0,
};

/** Below this a signal is not worth mentioning even if it has a reason. */
const HIGHLIGHT_FLOOR: Partial<Record<SignalName, number>> = {
  location: 0.8,
  age: 0.9,
  personality: 0.6,
};

const DEFAULT_HIGHLIGHT_FLOOR = 0.45;

/**
 * The two or three things worth printing on a card. Never padded with filler,
 * if only one signal is genuinely worth saying, the card says one thing.
 *
 * `met_well` is pinned to the front rather than sorted with the rest, and the
 * reason is a trap in the ordering below: the sort key is `score * weight *
 * priority`, and `met_well` deliberately carries weight 0 so it can act as a
 * multiplier without spending the spec's budget. Left in the sort it would
 * multiply to zero and rank last, so the single most compelling thing the
 * product can say about two people, that they have already met and it worked,
 * would be the one line never printed on the card.
 */
function buildHighlights(signals: SignalResult[]): string[] {
  const worthSaying = signals.filter(
    (s) =>
      s.reason && s.score >= (HIGHLIGHT_FLOOR[s.signal] ?? DEFAULT_HIGHLIGHT_FLOOR),
  );

  const met = worthSaying.filter((s) => s.signal === "met_well");
  const rest = worthSaying
    .filter((s) => s.signal !== "met_well")
    .sort(
      (a, b) =>
        b.score * b.weight * HIGHLIGHT_PRIORITY[b.signal] -
        a.score * a.weight * HIGHLIGHT_PRIORITY[a.signal],
    );

  return [...met, ...rest].slice(0, 3).map((s) => s.reason!);
}

export const deterministicScorer = new DeterministicScorer();
