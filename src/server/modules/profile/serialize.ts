import type { PersonalityVector } from "@/server/modules/matching/types";

/**
 * The single sanctioned path from a profile row to something another member can
 * see.
 *
 * Every surface — Discover, bunches, messages, the profile page — renders
 * `PublicProfile`. Nothing accepts a raw Prisma row. That is what makes the PII
 * split in the schema actually hold: there is no field on this type that could
 * carry an email address or a precise coordinate, so no route can leak one by
 * forgetting to pick columns carefully.
 */

export interface PublicInterest {
  slug: string;
  label: string;
  category: string;
  strength: number;
  /** "Practices" vs "curious about" — shown so people know who can teach what. */
  intent: "PRACTICES" | "CURIOUS";
}

export type ConnectionState =
  | "self"
  | "none"
  | "pending_outgoing"
  | "pending_incoming"
  | "connected";

export interface PublicProfile {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  /** Null when the member chose to show an age band, or never gave a year. */
  age: number | null;
  ageBand: string | null;
  /** Already coarse: "Antwerp region". Never an address, never coordinates. */
  locationLabel: string | null;
  interests: PublicInterest[];
  goals: string[];
  availability: string[];
  /** Plain-language traits rather than raw axis numbers. */
  traits: string[];
  bunchCount: number;
  connectionState: ConnectionState;
  joinedAt: string;
}

export const GOAL_LABELS: Record<string, string> = {
  NEW_FRIENDS: "New friends",
  GAMING_FRIENDS: "Gaming friends",
  HOBBY_PARTNERS: "Hobby partners",
  GOING_OUT: "People to go out with",
  STUDY_PARTNERS: "Study partners",
  FITNESS_PARTNERS: "Fitness partners",
  CREATIVE_COLLABORATORS: "Creative collaborators",
  BUSINESS_PARTNERS: "Project partners",
  MENTORS: "Mentors",
  SIMILAR_INTERESTS: "People with similar interests",
  LOCAL_COMMUNITIES: "Local communities",
  TRAVEL_COMPANIONS: "Travel companions",
  ACTIVITY_PARTNERS: "Activity partners",
};

export const AVAILABILITY_LABELS: Record<string, string> = {
  WEEKDAY_MORNING: "Weekday mornings",
  WEEKDAY_AFTERNOON: "Weekday afternoons",
  WEEKDAY_EVENING: "Weekday evenings",
  WEEKEND_MORNING: "Weekend mornings",
  WEEKEND_AFTERNOON: "Weekend afternoons",
  WEEKEND_EVENING: "Weekend evenings",
  LATE_NIGHT: "Late nights",
};

/**
 * Turns the seven personality axes into short phrases.
 *
 * Only clearly-expressed leanings are described; anything near the middle is
 * left unsaid rather than forced into a label. Nobody should feel their profile
 * is asserting something about them that they did not.
 */
export function describeTraits(p: PersonalityVector | null): string[] {
  if (!p) return [];

  const describe = (
    value: number,
    low: string,
    high: string,
  ): string | null => {
    if (value <= 30) return low;
    if (value >= 70) return high;
    return null;
  };

  return [
    describe(p.introversionExtraversion, "Introverted", "Outgoing"),
    describe(p.smallLargeGroups, "Prefers small groups", "Enjoys big groups"),
    describe(p.deepCasual, "Likes deep conversations", "Keeps it light"),
    describe(p.onlineOffline, "Mostly online", "Prefers meeting up"),
    describe(p.spontaneityPlanning, "Spontaneous", "Likes a plan"),
    describe(p.competitiveRelaxed, "Competitive", "Relaxed"),
    describe(p.nightMorning, "Night owl", "Early riser"),
  ].filter((t): t is string => t !== null);
}

/** Ten-year band, used when someone hides their exact age. */
export function ageBandFor(age: number | null): string | null {
  if (age === null) return null;
  const floor = Math.floor(age / 10) * 10;
  return `${floor}–${floor + 9}`;
}

export interface SerializeInput {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  cityLabel: string | null;
  regionLabel: string | null;
  countryCode: string | null;
  createdAt: Date;
  user: { birthYear: number | null };
  privacy: { showApproxLocation: boolean; showExactAge: boolean } | null;
  interests: Array<{
    strength: number;
    intent: "PRACTICES" | "CURIOUS";
    interest: { slug: string; label: string; category: string };
  }>;
  goals: Array<{ goal: string }>;
  availability: Array<{ window: string }>;
  personality: PersonalityVector | null;
  _count?: { bunchMemberships?: number };
}

export function toPublicProfile(
  row: SerializeInput,
  options: { connectionState: ConnectionState; now?: Date },
): PublicProfile {
  const now = options.now ?? new Date();
  const rawAge = row.user.birthYear
    ? now.getUTCFullYear() - row.user.birthYear
    : null;

  const showExactAge = row.privacy?.showExactAge ?? true;
  const showLocation = row.privacy?.showApproxLocation ?? true;

  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    bio: row.bio,
    avatarUrl: row.avatarUrl,
    age: showExactAge ? rawAge : null,
    ageBand: showExactAge ? null : ageBandFor(rawAge),
    locationLabel: showLocation
      ? (row.cityLabel ?? row.regionLabel)
      : // Falling back to the country keeps "somewhere in Belgium" available
        // without narrowing anyone down to a town they did not share.
        (row.countryCode ?? null),
    interests: row.interests.map((i) => ({
      slug: i.interest.slug,
      label: i.interest.label,
      category: i.interest.category,
      strength: i.strength,
      intent: i.intent,
    })),
    goals: row.goals.map((g) => GOAL_LABELS[g.goal] ?? g.goal),
    availability: row.availability.map(
      (a) => AVAILABILITY_LABELS[a.window] ?? a.window,
    ),
    traits: describeTraits(row.personality),
    bunchCount: row._count?.bunchMemberships ?? 0,
    connectionState: options.connectionState,
    joinedAt: row.createdAt.toISOString(),
  };
}

/** The column selection that produces a `SerializeInput`. */
export const PUBLIC_PROFILE_SELECT = {
  id: true,
  username: true,
  displayName: true,
  bio: true,
  avatarUrl: true,
  cityLabel: true,
  regionLabel: true,
  countryCode: true,
  createdAt: true,
  user: { select: { birthYear: true } },
  privacy: { select: { showApproxLocation: true, showExactAge: true } },
  interests: {
    select: {
      strength: true,
      intent: true,
      interest: { select: { slug: true, label: true, category: true } },
    },
  },
  goals: { select: { goal: true } },
  availability: { select: { window: true } },
  personality: {
    select: {
      introversionExtraversion: true,
      spontaneityPlanning: true,
      competitiveRelaxed: true,
      deepCasual: true,
      onlineOffline: true,
      smallLargeGroups: true,
      nightMorning: true,
    },
  },
  _count: { select: { bunchMemberships: { where: { status: "ACTIVE" } } } },
} as const;
