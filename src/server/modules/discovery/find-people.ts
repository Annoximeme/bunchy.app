import { db } from "@/server/db/client";
import type { AvailabilityKind } from "@/generated/prisma/enums";
import { scorer } from "@/server/modules/matching/index";
import {
  buildScoringContext,
  loadCandidates,
  loadMatchProfile,
  type CandidateFilter,
} from "@/server/modules/matching/repository";
import type { MatchProfile, PersonMatch } from "@/server/modules/matching/types";
import { resolveIntent, type ResolvedIntent } from "@/server/modules/intent/resolve";
import {
  AVAILABILITY_LABELS,
  visibleStatusCondition,
} from "@/server/modules/availability/service";
import { ageFrom } from "@/server/modules/profile/serialize";
import { track } from "@/server/modules/analytics/track";
import { ANALYTICS_EVENTS } from "@/server/modules/analytics/events";

/**
 * "Find someone to play Fortnite with."
 *
 * Discover answers "who should I meet?" — an open question, answered with a
 * considered set. This answers a *closed* one, where the member has said what
 * they want and the terms are requirements rather than hints.
 *
 * The part worth reading is `explainEmpty`. §27 says never show a fake
 * recommendation and always offer a way forward, and the cheap version of that
 * is a static list of four buttons. Instead, when a search finds nobody, each
 * constraint is lifted in turn to find out *which one* emptied it — so the
 * answer is "nobody is free Saturday, but four people match everything else"
 * rather than "try broadening your search". One is useful; the other is a
 * shrug with a button on it.
 */

/** Below this a suggestion is not worth making, matching the Discover floor. */
const MIN_SCORE = 30;
const DEFAULT_LIMIT = 12;
/** A search naming a place means "near there", not "anywhere on earth". */
const DEFAULT_RADIUS_KM = 60;

export interface FoundPerson extends PersonMatch {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  age: number | null;
  locationLabel: string | null;
  /** Their live Who's Up status, when they have one this viewer may see. */
  availability: { kind: AvailabilityKind; label: string; note: string | null } | null;
  /** Already connected. Shown so "invite a friend" reads differently from "meet a stranger". */
  connected: boolean;
}

/** A constraint that could be dropped, and what dropping it would find. */
export interface Relaxation {
  constraint: "interests" | "time" | "distance" | "goals" | "availableNow";
  /** Written for a member to read, e.g. "Nobody is free Saturday". */
  message: string;
  /** How many people match everything else. Always at least one. */
  found: number;
}

export interface FindPeopleResult {
  intent: ResolvedIntent;
  people: FoundPerson[];
  /** What was actually required, so the screen can show and undo each one. */
  applied: {
    interests: string[];
    when: string | null;
    nearCity: string | null;
    withinKm: number | null;
    goals: string[];
    availableNow: boolean;
  };
  /** Only populated when `people` is empty. Ordered most-helpful first. */
  relaxations: Relaxation[];
}

export interface FindPeopleOptions {
  limit?: number;
  now?: Date;
  /** Restrict to people with a live Who's Up status. Off by default. */
  availableNow?: boolean;
  /** Overrides the radius the intent implied. Null means "anywhere". */
  withinKm?: number | null;
}

