import {
  ACTIVITY_IDEAS,
  bandsWithin,
  type ActivityIdea,
  type Mood,
} from "@/lib/activity-ideas";
import { db } from "@/server/db/client";
import { recommendActivities } from "@/server/modules/matching/activities";
import { findPeople } from "@/server/modules/discovery/find-people";

/**
 * Do Something, an evening, from constraints.
 *
 * Two sources, kept visibly separate because they have different truth values.
 *
 * **Real** activities come out of the database: somebody has actually created
 * them, at a time, with a place they typed themselves. These are things that
 * exist.
 *
 * **Ideas** come from a static catalogue of *kinds* of evening. They contain no
 * venue, no address and no price, because Bunchy holds no venue data and
 * inventing one would send somebody to a bar that is not there. An idea becomes
 * real the moment a member turns it into an activity and fills in where.
 *
 * The brief asked for "Bowling · €18/person · 2.4 km · 19:30". Three of those
 * four numbers would have been fabricated, so the surface says "bowling, fits a
 * €25 evening, two hours" and lets the group supply the rest.
 */

export interface DoSomethingConstraints {
  /** Euro ceiling per person. 0 means free only. */
  budget?: number;
  /** Hours available. */
  hours?: number;
  withinKm?: number;
  mood?: Mood;
  /** Who it is for, changes whether people are searched for at all. */
  people?: "alone" | "friends" | "find";
}

export interface DoSomethingResult {
  ideas: ActivityIdea[];
  /** Real, member-created activities that fit. */
  happening: Awaited<ReturnType<typeof recommendActivities>>;
  /** Only populated when the member asked to find people. */
  peopleUp: Awaited<ReturnType<typeof findPeople>>["people"];
  constraints: DoSomethingConstraints;
}

/**
 * A small deterministic shuffle.
 *
 * "Try another" has to move, but the same constraints on the same day should
 * not reshuffle on every render, a page that changes under somebody while they
 * are reading it is a page they stop trusting. The seed is the caller's, so the
 * client advances it explicitly.
 */
function seededOrder<T>(items: T[], seed: number): T[] {
  return items
    .map((item, index) => ({
      item,
      key: Math.sin(seed * 9301 + index * 49297) * 233280,
    }))
    .sort((a, b) => (a.key % 1) - (b.key % 1))
    .map((row) => row.item);
}

function fits(idea: ActivityIdea, constraints: DoSomethingConstraints): boolean {
  if (constraints.budget !== undefined) {
    if (!bandsWithin(constraints.budget).includes(idea.cost)) return false;
  }
  if (constraints.hours !== undefined && idea.hours > constraints.hours) {
    return false;
  }
  if (constraints.mood && constraints.mood !== "random") {
    if (!idea.moods.includes(constraints.mood)) return false;
  }
  // Alone means alone: a pickup football match is not a solo evening.
  if (constraints.people === "alone" && idea.minPeople > 1) return false;
  return true;
}

export async function doSomething(
  profileId: string,
  constraints: DoSomethingConstraints = {},
  seed = 1,
): Promise<DoSomethingResult> {
  const profile = await db.profile.findUnique({
    where: { id: profileId },
    select: { interests: { select: { interest: { select: { slug: true } } } } },
  });
  const mine = new Set(profile?.interests.map((i) => i.interest.slug) ?? []);

  const eligible = ACTIVITY_IDEAS.filter((idea) => fits(idea, constraints));

  // Interests tilt the order without deciding it. Somebody asking to be
  // surprised should still meet the thing they have never listed.
  const ordered = seededOrder([...eligible], seed).sort((a, b) => {
    const aMatch = a.interests.some((slug) => mine.has(slug)) ? 1 : 0;
    const bMatch = b.interests.some((slug) => mine.has(slug)) ? 1 : 0;
    return bMatch - aMatch;
  });

  const [happening, people] = await Promise.all([
    recommendActivities(profileId, 4),
    constraints.people === "find"
      ? findPeople(profileId, "someone free to do something", {
          availableNow: true,
          withinKm: constraints.withinKm ?? undefined,
          limit: 6,
        })
      : Promise.resolve(null),
  ]);

  return {
    ideas: ordered.slice(0, 3),
    happening,
    peopleUp: people?.people ?? [],
    constraints,
  };
}
