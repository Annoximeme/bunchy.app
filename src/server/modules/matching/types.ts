import type {
  AvailabilityWindow,
  InterestIntent,
  SocialGoal,
} from "@/generated/prisma/enums";

/**
 * The matching contract.
 *
 * Everything the scorer sees is defined here as a plain data shape with no
 * Prisma types and no database access. That is deliberate: it makes scoring a
 * pure function of its inputs, which means it can be unit tested exhaustively,
 * run in a batch job, or handed to a completely different implementation (an
 * embedding index, an LLM re-ranker) without touching a single caller.
 */

export interface MatchInterest {
  interestId: string;
  slug: string;
  label: string;
  category: string;
  /** 1 = casual, 2 = into it, 3 = it's my thing. */
  strength: number;
  intent: InterestIntent;
}

export interface MatchLocation {
  countryCode: string | null;
  regionLabel: string | null;
  cityLabel: string | null;
  /** Grid-snapped. Precise enough to rank by distance, too coarse to locate anyone. */
  approxLat: number | null;
  approxLng: number | null;
}

/**
 * Seven axes, each 0-100. See PersonalityProfile in schema.prisma for the poles.
 */
export interface PersonalityVector {
  introversionExtraversion: number;
  spontaneityPlanning: number;
  competitiveRelaxed: number;
  deepCasual: number;
  onlineOffline: number;
  smallLargeGroups: number;
  nightMorning: number;
}

export interface MatchProfile {
  profileId: string;
  displayName: string;
  age: number | null;
  location: MatchLocation;
  interests: MatchInterest[];
  goals: SocialGoal[];
  availability: AvailabilityWindow[];
  /** IANA zone. Null falls back to UTC, see `sharedHours`. */
  timezone: string | null;
  personality: PersonalityVector | null;

  /** Community context, bunches in common are strong evidence of fit. */
  bunchIds: string[];
  /** Activities both people attended. Having actually met beats any profile field. */
  attendedActivityIds: string[];
  /**
   * Activities this member went to and afterwards said they met someone at.
   *
   * The only record in the product of what actually happened rather than what
   * somebody said about themselves. Two people who were both at one of these
   * did not just occupy a room together: each of them, separately and after
   * the fact, said the evening worked.
   */
  provenActivityIds: string[];
  /** How engaged they are, 0-1. A dormant account is a poor introduction. */
  participationScore: number;
}

/**
 * One dimension's contribution. `reason` is written to be shown to a member,
 * every score in this product must be explainable in a sentence.
 */
export interface SignalResult {
  signal: SignalName;
  /** 0-1. */
  score: number;
  /** Relative importance; the scorer normalizes across the signals it ran. */
  weight: number;
  reason?: string;
  evidence?: string[];
}

export type SignalName =
  | "shared_interests"
  | "complementary_interests"
  | "social_goals"
  | "personality"
  | "availability"
  | "location"
  | "age"
  | "history"
  | "met_well";

export interface PersonMatch {
  profileId: string;
  /** 0-100, rounded. What we show as "93% compatible". */
  score: number;
  signals: SignalResult[];
  /** Short phrases for the card, most persuasive first. */
  highlights: string[];
  sharedInterests: string[];
  /** Interests one person practices and the other is curious about. */
  complementaryInterests: string[];
}

export interface ScoringContext {
  /**
   * 0-1 rarity of an interest across the member base; rarer interests are
   * stronger evidence of a real connection. "Warhammer" says more than "Music".
   */
  interestRarity(interestId: string): number;
  now: Date;
}

/**
 * The seam an AI implementation slots into.
 *
 * Batched by design: an embedding or LLM scorer wants all candidates at once,
 * and a deterministic one can simply map over them. Swapping implementations is
 * a change in `src/server/modules/matching/index.ts` and nowhere else.
 */
export interface CompatibilityScorer {
  /** Recorded on every recommendation so scoring changes are auditable. */
  readonly id: string;
  scorePeople(
    subject: MatchProfile,
    candidates: MatchProfile[],
    context: ScoringContext,
  ): Promise<PersonMatch[]>;
}
