import { db } from "@/server/db/client";
import type { Prisma } from "@/generated/prisma/client";
import { scorer } from "@/server/modules/matching/index";
import {
  buildScoringContext,
  loadCandidates,
  loadMatchProfile,
} from "@/server/modules/matching/repository";
import type { MatchProfile, PersonMatch } from "@/server/modules/matching/types";
import { track } from "@/server/modules/analytics/track";
import { ANALYTICS_EVENTS } from "@/server/modules/analytics/events";

/**
 * Orchestration: load, filter, score, rank, persist.
 *
 * The engine deliberately returns a *small* number of strong suggestions rather
 * than an endless ranked list. There is no "load more" here and that is a
 * product decision, not a missing feature, a page that can always show you one
 * more person is a feed, and the point of Bunchy is to send you to talk to
 * someone instead.
 */

/** Recommendations are recomputed rather than served stale beyond this. */
const RECOMMENDATION_TTL_MS = 12 * 60 * 60 * 1000;

/** Below this, an introduction is not worth making. */
const MIN_SCORE = 35;

export interface RecommendedPerson extends PersonMatch {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  age: number | null;
  locationLabel: string | null;
  goals: string[];
  /** Decoration only. Nothing in the ranking reads either of these. */
  staff: boolean;
  supporter: boolean;
}

export interface RecommendPeopleOptions {
  limit?: number;
  /** Skip the cache. Used after onboarding changes the inputs. */
  refresh?: boolean;
}

export async function recommendPeople(
  profileId: string,
  options: RecommendPeopleOptions = {},
): Promise<RecommendedPerson[]> {
  const limit = Math.min(options.limit ?? 8, 24);
  const now = new Date();

  const subject = await loadMatchProfile(profileId, now);
  if (!subject) return [];

  const [candidates, context] = await Promise.all([
    loadCandidates(subject, now),
    buildScoringContext(now),
  ]);
  if (candidates.length === 0) return [];

  const matches = await scorer().scorePeople(subject, candidates, context);

  const ranked = matches
    .filter((m) => m.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  if (ranked.length === 0) return [];

  await persistPersonRecommendations(profileId, ranked, now);

  track({
    name: ANALYTICS_EVENTS.RECOMMENDATIONS_SERVED,
    profileId,
    properties: {
      kind: "PERSON",
      served: ranked.length,
      poolSize: candidates.length,
      scorer: scorer().id,
      topScore: ranked[0]?.score ?? null,
    },
  });

  return decorate(ranked, candidates);
}

/**
 * Recommendations are cached so a member sees a stable set through a session
 * rather than a reshuffling list, and so we can measure which suggestions
 * actually led to a connection.
 */
async function persistPersonRecommendations(
  profileId: string,
  matches: PersonMatch[],
  now: Date,
): Promise<void> {
  const expiresAt = new Date(now.getTime() + RECOMMENDATION_TTL_MS);
  const source = scorer().id;

  // The signal breakdown is plain JSON-serializable data; Prisma's input type
  // just cannot see that through the interface.
  const reasonsFor = (match: PersonMatch) =>
    ({
      highlights: match.highlights,
      signals: match.signals,
    }) as unknown as Prisma.InputJsonValue;

  await db.$transaction(
    matches.map((match) =>
      db.recommendation.upsert({
        where: {
          profileId_kind_targetId: {
            profileId,
            kind: "PERSON",
            targetId: match.profileId,
          },
        },
        create: {
          profileId,
          kind: "PERSON",
          targetId: match.profileId,
          score: match.score,
          reasons: reasonsFor(match),
          source,
          expiresAt,
        },
        update: {
          score: match.score,
          reasons: reasonsFor(match),
          source,
          expiresAt,
        },
      }),
    ),
  );
}

const GOAL_LABELS: Record<string, string> = {
  NEW_FRIENDS: "New friends",
  GAMING_FRIENDS: "Gaming friends",
  HOBBY_PARTNERS: "Hobby partners",
  GOING_OUT: "People to go out with",
  STUDY_PARTNERS: "Study partners",
  FITNESS_PARTNERS: "Fitness partners",
  CREATIVE_COLLABORATORS: "Creative collaborators",
  BUSINESS_PARTNERS: "Project partners",
  MENTORS: "Mentors",
  SIMILAR_INTERESTS: "Similar interests",
  LOCAL_COMMUNITIES: "Local communities",
  TRAVEL_COMPANIONS: "Travel companions",
  ACTIVITY_PARTNERS: "Activity partners",
};

/**
 * Attaches the display fields. Reads only from the already-loaded candidate
 * set plus public profile columns, nothing from the `User` table reaches this
 * payload.
 */
async function decorate(
  matches: PersonMatch[],
  candidates: MatchProfile[],
): Promise<RecommendedPerson[]> {
  const byId = new Map(candidates.map((c) => [c.profileId, c] as const));

  const profiles = await db.profile.findMany({
    where: { id: { in: matches.map((m) => m.profileId) } },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      bio: true,
      cityLabel: true,
      regionLabel: true,
      privacy: { select: { showApproxLocation: true, showExactAge: true } },
      /*
       * The two marks that sit beside a name.
       *
       * Read straight from the role and the subscription row rather than
       * through the supporter module, which this file is forbidden from
       * importing, a guard test enforces it, because code that decides who you
       * meet must not be able to see who paid. These two booleans leave this
       * function as decoration and are never read by anything above.
       */
      user: {
        select: {
          role: true,
          supporter: { select: { status: true, currentPeriodEnd: true } },
        },
      },
    },
  });
  const profileById = new Map(profiles.map((p) => [p.id, p] as const));

  return matches.flatMap((match) => {
    const candidate = byId.get(match.profileId);
    const profile = profileById.get(match.profileId);
    if (!candidate || !profile) return [];

    return [
      {
        ...match,
        username: profile.username,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        bio: profile.bio,
        age: profile.privacy?.showExactAge === false ? null : candidate.age,
        locationLabel:
          profile.privacy?.showApproxLocation === false
            ? null
            : (profile.cityLabel ?? profile.regionLabel),
        goals: candidate.goals.map((g) => GOAL_LABELS[g] ?? g),
        staff: profile.user.role !== "MEMBER",
        supporter:
          profile.user.role !== "MEMBER" ||
          profile.user.supporter?.status === "ACTIVE" ||
          profile.user.supporter?.status === "PAST_DUE" ||
          (profile.user.supporter?.currentPeriodEnd ?? new Date(0)) > new Date(),
      },
    ];
  });
}

