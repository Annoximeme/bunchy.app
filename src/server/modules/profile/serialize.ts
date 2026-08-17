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
  /**
   * Here since the beginning (§37). A fact, not a rank — there is no ordinal
   * anywhere in the codebase, and it confers nothing beyond the badge.
   */
  foundingMember: boolean;
  /**
   * A staff title such as "Founder & Lead Developer of Bunchy". Set from the
   * CLI only — see the schema comment on `Profile.title` for why a
   * member-editable badge would be an impersonation surface.
   */
  title: string | null;
  /**
   * Whether this member works here.
   *
   * `User.role` itself is never serialized: ADMIN and MODERATOR both surface as
   * a plain `true`, so the badge says "this person is staff" without publishing
   * who can ban whom. The distinction is authorization data and stays private.
   */
  staff: boolean;
  /**
   * Chips in, or is staff and gets it complimentary.
   *
   * Separate from `staff` rather than folded into it, because the two marks
   * mean different things and a member should be able to tell them apart: one
   * says this person paid, the other says this person can suspend your account.
   * The badge that renders is the staff one when both are true.
   */
  supporter: boolean;
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

/**
 * Still paid up, including inside a period already cancelled.
 *
 * Duplicated from the supporter module rather than imported, and deliberately:
 * this file is the one sanctioned path from a database row to a public payload,
 * and it must not grow a dependency on the module that knows about money. Four
 * lines of logic is a smaller price than that edge.
 */
function isCurrentSupport(status: string | null, periodEnd: Date | null): boolean {
  if (status === "ACTIVE" || status === "PAST_DUE") return true;
  return periodEnd !== null && periodEnd > new Date();
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
  foundingMember: boolean;
  title: string | null;
  user: {
    birthYear: number | null;
    birthMonth: number | null;
    role: string;
    supporter: { status: string; currentPeriodEnd: Date | null } | null;
  };
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

/**
 * Age from a birth year and, when we have it, a birth month.
 *
 * A subtraction of years is a year too high for everyone who has not had their
 * birthday yet — half the year, half the members. With the month, the only
 * remaining error is the days before a birthday inside the birth month, because
 * the day is deliberately not stored.
 */
export function ageFrom(
  birthYear: number | null,
  birthMonth: number | null,
  now: Date,
): number | null {
  if (!birthYear) return null;

  const age = now.getUTCFullYear() - birthYear;
  if (!birthMonth) return age;

  // getUTCMonth is zero-based; birthMonth is 1–12 as a person would write it.
  const monthNow = now.getUTCMonth() + 1;
  return monthNow < birthMonth ? age - 1 : age;
}

export function toPublicProfile(
  row: SerializeInput,
  options: { connectionState: ConnectionState; now?: Date },
): PublicProfile {
  const now = options.now ?? new Date();
  const rawAge = ageFrom(row.user.birthYear, row.user.birthMonth, now);

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
    foundingMember: row.foundingMember,
    title: row.title,
    staff: row.user.role !== "MEMBER",
    // Staff get the cosmetics complimentary. They are the people the volunteers
    // and the operator, and asking them to pay for a ring while they work the
    // report queue would be a strange way to say thank you.
    supporter:
      row.user.role !== "MEMBER" ||
      isCurrentSupport(
        row.user.supporter?.status ?? null,
        row.user.supporter?.currentPeriodEnd ?? null,
      ),
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
  foundingMember: true,
  title: true,
  user: {
    select: {
      birthYear: true,
      birthMonth: true,
      role: true,
      // Enough to answer "is this current", and nothing about the money. No
      // amount, no card, no invoice — a public payload has no business
      // carrying any of it.
      supporter: { select: { status: true, currentPeriodEnd: true } },
    },
  },
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