export async function findPeople(
  profileId: string,
  query: string,
  options: FindPeopleOptions = {},
): Promise<FindPeopleResult> {
  const now = options.now ?? new Date();
  const subject = await loadMatchProfile(profileId, now);
  if (!subject) throw new Error("Profile not found");

  const intent = await resolveIntent(query, { now, timezone: subject.timezone });

  track({
    name: ANALYTICS_EVENTS.PERSON_SEARCH_STARTED,
    profileId,
    // The parsed shape, never the sentence. What someone typed into a search
    // box about their weekend is not analytics data.
    properties: {
      interests: intent.interestSlugs.length,
      hasTime: intent.when !== null,
      hasPlace: intent.place !== null,
    },
  });

  const filter = filterFor(intent, options);
  const people = await search(subject, filter, now, options.limit ?? DEFAULT_LIMIT, profileId);

  const applied = {
    interests: intent.interests.map((i) => i.label),
    when: intent.when?.label ?? null,
    nearCity: intent.place?.cityLabel ?? null,
    withinKm: filter.withinKm ?? null,
    goals: intent.goals,
    availableNow: filter.availableNow === true,
  };

  if (people.length > 0) {
    return { intent, people, applied, relaxations: [] };
  }

  track({
    name: ANALYTICS_EVENTS.PERSON_SEARCH_EMPTY,
    profileId,
    properties: { interests: intent.interestSlugs.length, hadTime: intent.when !== null },
  });

  return {
    intent,
    people,
    applied,
    relaxations: await explainEmpty(subject, filter, intent, now),
  };
}

// --- Searching --------------------------------------------------------------

function filterFor(intent: ResolvedIntent, options: FindPeopleOptions): CandidateFilter {
  const origin = intent.place
    ? { lat: intent.place.approxLat, lng: intent.place.approxLng }
    : null;

  // A radius applies unless the plan is explicitly online. Requiring somebody
  // you will only ever meet over voice chat to live within 60 km is a filter
  // that can only remove good matches; requiring it of somebody you want to
  // meet at a table is the whole point.
  const withinKm =
    options.withinKm !== undefined
      ? (options.withinKm ?? undefined)
      : intent.mode === "ONLINE"
        ? undefined
        : DEFAULT_RADIUS_KM;

  return {
    interestIds: intent.interests.map((i) => i.interestId),
    windows: intent.windows,
    goals: intent.goals,
    availableNow: options.availableNow === true,
    withinKm,
    origin,
    // This asks "who would I do this with", not "who should I meet". People you
    // already know are the first answer, not an exclusion.
    includeConnections: true,
  };
}

