import { db } from "@/server/db/client";
import { distanceKm } from "@/server/modules/geo/distance";
import { interestAffinity } from "@/server/modules/matching/interest-graph";
import { clamp } from "@/server/modules/matching/signals";
import { loadMatchProfile } from "@/server/modules/matching/repository";
import type { MatchProfile } from "@/server/modules/matching/types";

/**
 * Circle recommendations.
 *
 * A circle is a better first suggestion than a person for most new members —
 * joining eight people who already talk to each other is far less exposing than
 * messaging a stranger. So this runs on the same footing as person matching
 * rather than as an afterthought.
 */

export interface RecommendedCircle {
  id: string;
  slug: string;
  name: string;
  description: string;
  imageUrl: string | null;
  type: string;
  memberCount: number;
  maxMembers: number;
  locationLabel: string | null;
  interests: string[];
  score: number;
  highlights: string[];
}

const NEAR_KM = 15;
const FAR_KM = 120;

interface CircleRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  imageUrl: string | null;
  type: string;
  maxMembers: number;
  activityScore: number;
  cityLabel: string | null;
  regionLabel: string | null;
  countryCode: string | null;
  approxLat: number | null;
  approxLng: number | null;
  interests: Array<{ interest: { id: string; slug: string; label: string; category: string } }>;
  _count: { memberships: number };
}

function scoreCircle(subject: MatchProfile, circle: CircleRow) {
  const highlights: string[] = [];

  // --- Interest fit, via the affinity graph rather than exact tag equality ---
  let interestScore = 0;
  const matchedLabels: string[] = [];

  if (circle.interests.length > 0 && subject.interests.length > 0) {
    let total = 0;
    for (const { interest } of circle.interests) {
      let best = 0;
      for (const own of subject.interests) {
        const affinity = interestAffinity(own, interest) * (own.strength / 3);
        if (affinity > best) best = affinity;
      }
      total += best;
      if (best >= 0.75) matchedLabels.push(interest.label);
    }
    interestScore = clamp(total / circle.interests.length);
  }

  if (matchedLabels.length > 0) {
    highlights.push(`Built around ${matchedLabels.slice(0, 3).join(", ")}`);
  }

  // --- Location -------------------------------------------------------------
  let locationScore = 0.5;
  if (
    subject.location.approxLat !== null &&
    subject.location.approxLng !== null &&
    circle.approxLat !== null &&
    circle.approxLng !== null
  ) {
    const km = distanceKm(
      { lat: subject.location.approxLat, lng: subject.location.approxLng },
      { lat: circle.approxLat, lng: circle.approxLng },
    );
    locationScore = clamp(1 - Math.max(0, km - NEAR_KM) / (FAR_KM - NEAR_KM));
    if (km <= NEAR_KM && circle.cityLabel) {
      highlights.push(`Meets around ${circle.cityLabel}`);
    }
  } else if (circle.cityLabel && circle.cityLabel === subject.location.cityLabel) {
    locationScore = 0.9;
    highlights.push(`Meets around ${circle.cityLabel}`);
  } else if (!circle.cityLabel) {
    // An online circle is not "far away".
    locationScore = 0.7;
  }

  // --- Room to join ---------------------------------------------------------
  const memberCount = circle._count.memberships;
  const spotsLeft = circle.maxMembers - memberCount;
  // Circles are meant to be small. A nearly-empty one is quiet; a full one has
  // no room. The sweet spot is an established circle with space.
  const fillRatio = memberCount / Math.max(1, circle.maxMembers);
  const roomScore =
    spotsLeft <= 0 ? 0 : clamp(1 - Math.abs(fillRatio - 0.65) / 0.65);

  if (spotsLeft > 0 && spotsLeft <= 3) {
    highlights.push(`${spotsLeft} ${spotsLeft === 1 ? "spot" : "spots"} left`);
  }

  const score =
    0.5 * interestScore +
    0.2 * locationScore +
    0.15 * clamp(circle.activityScore) +
    0.15 * roomScore;

  return { score: Math.round(100 * clamp(score) ** 0.6), highlights };
}

export async function recommendCircles(
  profileId: string,
  limit = 6,
): Promise<RecommendedCircle[]> {
  const subject = await loadMatchProfile(profileId);
  if (!subject) return [];

  const circles = await db.circle.findMany({
    where: {
      visibility: "PUBLIC",
      archivedAt: null,
      // Never recommend a circle they are already in, or were removed from.
      memberships: { none: { profileId } },
    },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      imageUrl: true,
      type: true,
      maxMembers: true,
      activityScore: true,
      cityLabel: true,
      regionLabel: true,
      countryCode: true,
      approxLat: true,
      approxLng: true,
      interests: {
        select: {
          interest: { select: { id: true, slug: true, label: true, category: true } },
        },
      },
      _count: { select: { memberships: { where: { status: "ACTIVE" } } } },
    },
    take: 200,
  });

  return circles
    .map((circle) => {
      const row = circle as unknown as CircleRow;
      const { score, highlights } = scoreCircle(subject, row);
      return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        description: row.description,
        imageUrl: row.imageUrl,
        type: row.type,
        memberCount: row._count.memberships,
        maxMembers: row.maxMembers,
        locationLabel: row.cityLabel ?? row.regionLabel,
        interests: row.interests.map((i) => i.interest.label),
        score,
        highlights,
      };
    })
    .filter((c) => c.memberCount < c.maxMembers && c.score >= 30)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