/** Explicit feedback. `NOT_INTERESTED` permanently removes someone from Discover. */
export async function recordMatchFeedback(
  profileId: string,
  targetId: string,
  signal: "GOOD_MATCH" | "NOT_INTERESTED",
): Promise<void> {
  await db.matchFeedback.upsert({
    where: { profileId_targetId: { profileId, targetId } },
    create: { profileId, targetId, signal },
    update: { signal },
  });

  await db.recommendation.updateMany({
    where: { profileId, kind: "PERSON", targetId },
    data: { dismissedAt: new Date() },
  });

  // Feeds the recommendation-quality loop (spec §63): served vs dismissed is
  // how we tell whether the matching engine is actually getting better.
  track({
    name:
      signal === "NOT_INTERESTED"
        ? ANALYTICS_EVENTS.RECOMMENDATION_DISMISSED
        : ANALYTICS_EVENTS.RECOMMENDATIONS_SERVED,
    profileId,
    properties: { kind: "PERSON", signal },
  });
}

/**
 * Take back a "not for me".
 *
 * The exclusion is meant to be instant and permanent, a member will only tell
 * us what they do not want if it is, but permanent applies to the *engine*,
 * not to a mis-tap. The button is small, it sits next to "Connect", and on a
 * phone the two are a thumb apart. Without a way back, the cost of a slip is a
 * person the member never sees again and no way to know it happened.
 *
 * Deleting the row rather than writing a third signal keeps the exclusion
 * simple: the repository asks whether feedback exists, and a "dismissed, but
 * actually not" state would be a third case for every reader of it to get
 * wrong.
 *
 * One known skew: the dismissal already emitted RECOMMENDATION_DISMISSED, and
 * an analytics event cannot be retracted. So the quality loop counts an undone
 * dismissal as a dismissal. It over-reports dismissals slightly, which is the
 * safe direction to be wrong in, it makes the engine look worse than it is
 * rather than better.
 */
export async function undoMatchFeedback(
  profileId: string,
  targetId: string,
): Promise<void> {
  await db.matchFeedback.deleteMany({ where: { profileId, targetId } });
  await db.recommendation.updateMany({
    where: { profileId, kind: "PERSON", targetId },
    data: { dismissedAt: null },
  });
}

/** Marks a recommendation as acted on, which is how we measure whether it worked. */
export async function markRecommendationActed(
  profileId: string,
  kind: "PERSON" | "BUNCH" | "ACTIVITY",
  targetId: string,
): Promise<void> {
  await db.recommendation
    .updateMany({
      where: { profileId, kind, targetId },
      data: { actedAt: new Date() },
    })
    .catch(() => {});
}