async function search(
  subject: MatchProfile,
  filter: CandidateFilter,
  now: Date,
  limit: number,
  viewerProfileId: string,
): Promise<FoundPerson[]> {
  const [candidates, context] = await Promise.all([
    loadCandidates(subject, now, filter),
    buildScoringContext(now),
  ]);
  if (candidates.length === 0) return [];

  const matches = await scorer().scorePeople(subject, candidates, context);
  const ranked = matches
    .filter((m) => m.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return ranked.length > 0 ? decorate(ranked, viewerProfileId, now) : [];
}

/** Just the count, for working out which constraint is the blocker. */
async function countMatching(
  subject: MatchProfile,
  filter: CandidateFilter,
  now: Date,
): Promise<number> {
  const [candidates, context] = await Promise.all([
    loadCandidates(subject, now, filter),
    buildScoringContext(now),
  ]);
  if (candidates.length === 0) return 0;

  const matches = await scorer().scorePeople(subject, candidates, context);
  return matches.filter((m) => m.score >= MIN_SCORE).length;
}

// --- Honest empty states ----------------------------------------------------

/**
 * Which requirement emptied the search.
 *
 * Each constraint is lifted on its own and the search re-run, so what comes
 * back is a fact about this member's actual pool rather than generic advice.
 * Only runs when nothing matched, and only over constraints that were
 * genuinely applied — at most four extra counts, on the one path where a member
 * is otherwise looking at an empty screen.
 */
async function explainEmpty(
  subject: MatchProfile,
  filter: CandidateFilter,
  intent: ResolvedIntent,
  now: Date,
): Promise<Relaxation[]> {
  const candidates: Array<{
    constraint: Relaxation["constraint"];
    message: string;
    without: CandidateFilter;
  }> = [];

  if (filter.availableNow) {
    candidates.push({
      constraint: "availableNow",
      message: "Nobody has said they're free right now",
      without: { ...filter, availableNow: false },
    });
  }
  if (filter.windows?.length && intent.when) {
    candidates.push({
      constraint: "time",
      message: `Nobody is free ${intent.when.label}`,
      without: { ...filter, windows: [] },
    });
  }
  if (filter.withinKm) {
    candidates.push({
      constraint: "distance",
      message: intent.place
        ? `Nobody is within ${filter.withinKm} km of ${intent.place.cityLabel}`
        : `Nobody is within ${filter.withinKm} km`,
      without: { ...filter, withinKm: undefined },
    });
  }
  if (filter.goals?.length) {
    candidates.push({
      constraint: "goals",
      message: "Nobody is looking for quite that",
      without: { ...filter, goals: [] },
    });
  }
  if (filter.interestIds?.length) {
    const labels = intent.interests.map((i) => i.label).join(" and ");
    candidates.push({
      constraint: "interests",
      message: labels ? `Nobody nearby is into ${labels}` : "Nobody matches that interest",
      without: { ...filter, interestIds: [] },
    });
  }

  const results = await Promise.all(
    candidates.map(async (candidate) => ({
      constraint: candidate.constraint,
      message: candidate.message,
      found: await countMatching(subject, candidate.without, now),
    })),
  );

  // A relaxation that still finds nobody is not a suggestion, it is noise.
  return results
    .filter((r) => r.found > 0)
    .sort((a, b) => b.found - a.found);
}

// --- Display ----------------------------------------------------------------

/**
 * Attaches display fields and the Who's Up badge.
 *
 * Location and age go through the same privacy switches Discover honours, and
 * a status appears only if this viewer is inside the audience its owner chose —
 * the condition is applied in the query, not filtered afterwards.
 */
async function decorate(
  matches: PersonMatch[],
  viewerProfileId: string,
  now: Date,
): Promise<FoundPerson[]> {
  const ids = matches.map((m) => m.profileId);

  const [profiles, statuses, connections] = await Promise.all([
    db.profile.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        cityLabel: true,
        regionLabel: true,
        user: { select: { birthYear: true, birthMonth: true } },
        privacy: { select: { showApproxLocation: true, showExactAge: true } },
      },
    }),
    db.availabilityStatus.findMany({
      where: {
        profileId: { in: ids },
        expiresAt: { gt: now },
        ...visibleStatusCondition(viewerProfileId),
      },
      select: { profileId: true, kind: true, note: true },
    }),
    db.connection.findMany({
      where: {
        status: "ACCEPTED",
        OR: [
          { requesterId: viewerProfileId, addresseeId: { in: ids } },
          { addresseeId: viewerProfileId, requesterId: { in: ids } },
        ],
      },
      select: { requesterId: true, addresseeId: true },
    }),
  ]);

  const profileById = new Map(profiles.map((p) => [p.id, p] as const));
  const statusById = new Map(statuses.map((s) => [s.profileId, s] as const));
  const connected = new Set(
    connections.map((c) =>
      c.requesterId === viewerProfileId ? c.addresseeId : c.requesterId,
    ),
  );

  return matches.flatMap((match) => {
    const profile = profileById.get(match.profileId);
    if (!profile) return [];

    const status = statusById.get(match.profileId);
    return [
      {
        ...match,
        username: profile.username,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        bio: profile.bio,
        age:
          profile.privacy?.showExactAge === false
            ? null
            : // Shared with the profile serializer rather than subtracted here.
              // This path had its own copy, so the birth month never reached it
              // and everyone whose birthday had not arrived yet was shown a
              // year too old — on the one screen that puts an age next to a
              // face somebody is deciding whether to message.
              ageFrom(
                profile.user.birthYear,
                profile.user.birthMonth,
                now,
              ),
        locationLabel:
          profile.privacy?.showApproxLocation === false
            ? null
            : (profile.cityLabel ?? profile.regionLabel),
        availability: status
          ? {
              kind: status.kind,
              label: AVAILABILITY_LABELS[status.kind],
              note: status.note,
            }
          : null,
        connected: connected.has(match.profileId),
      },
    ];
  });
}
