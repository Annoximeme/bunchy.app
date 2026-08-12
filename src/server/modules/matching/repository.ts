import { db } from "@/server/db/client";
import type { Prisma } from "@/generated/prisma/client";
import type {
  AvailabilityWindow,
  SocialGoal,
} from "@/generated/prisma/enums";
import { distanceKm } from "@/server/modules/geo/distance";
import type { MatchProfile, ScoringContext } from "@/server/modules/matching/types";

/**
 * Turns database rows into the plain shapes the scorer understands.
 *
 * This is the only file in the matching module that knows Prisma exists. The
 * signals and the scorer stay pure, which is what lets them be tested without a
 * database and reused from a batch job.
 */

const PROFILE_SELECT = {
  id: true,
  displayName: true,
  countryCode: true,
  regionLabel: true,
  cityLabel: true,
  approxLat: true,
  approxLng: true,
  timezone: true,
  lastActiveAt: true,
  user: { select: { birthYear: true } },
  interests: {
    select: {
      strength: true,
      intent: true,
      interest: {
        select: { id: true, slug: true, label: true, category: true },
      },
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
  bunchMemberships: {
    where: { status: "ACTIVE" as const },
    select: { bunchId: true },
  },
  activityEntries: {
    where: { status: "JOINED" as const },
    select: { activityId: true },
  },
} as const;

type ProfileRow = {
  id: string;
  displayName: string;
  countryCode: string | null;
  regionLabel: string | null;
  cityLabel: string | null;
  approxLat: number | null;
  approxLng: number | null;
  timezone: string | null;
  lastActiveAt: Date;
  user: { birthYear: number | null };
  interests: Array<{
    strength: number;
    intent: "PRACTICES" | "CURIOUS";
    interest: { id: string; slug: string; label: string; category: string };
  }>;
  goals: Array<{ goal: MatchProfile["goals"][number] }>;
  availability: Array<{ window: MatchProfile["availability"][number] }>;
  personality: MatchProfile["personality"];
  bunchMemberships: Array<{ bunchId: string }>;
  activityEntries: Array<{ activityId: string }>;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * How present someone is. Recommending a member who signed up and vanished
 * spends the one introduction someone might act on today.
 */
function participationScore(row: ProfileRow, now: Date): number {
  const ageDays = (now.getTime() - row.lastActiveAt.getTime()) / DAY_MS;
  const recency =
    ageDays <= 7 ? 1 : ageDays <= 30 ? 0.6 : ageDays <= 90 ? 0.3 : 0.1;

  const engagement = Math.min(
    1,
    row.bunchMemberships.length * 0.25 + row.activityEntries.length * 0.3,
  );

  return 0.5 * recency + 0.5 * engagement;
}

function toMatchProfile(row: ProfileRow, now: Date): MatchProfile {
  return {
    profileId: row.id,
    displayName: row.displayName,
    age: row.user.birthYear ? now.getUTCFullYear() - row.user.birthYear : null,
    location: {
      countryCode: row.countryCode,
      regionLabel: row.regionLabel,
      cityLabel: row.cityLabel,
      approxLat: row.approxLat,
      approxLng: row.approxLng,
    },
    interests: row.interests.map((i) => ({
      interestId: i.interest.id,
      slug: i.interest.slug,
      label: i.interest.label,
      category: i.interest.category,
      strength: i.strength,
      intent: i.intent,
    })),
    goals: row.goals.map((g) => g.goal),
    availability: row.availability.map((a) => a.window),
    timezone: row.timezone,
    personality: row.personality,
    bunchIds: row.bunchMemberships.map((m) => m.bunchId),
    attendedActivityIds: row.activityEntries.map((a) => a.activityId),
    participationScore: participationScore(row, now),
  };
}

export async function loadMatchProfile(
  profileId: string,
  now = new Date(),
): Promise<MatchProfile | null> {
  const row = await db.profile.findUnique({
    where: { id: profileId },
    select: PROFILE_SELECT,
  });
  return row ? toMatchProfile(row as ProfileRow, now) : null;
}

/** How many candidates we score per request. Well above what we display. */
const CANDIDATE_POOL = 400;

/**
 * Narrowing criteria for a *searched* pool rather than a recommended one.
 *
 * Discover asks "who should this person meet"; Find Someone and Instant Bunch
 * ask "who matches this description". The difference is that a search's terms
 * are requirements, not hints — so everything here becomes an AND in the query,
 * and the loose "shares any interest OR same country OR shares a bunch"
 * affinity net is dropped when criteria are supplied.
 *
 * All of it is pushed into SQL apart from the final distance check, which needs
 * a real haversine. That one gets a bounding box in the query and an exact pass
 * in memory, so the database still does the elimination (§21).
 */
export interface CandidateFilter {
  /** Must hold at least one of these interests. */
  interestIds?: string[];
  /** Must be free in at least one of these windows. */
  windows?: AvailabilityWindow[];
  /** Must be looking for at least one of these. */
  goals?: SocialGoal[];
  /** Must have a live Who's Up status. Visibility is enforced by the caller. */
  availableNow?: boolean;
  /** Kilometres from `origin`, which defaults to the subject's own point. */
  withinKm?: number;
  origin?: { lat: number; lng: number } | null;
  limit?: number;
}

/**
 * Candidate pre-selection.
 *
 * Scoring is cheap but not free, so we narrow before we rank: people who share
 * at least one interest, are in the same country, or already share a bunch.
 * Everything excluded here is excluded on *policy* rather than score — blocks,
 * privacy choices, existing connections and explicit "not interested" feedback
 * are not low-ranking matches, they are matches that must never appear.
 */
export async function loadCandidates(
  subject: MatchProfile,
  now = new Date(),
  filter: CandidateFilter = {},
): Promise<MatchProfile[]> {
  const where: Prisma.ProfileWhereInput = {
    id: { not: subject.profileId },
    onboardingStage: "COMPLETE",
    user: { status: "ACTIVE" },
    privacy: { discoverable: true },
    // Blocks in either direction remove the profile entirely.
    blocksMade: { none: { blockedId: subject.profileId } },
    blocksReceived: { none: { blockerId: subject.profileId } },
    // Already connected, or a request is pending either way.
    sentConnections: {
      none: {
        addresseeId: subject.profileId,
        status: { in: ["PENDING", "ACCEPTED"] },
      },
    },
    receivedConnections: {
      none: {
        requesterId: subject.profileId,
        status: { in: ["PENDING", "ACCEPTED"] },
      },
    },
    // "Not interested" is a permanent instruction, not a ranking hint.
    matchFeedbackReceived: {
      none: { profileId: subject.profileId, signal: "NOT_INTERESTED" },
    },
  };

  applyCriteria(where, subject, filter, now);

  const rows = await db.profile.findMany({
    where,
    select: PROFILE_SELECT,
    orderBy: { lastActiveAt: "desc" },
    take: Math.min(filter.limit ?? CANDIDATE_POOL, CANDIDATE_POOL),
  });

  const profiles = (rows as ProfileRow[]).map((row) => toMatchProfile(row, now));
  return filter.withinKm ? withinRadius(profiles, subject, filter) : profiles;
}

/** Mutates `where` with either the search criteria or the affinity net. */
function applyCriteria(
  where: Prisma.ProfileWhereInput,
  subject: MatchProfile,
  filter: CandidateFilter,
  now: Date,
): void {
  const criteria: Prisma.ProfileWhereInput[] = [];

  if (filter.interestIds?.length) {
    criteria.push({ interests: { some: { interestId: { in: filter.interestIds } } } });
  }
  if (filter.windows?.length) {
    criteria.push({ availability: { some: { window: { in: filter.windows } } } });
  }
  if (filter.goals?.length) {
    criteria.push({ goals: { some: { goal: { in: filter.goals } } } });
  }
  if (filter.availableNow) {
    // `expiresAt` in the future is what "live" means — expired rows are left
    // in place rather than swept, so every read must exclude them itself.
    criteria.push({ availabilityStatus: { is: { expiresAt: { gt: now } } } });
  }

  const box = boundingBox(filter, subject);
  if (box) {
    criteria.push({
      approxLat: { gte: box.minLat, lte: box.maxLat },
      approxLng: { gte: box.minLng, lte: box.maxLng },
    });
  }

  if (criteria.length > 0) {
    where.AND = criteria;
    return;
  }

  // No criteria: fall back to the recommendation net, which is deliberately
  // loose because Discover would rather rank a weak match low than not know
  // about it at all.
  const affinity = [
    subject.interests.length > 0
      ? {
          interests: {
            some: { interestId: { in: subject.interests.map((i) => i.interestId) } },
          },
        }
      : null,
    subject.location.countryCode
      ? { countryCode: subject.location.countryCode }
      : null,
    subject.bunchIds.length > 0
      ? {
          bunchMemberships: {
            some: { bunchId: { in: subject.bunchIds }, status: "ACTIVE" as const },
          },
        }
      : null,
  ].filter((f): f is NonNullable<typeof f> => f !== null);

  if (affinity.length > 0) where.OR = affinity;
}

/**
 * A latitude/longitude box that certainly contains the radius.
 *
 * Deliberately generous — it exists to let Postgres throw away most of the
 * table on an indexed comparison, not to be the answer. `withinRadius` does the
 * real measurement on what survives.
 */
function boundingBox(filter: CandidateFilter, subject: MatchProfile) {
  const origin =
    filter.origin ??
    (subject.location.approxLat !== null && subject.location.approxLng !== null
      ? { lat: subject.location.approxLat, lng: subject.location.approxLng }
      : null);
  if (!filter.withinKm || !origin) return null;

  const latDelta = filter.withinKm / 111.32;
  // Longitude degrees shrink towards the poles. Guard the cosine so a search
  // near a pole widens the box rather than dividing by zero.
  const cos = Math.max(0.01, Math.cos((origin.lat * Math.PI) / 180));
  const lngDelta = filter.withinKm / (111.32 * cos);

  return {
    minLat: origin.lat - latDelta,
    maxLat: origin.lat + latDelta,
    minLng: origin.lng - lngDelta,
    maxLng: origin.lng + lngDelta,
    origin,
  };
}

/** The exact radius check, on the rows the bounding box let through. */
function withinRadius(
  profiles: MatchProfile[],
  subject: MatchProfile,
  filter: CandidateFilter,
): MatchProfile[] {
  const box = boundingBox(filter, subject);
  if (!box || !filter.withinKm) return profiles;

  return profiles.filter((profile) => {
    const { approxLat, approxLng } = profile.location;
    // Someone who has not shared a location cannot be shown to be near you.
    if (approxLat === null || approxLng === null) return false;
    return (
      distanceKm(box.origin, { lat: approxLat, lng: approxLng }) <= filter.withinKm!
    );
  });
}

/**
 * Inverse-frequency rarity per interest, normalized to 0-1.
 *
 * Sharing "Warhammer" is far stronger evidence of a real connection than
 * sharing "Music", and this is what tells the scorer so.
 */
export async function buildScoringContext(
  now = new Date(),
): Promise<ScoringContext> {
  const [totalProfiles, interests] = await Promise.all([
    db.profile.count({ where: { onboardingStage: "COMPLETE" } }),
    db.interest.findMany({ select: { id: true, usageCount: true } }),
  ]);

  const denominator = Math.max(1, totalProfiles);
  const rarity = new Map<string, number>();

  for (const interest of interests) {
    const frequency = Math.min(1, interest.usageCount / denominator);
    // log1p keeps a single very common tag from flattening everything else.
    rarity.set(interest.id, 1 - Math.log1p(frequency * 9) / Math.log(10));
  }

  return {
    now,
    interestRarity: (id) => rarity.get(id) ?? 0.8,
  };
}
