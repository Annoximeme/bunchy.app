import { db } from "@/server/db/client";
import { distanceKm } from "@/server/modules/geo/distance";
import { interestAffinity } from "@/server/modules/matching/interest-graph";
import { clamp } from "@/server/modules/matching/signals";
import { loadMatchProfile } from "@/server/modules/matching/repository";
import type { AvailabilityWindow } from "@/generated/prisma/enums";
import type { MatchProfile } from "@/server/modules/matching/types";

/**
 * Activity recommendations — "what should I do?", the other half of Discover.
 *
 * Ranking favours things that are actually joinable: soon, nearby or online,
 * with spots left, at a time the member said they are free.
 */

export interface RecommendedActivity {
  id: string;
  title: string;
  description: string;
  startsAt: Date;
  mode: string;
  locationLabel: string | null;
  cityLabel: string | null;
  maxParticipants: number;
  participantCount: number;
  circle: { id: string; slug: string; name: string } | null;
  organizer: { username: string; displayName: string; avatarUrl: string | null };
  score: number;
  highlights: string[];
}

/**
 * Which availability window a moment falls into.
 *
 * Members do not have a stored timezone yet, so this reads the server's UTC
 * clock. That is accurate for the launch market (Belgium, one hour off UTC) and
 * wrong enough to matter for a member in Tokyo — capturing a timezone during
 * onboarding is the fix, tracked as a Phase 2 item.
 */
export function windowForDate(date: Date): AvailabilityWindow {
  const day = date.getUTCDay();
  const hour = date.getUTCHours();
  const weekend = day === 0 || day === 6;

  if (hour >= 23 || hour < 5) return "LATE_NIGHT";
  if (hour < 12) return weekend ? "WEEKEND_MORNING" : "WEEKDAY_MORNING";
  if (hour < 17) return weekend ? "WEEKEND_AFTERNOON" : "WEEKDAY_AFTERNOON";
  return weekend ? "WEEKEND_EVENING" : "WEEKDAY_EVENING";
}

const NEAR_KM = 20;
const FAR_KM = 120;
const HORIZON_DAYS = 45;

interface ActivityRow {
  id: string;
  title: string;
  description: string;
  startsAt: Date;
  mode: string;
  locationLabel: string | null;
  cityLabel: string | null;
  countryCode: string | null;
  maxParticipants: number;
  circleId: string | null;
  circle: {
    id: string;
    slug: string;
    name: string;
    approxLat: number | null;
    approxLng: number | null;
    interests: Array<{
      interest: { id: string; slug: string; label: string; category: string };
    }>;
  } | null;
  organizer: { username: string; displayName: string; avatarUrl: string | null };
  _count: { participants: number };
}

