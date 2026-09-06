import { db } from "@/server/db/client";
import { distanceKm } from "@/server/modules/geo/distance";
import { interestAffinity } from "@/server/modules/matching/interest-graph";
import { clamp } from "@/server/modules/matching/signals";
import { languageName } from "@/lib/languages";
import { loadMatchProfile } from "@/server/modules/matching/repository";
import type { MatchProfile } from "@/server/modules/matching/types";

/**
 * Bunch recommendations.
 *
 * A bunch is a better first suggestion than a person for most new members,
 * joining eight people who already talk to each other is far less exposing than
 * messaging a stranger. So this runs on the same footing as person matching
 * rather than as an afterthought.
 */

export interface RecommendedBunch {
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

interface BunchRow {
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
  languages: string[];
  _count: { memberships: number };
}

function scoreBunch(subject: MatchProfile, bunch: BunchRow) {
  const highlights: string[] = [];

  // --- Interest fit, via the affinity graph rather than exact tag equality ---
  let interestScore = 0;
  const matchedLabels: string[] = [];

  if (bunch.interests.length > 0 && subject.interests.length > 0) {
    let total = 0;
    for (const { interest } of bunch.interests) {
      let best = 0;
      for (const own of subject.interests) {
        const affinity = interestAffinity(own, interest) * (own.strength / 3);
        if (affinity > best) best = affinity;
      }
      total += best;
      if (best >= 0.75) matchedLabels.push(interest.label);
    }
    interestScore = clamp(total / bunch.interests.length);
  }

  if (matchedLabels.length > 0) {
    highlights.push(`Built around ${matchedLabels.slice(0, 3).join(", ")}`);
  }

  // --- Location -------------------------------------------------------------
  let locationScore = 0.5;
  if (
    subject.location.approxLat !== null &&
    subject.location.approxLng !== null &&
    bunch.approxLat !== null &&
    bunch.approxLng !== null
  ) {
    const km = distanceKm(
      { lat: subject.location.approxLat, lng: subject.location.approxLng },
      { lat: bunch.approxLat, lng: bunch.approxLng },
    );
    locationScore = clamp(1 - Math.max(0, km - NEAR_KM) / (FAR_KM - NEAR_KM));
    if (km <= NEAR_KM && bunch.cityLabel) {
      highlights.push(`Meets around ${bunch.cityLabel}`);
    }
  } else if (bunch.cityLabel && bunch.cityLabel === subject.location.cityLabel) {
    locationScore = 0.9;
    highlights.push(`Meets around ${bunch.cityLabel}`);
  } else if (!bunch.cityLabel) {
    // An online bunch is not "far away".
    locationScore = 0.7;
  }

  // --- Language -------------------------------------------------------------
  //
  // Only ever a highlight, never a term in the score. Which language a bunch
  // runs in is decided in the query below, where a group somebody could not
  // follow is removed outright rather than ranked low: a Dutch-speaking games
  // night is not a slightly worse suggestion for somebody who speaks no Dutch,
  // it is the wrong room.
  const spoken = new Set(subject.languages.map((language) => language.code));
  const shared = bunch.languages.filter((code) => spoken.has(code));
  if (shared.length > 0 && bunch.languages.length > 0) {
    highlights.push(`Runs in ${languageName(shared[0]!)}`);
  }

  // --- Room to join ---------------------------------------------------------
  const memberCount = bunch._count.memberships;
  const spotsLeft = bunch.maxMembers - memberCount;
  // Bunches are meant to be small. A nearly-empty one is quiet; a full one has
  // no room. The sweet spot is an established bunch with space.
  const fillRatio = memberCount / Math.max(1, bunch.maxMembers);
  const roomScore =
    spotsLeft <= 0 ? 0 : clamp(1 - Math.abs(fillRatio - 0.65) / 0.65);

  if (spotsLeft > 0 && spotsLeft <= 3) {
    highlights.push(`${spotsLeft} ${spotsLeft === 1 ? "spot" : "spots"} left`);
  }

  const score =
    0.5 * interestScore +
    0.2 * locationScore +
    0.15 * clamp(bunch.activityScore) +
    0.15 * roomScore;

  return { score: Math.round(100 * clamp(score) ** 0.6), highlights };
}

export async function recommendBunches(
  profileId: string,
  limit = 6,
): Promise<RecommendedBunch[]> {
  const subject = await loadMatchProfile(profileId);
  if (!subject) return [];

  const bunches = await db.bunch.findMany({
    where: {
      visibility: "PUBLIC",
      archivedAt: null,
      // Never recommend a bunch they are already in, or were removed from.
      memberships: { none: { profileId } },
      // A bunch whose evenings run in a language this member does not have is
      // excluded rather than ranked low, for the same reason as in
      // `requireASharedLanguage`: it is a fact about whether they could take
      // part, not a guess about whether they would enjoy it. A bunch that has
      // said nothing stays in, because silence is not a claim.
      ...(subject.languages.length > 0
        ? {
            OR: [
              { languages: { isEmpty: true } },
              {
                languages: {
                  hasSome: subject.languages.map((language) => language.code),
                },
              },
            ],
          }
        : {}),
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
      languages: true,
      interests: {
        select: {
          interest: { select: { id: true, slug: true, label: true, category: true } },
        },
      },
      _count: { select: { memberships: { where: { status: "ACTIVE" } } } },
    },
    take: 200,
  });

  return bunches
    .map((bunch) => {
      const row = bunch as unknown as BunchRow;
      const { score, highlights } = scoreBunch(subject, row);
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
