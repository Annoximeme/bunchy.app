import { db } from "@/server/db/client";
import { conflict, validationFailed } from "@/server/errors";
import { consume } from "@/server/ratelimit";
import { track } from "@/server/modules/analytics/track";
import { ANALYTICS_EVENTS } from "@/server/modules/analytics/events";
import { notify } from "@/server/modules/notifications/service";
import { findPeople, type FindPeopleResult } from "@/server/modules/discovery/find-people";
import type { ResolvedIntent } from "@/server/modules/intent/resolve";
import { loadMatchProfile } from "@/server/modules/matching/repository";
import { snapToGrid } from "@/server/modules/geo/precision";
import { findPlace } from "@/server/modules/geo/gazetteer";

/**
 * Instant Bunch — "I want to play Warhammer tonight" becomes a group.
 *
 * Two steps, deliberately. `previewInstantBunch` reads the request and shows
 * who it found; `createInstantBunch` acts on a list of people the member picked.
 * They are separate calls because the second one messages a dozen strangers,
 * and §6/§23 are clear that nothing sends invitations without explicit
 * authorisation. Preview never writes; create never guesses who to invite.
 *
 * The group starts as everybody `INVITED` and the creator `ACTIVE` — the same
 * shape as a staff-proposed bunch, for the same reason: a group of people who
 * never agreed to be grouped is not a bunch. What the creator gets immediately
 * is a room with their name on it, not eight people in it.
 *
 * Nothing here is temporary in the database. "A temporary bunch that can become
 * permanent" is a state a member is in, not a column: a bunch nobody accepts
 * has one member and goes quiet, and one that works carries on. Adding a
 * `temporary` flag would mean writing the code that deletes people's groups.
 */

/** A bunch this small is a conversation; the product is built around 5-12. */
const DEFAULT_MAX_MEMBERS = 12;
const MAX_INVITES = 20;

export interface InstantBunchPreview {
  intent: ResolvedIntent;
  /** What the bunch would be called. Editable before creating. */
  suggestedName: string;
  suggestedDescription: string;
  /** Everything `findPeople` returned, including honest empty-state reasons. */
  search: FindPeopleResult;
}

export async function previewInstantBunch(
  profileId: string,
  query: string,
  options: { availableNow?: boolean; withinKm?: number | null; now?: Date } = {},
): Promise<InstantBunchPreview> {
  const now = options.now ?? new Date();

  track({
    name: ANALYTICS_EVENTS.INSTANT_BUNCH_STARTED,
    profileId,
    properties: {},
  });

  const search = await findPeople(profileId, query, {
    availableNow: options.availableNow,
    withinKm: options.withinKm,
    now,
    limit: MAX_INVITES,
  });

  return {
    intent: search.intent,
    suggestedName: suggestName(search.intent),
    suggestedDescription: suggestDescription(search.intent),
    search,
  };
}

export interface CreateInstantBunchInput {
  name: string;
  description: string;
  /** People to invite. May be empty — a bunch of one is a valid starting point. */
  profileIds: string[];
  interestSlugs: string[];
  /** Creates a first activity at this time, when the request named one. */
  startsAt?: Date | null;
  mode?: "ONLINE" | "OFFLINE" | null;
  cityLabel?: string | null;
  countryCode?: string | null;
  maxMembers?: number;
}

export interface CreateInstantBunchResult {
  id: string;
  slug: string;
  invited: number;
  activityId: string | null;
}

export async function createInstantBunch(
  profileId: string,
  input: CreateInstantBunchInput,
): Promise<CreateInstantBunchResult> {
  await consume("bunchCreate", profileId);

  const name = input.name.trim();
  if (name.length < 3) throw validationFailed("Give it a name people will recognise.");

  // The member can edit the time the parser proposed, so it is checked here
  // rather than trusted. A start time in the past creates an activity nobody
  // can attend and a reminder that will never fire; one years out is a typo.
  if (input.startsAt) {
    const ms = input.startsAt.getTime();
    if (!Number.isFinite(ms)) throw validationFailed("That start time isn't valid.");
    if (ms < Date.now() - 60 * 60 * 1000) {
      throw validationFailed("That time has already passed.");
    }
    if (ms > Date.now() + 365 * 24 * 60 * 60 * 1000) {
      throw validationFailed("Pick a time within the next year.");
    }
  }

  const invitees = await invitableProfiles(profileId, input.profileIds);
  const interestIds = await interestIdsFor(input.interestSlugs);

  const place =
    input.cityLabel && input.countryCode
      ? findPlace(input.cityLabel, input.countryCode)
      : undefined;
  const approx = place ? snapToGrid(place.lat, place.lng) : null;

  const maxMembers = Math.max(
    input.maxMembers ?? DEFAULT_MAX_MEMBERS,
    invitees.length + 1,
  );
  const slug = await uniqueSlug(name);

  const bunch = await db.bunch.create({
    data: {
      slug,
      name,
      description: input.description.trim() || name,
      type: input.startsAt ? "ACTIVITY" : "INTEREST",
      // Private: this group was assembled around one person's plan, and the
      // people in it were invited by name. It is not a public room yet.
      visibility: "PRIVATE",
      maxMembers,
      cityLabel: place?.cityLabel ?? input.cityLabel ?? null,
      regionLabel: place?.regionLabel ?? null,
      countryCode: place?.countryCode ?? input.countryCode ?? null,
      approxLat: approx?.approxLat ?? null,
      approxLng: approx?.approxLng ?? null,
      createdById: profileId,
      interests: { create: interestIds.map((interestId) => ({ interestId })) },
      memberships: {
        create: [
          { profileId, role: "OWNER" as const, status: "ACTIVE" as const },
          ...invitees.map((id) => ({
            profileId: id,
            role: "MEMBER" as const,
            status: "INVITED" as const,
          })),
        ],
      },
      messages: {
        create: {
          kind: "SYSTEM",
          body: invitees.length
            ? `${name} was created, and ${invitees.length} ${invitees.length === 1 ? "person was" : "people were"} invited.`
            : `${name} was created.`,
        },
      },
    },
    select: { id: true, slug: true },
  });

  const activityId = input.startsAt
    ? await firstActivity(bunch.id, profileId, name, input, maxMembers)
    : null;

  for (const inviteeId of invitees) {
    await notify({
      profileId: inviteeId,
      type: "BUNCH_INVITE",
      title: `You've been invited to ${name}`,
      body: input.description.trim().slice(0, 160) || "Have a look and decide.",
      linkPath: `/bunches/${bunch.slug}`,
    });
  }

  track({
    name: ANALYTICS_EVENTS.INSTANT_BUNCH_CREATED,
    profileId,
    properties: {
      bunchId: bunch.id,
      invited: invitees.length,
      withActivity: activityId !== null,
    },
  });

  return { id: bunch.id, slug: bunch.slug, invited: invitees.length, activityId };
}