function scoreActivity(subject: MatchProfile, activity: ActivityRow, now: Date) {
  const highlights: string[] = [];

  // --- Already part of the community that is organizing it ------------------
  const inCircle =
    activity.circleId !== null && subject.circleIds.includes(activity.circleId);
  if (inCircle && activity.circle) {
    highlights.push(`From your circle ${activity.circle.name}`);
  }

  // --- Topic fit, borrowed from the hosting circle --------------------------
  let interestScore = inCircle ? 0.85 : 0.35;
  const circleInterests = activity.circle?.interests ?? [];
  if (circleInterests.length > 0 && subject.interests.length > 0) {
    let total = 0;
    const matched: string[] = [];
    for (const { interest } of circleInterests) {
      let best = 0;
      for (const own of subject.interests) {
        const affinity = interestAffinity(own, interest) * (own.strength / 3);
        if (affinity > best) best = affinity;
      }
      total += best;
      if (best >= 0.75) matched.push(interest.label);
    }
    interestScore = Math.max(interestScore, clamp(total / circleInterests.length));
    if (matched.length > 0 && !inCircle) {
      highlights.push(`Matches your interest in ${matched.slice(0, 2).join(" and ")}`);
    }
  }

  // --- Can they physically get there ----------------------------------------
  let locationScore = 0.6;
  if (activity.mode === "ONLINE") {
    locationScore = 1;
    highlights.push("Online");
  } else if (
    subject.location.approxLat !== null &&
    subject.location.approxLng !== null &&
    activity.circle?.approxLat != null &&
    activity.circle.approxLng != null
  ) {
    const km = distanceKm(
      { lat: subject.location.approxLat, lng: subject.location.approxLng },
      { lat: activity.circle.approxLat, lng: activity.circle.approxLng },
    );
    locationScore = clamp(1 - Math.max(0, km - NEAR_KM) / (FAR_KM - NEAR_KM));
  } else if (activity.cityLabel && activity.cityLabel === subject.location.cityLabel) {
    locationScore = 0.95;
  } else if (activity.cityLabel && activity.cityLabel !== subject.location.cityLabel) {
    locationScore = 0.25;
  }

  // --- Is it at a time they said they are free ------------------------------
  const window = windowForDate(activity.startsAt);
  const availabilityScore =
    subject.availability.length === 0
      ? 0.6
      : subject.availability.includes(window)
        ? 1
        : 0.3;
  if (availabilityScore === 1) highlights.push("At a time you're usually free");

  // --- Soon beats someday, and spots left beats a waitlist ------------------
  const daysAway =
    (activity.startsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
  const soonScore = clamp(1 - Math.max(0, daysAway - 2) / HORIZON_DAYS);

  const spotsLeft = activity.maxParticipants - activity._count.participants;
  const roomScore = spotsLeft <= 0 ? 0.15 : clamp(0.5 + spotsLeft / 8);
  if (spotsLeft > 0 && spotsLeft <= 2) {
    highlights.push(`${spotsLeft} ${spotsLeft === 1 ? "spot" : "spots"} left`);
  }

  const score =
    0.32 * interestScore +
    0.2 * locationScore +
    0.18 * availabilityScore +
    0.17 * soonScore +
    0.13 * roomScore;

  return { score: Math.round(100 * clamp(score) ** 0.6), highlights };
}

export async function recommendActivities(
  profileId: string,
  limit = 6,
): Promise<RecommendedActivity[]> {
  const now = new Date();
  const subject = await loadMatchProfile(profileId, now);
  if (!subject) return [];

  const horizon = new Date(now.getTime() + HORIZON_DAYS * 24 * 60 * 60 * 1000);

  const activities = await db.activity.findMany({
    where: {
      status: "SCHEDULED",
      startsAt: { gte: now, lte: horizon },
      // Not already going, and nothing hosted in a private circle they cannot see.
      participants: { none: { profileId, status: { in: ["JOINED", "WAITLISTED"] } } },
      OR: [
        { circleId: null },
        { circle: { visibility: "PUBLIC", archivedAt: null } },
        { circle: { memberships: { some: { profileId, status: "ACTIVE" } } } },
      ],
      organizer: {
        blocksMade: { none: { blockedId: profileId } },
        blocksReceived: { none: { blockerId: profileId } },
      },
    },
    select: {
      id: true,
      title: true,
      description: true,
      startsAt: true,
      mode: true,
      locationLabel: true,
      cityLabel: true,
      countryCode: true,
      maxParticipants: true,
      circleId: true,
      circle: {
        select: {
          id: true,
          slug: true,
          name: true,
          approxLat: true,
          approxLng: true,
          interests: {
            select: {
              interest: { select: { id: true, slug: true, label: true, category: true } },
            },
          },
        },
      },
      organizer: {
        select: { username: true, displayName: true, avatarUrl: true },
      },
      _count: { select: { participants: { where: { status: "JOINED" } } } },
    },
    orderBy: { startsAt: "asc" },
    take: 150,
  });

  return (activities as unknown as ActivityRow[])
    .map((activity) => {
      const { score, highlights } = scoreActivity(subject, activity, now);
      return {
        id: activity.id,
        title: activity.title,
        description: activity.description,
        startsAt: activity.startsAt,
        mode: activity.mode,
        locationLabel: activity.locationLabel,
        cityLabel: activity.cityLabel,
        maxParticipants: activity.maxParticipants,
        participantCount: activity._count.participants,
        circle: activity.circle
          ? { id: activity.circle.id, slug: activity.circle.slug, name: activity.circle.name }
          : null,
        organizer: activity.organizer,
        score,
        highlights,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