// --- Naming -----------------------------------------------------------------

/**
 * "Warhammer tonight", "Hiking Saturday", "Board games".
 *
 * The member's own words plus the time they named. Falls back to something
 * plain rather than something clever — a bunch called "Let's Connect!" is worse
 * than one called "Saturday plans".
 */
export function suggestName(intent: ResolvedIntent): string {
  const topic = intent.topic ?? intent.interests[0]?.label ?? null;
  const when = intent.when?.label ?? null;

  if (topic && when) return `${topic} ${when.toLowerCase()}`;
  if (topic) return topic;
  if (when) return `${capitalize(when)} plans`;
  return "New bunch";
}

function suggestDescription(intent: ResolvedIntent): string {
  const parts: string[] = [];

  // The topic leads the sentence rather than sitting mid-clause, so its own
  // capitalisation is always correct. "Getting together for warhammer" is what
  // lowercasing produced, and there is no general rule that tells a proper noun
  // from a common one — "Board games" wants lowering, "Warhammer" does not.
  const topic = intent.topic ?? intent.interests[0]?.label;
  parts.push(topic ? `${topic} with a few people.` : "Getting a few people together.");

  if (intent.when) parts.push(`Planned for ${intent.when.label}.`);
  if (intent.place) parts.push(`Around ${intent.place.cityLabel}.`);
  else if (intent.mode === "ONLINE") parts.push("Online.");

  return parts.join(" ");
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// --- Internals --------------------------------------------------------------

/**
 * Filters an invite list down to people who may actually be invited.
 *
 * The client sends ids it got from a search, but a search result is a moment in
 * time — somebody can block you, close their account or switch off bunch
 * invites between seeing the list and pressing the button. Re-checking here
 * rather than trusting the list is the difference between a stale id and an
 * unwanted invitation.
 */
async function invitableProfiles(
  creatorId: string,
  requested: string[],
): Promise<string[]> {
  const unique = [...new Set(requested)].filter((id) => id !== creatorId);
  if (unique.length === 0) return [];
  if (unique.length > MAX_INVITES) {
    throw validationFailed(`You can invite up to ${MAX_INVITES} people at once.`);
  }

  const rows = await db.profile.findMany({
    where: {
      id: { in: unique },
      onboardingStage: "COMPLETE",
      user: { status: "ACTIVE" },
      privacy: { invitableToBunches: true },
      blocksMade: { none: { blockedId: creatorId } },
      blocksReceived: { none: { blockerId: creatorId } },
    },
    select: { id: true },
  });

  return rows.map((r) => r.id);
}

async function interestIdsFor(slugs: string[]): Promise<string[]> {
  if (slugs.length === 0) return [];
  const rows = await db.interest.findMany({
    where: { slug: { in: slugs.map((s) => s.toLowerCase()) } },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

/**
 * The plan, as a real activity rather than a sentence in a description.
 *
 * Going through the Activity model means the reminder job, the participant
 * list and the "an activity changed" notification all work on it for free —
 * and that the time survives as data instead of prose somebody has to re-read.
 */
async function firstActivity(
  bunchId: string,
  organizerId: string,
  name: string,
  input: CreateInstantBunchInput,
  maxParticipants: number,
): Promise<string> {
  const activity = await db.activity.create({
    data: {
      title: name,
      description: input.description.trim() || name,
      startsAt: input.startsAt!,
      mode: input.mode === "ONLINE" ? "ONLINE" : "OFFLINE",
      cityLabel: input.cityLabel ?? null,
      countryCode: input.countryCode ?? null,
      maxParticipants,
      organizerId,
      bunchId,
      // The organiser is going; that is what organising means.
      participants: { create: { profileId: organizerId, status: "JOINED" } },
    },
    select: { id: true },
  });

  track({
    name: ANALYTICS_EVENTS.ACTIVITY_CREATED,
    profileId: organizerId,
    properties: { activityId: activity.id, bunchId, via: "instant_bunch" },
  });

  return activity.id;
}

async function uniqueSlug(name: string): Promise<string> {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "bunch";

  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const taken = await db.bunch.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/** Guards against creating a bunch for somebody who has not finished onboarding. */
export async function assertCanStartBunch(profileId: string): Promise<void> {
  const profile = await loadMatchProfile(profileId);
  if (!profile) throw conflict("Finish setting up your profile first.");
}
