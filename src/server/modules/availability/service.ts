import { db } from "@/server/db/client";
import { AVAILABILITY_LABELS } from "@/lib/availability";
import type { PhraseRef } from "@/lib/i18n/phrase";
import type { AvailabilityKind, AudienceScope } from "@/generated/prisma/enums";
import { forbidden, notFound, validationFailed } from "@/server/errors";
import { track } from "@/server/modules/analytics/track";
import { ANALYTICS_EVENTS } from "@/server/modules/analytics/events";
import { locationLabel } from "@/server/modules/geo/precision";

/**
 * Who's Up, "I'm free, come find me", for a few hours.
 *
 * Three rules hold this feature to the shape §4 asks for, and each is enforced
 * here rather than left to the UI:
 *
 * 1. **It expires, always.** `expiresAt` is computed here, never taken from the
 *    client, and every read filters on it. There is no code path that writes a
 *    status without an expiry. A member may now choose a shorter or longer life
 *    from a fixed list, but only within twice the kind's own default, a
 *    week-long "free now" is a profile field pretending to be a status.
 * 2. **It is one row.** The table is keyed on the profile, so setting a status
 *    replaces the previous one. Nothing accumulates, which means there is no
 *    history of when this person was at a loose end, the permanent
 *    availability record the brief rules out cannot be built from this table
 *    because the table does not keep one.
 * 3. **Counts and names are different questions.** An aggregate ("8 people near
 *    Antwerp") is visible broadly and suppressed below a threshold; a *name* is
 *    visible only to the audience the member chose.
 *
 * Location never gets more precise than the city label the profile already
 * shows in Discover. There is no live position here to leak.
 */

/** How long each kind of status stays live, in hours. */
const LIFETIME_HOURS: Record<AvailabilityKind, number> = {
  FREE_NOW: 3,
  FREE_TONIGHT: 8,
  FREE_THIS_WEEKEND: 48,
  LOOKING_FOR_SOMETHING: 12,
  LOOKING_FOR_PEOPLE: 24,
  UP_FOR_GAMING: 6,
  UP_FOR_ACTIVITIES: 24,
  OPEN_TO_MEETING: 24,
  UP_FOR_FOOD: 6,
  UP_FOR_SPORTS: 12,
  UP_FOR_NIGHTLIFE: 8,
  UP_FOR_SPONTANEOUS: 4,
};

/**
 * Bunchy Now lets a member choose how long the status lives, within limits.
 *
 * The kind still sets the default, and the ceiling is still the kind's own
 * lifetime doubled, "free now" cannot be stretched into a week, because a
 * week-long "free now" is a profile field pretending to be a status, and the
 * whole point of this table is that everything in it goes away.
 */
export const CUSTOM_HOURS = [1, 3, 6, 12, 24, 48] as const;

function lifetimeFor(kind: AvailabilityKind, requested?: number | null): number {
  const base = LIFETIME_HOURS[kind];
  if (!requested) return base;
  const allowed = CUSTOM_HOURS.filter((h) => h <= base * 2);
  return allowed.includes(requested as (typeof CUSTOM_HOURS)[number])
    ? requested
    : base;
}

/**
 * Below this many people, a cluster is not a crowd, it is one or two
 * identifiable members plus a location. "1 person in Turnhout is up for gaming"
 * combined with a Discover search names them, so counts under this are not
 * published at all.
 */
export const MIN_CLUSTER = 3;

const MAX_NOTE = 140;

export interface SetStatusInput {
  kind: AvailabilityKind;
  /** Hours, from CUSTOM_HOURS. Anything else falls back to the kind's default. */
  expiresInHours?: number | null;
  note?: string | null;
  interestIds?: string[];
  mode?: "ONLINE" | "OFFLINE" | null;
}

export interface AvailabilityStatusView {
  kind: AvailabilityKind;
  /** Where the words are; the caller knows the language. */
  label: PhraseRef;
  note: string | null;
  interests: Array<{ id: string; label: string }>;
  mode: "ONLINE" | "OFFLINE" | null;
  expiresAt: Date;
}

export { AVAILABILITY_LABELS } from "@/lib/availability";

/**
 * The three horizons Bunchy Now filters on.
 *
 * Derived from the kind rather than stored, because a member picking "free
 * tonight" has already said when, asking again would be a second question with
 * the same answer.
 */
export const HORIZON_KINDS = {
  now: ["FREE_NOW", "UP_FOR_SPONTANEOUS", "LOOKING_FOR_SOMETHING"],
  tonight: ["FREE_TONIGHT", "UP_FOR_FOOD", "UP_FOR_NIGHTLIFE", "UP_FOR_GAMING"],
  weekend: ["FREE_THIS_WEEKEND", "UP_FOR_SPORTS", "UP_FOR_ACTIVITIES"],
} as const satisfies Record<string, readonly AvailabilityKind[]>;

export type Horizon = keyof typeof HORIZON_KINDS;

/**
 * Sets or replaces the member's status.
 *
 * The expiry is ours, not theirs. A client that could name its own would
 * eventually name one a year out, and the guarantee that this data is
 * short-lived is the reason the feature is defensible at all.
 */
export async function setAvailability(
  profileId: string,
  input: SetStatusInput,
  now = new Date(),
): Promise<AvailabilityStatusView> {
  const note = input.note?.trim() ?? null;
  if (note && note.length > MAX_NOTE) {
    throw validationFailed(`Keep it under ${MAX_NOTE} characters.`);
  }

  const interestIds = await validInterestIds(input.interestIds ?? []);
  const expiresAt = new Date(
    now.getTime() + lifetimeFor(input.kind, input.expiresInHours) * 3_600_000,
  );

  const row = await db.availabilityStatus.upsert({
    where: { profileId },
    create: {
      profileId,
      kind: input.kind,
      note: note || null,
      interestIds,
      mode: input.mode ?? null,
      expiresAt,
    },
    update: {
      kind: input.kind,
      note: note || null,
      interestIds,
      mode: input.mode ?? null,
      expiresAt,
    },
    select: { kind: true, note: true, interestIds: true, mode: true, expiresAt: true },
  });

  track({
    name: ANALYTICS_EVENTS.AVAILABILITY_SET,
    profileId,
    // The kind, not the note: the note is the member's own words about their
    // evening and has no business in an analytics table.
    properties: { kind: row.kind, hasNote: note !== null, interests: interestIds.length },
  });

  return decorate(row, await interestLabels(interestIds));
}

/** Ends the status now. Idempotent, clearing an absent status is not an error. */
export async function clearAvailability(profileId: string): Promise<void> {
  await db.availabilityStatus.deleteMany({ where: { profileId } });
  track({
    name: ANALYTICS_EVENTS.AVAILABILITY_CLEARED,
    profileId,
    properties: {},
  });
}

/** The member's own live status, if any. */
export async function myAvailability(
  profileId: string,
  now = new Date(),
): Promise<AvailabilityStatusView | null> {
  const row = await db.availabilityStatus.findFirst({
    where: { profileId, expiresAt: { gt: now } },
    select: { kind: true, note: true, interestIds: true, mode: true, expiresAt: true },
  });
  if (!row) return null;
  return decorate(row, await interestLabels(row.interestIds));
}

// --- Visibility -------------------------------------------------------------

/**
 * Whose statuses this viewer is allowed to see by name.
 *
 * Returns a Prisma condition rather than a list of ids, so the check lands in
 * the same query as everything else instead of being applied after the fact,
 * a filter that runs in application code is a filter somebody eventually
 * forgets to call.
 *
 * The scopes mean what they already mean elsewhere in the product (see
 * `satisfiesAudience` in the connections service), which is worth stating
 * because one of them is not what it looks like: CONNECTIONS is *friend of a
 * friend*, not "people I am connected to". Implementing it as direct
 * connections here would have given one enum value two meanings depending on
 * which screen you set it from. Direct connections are folded in as well,
 * somebody whose request you accepted seeing that you are free is the least
 * surprising thing this feature can do.
 */
/**
 * The audience test, as a condition on the *profile*.
 *
 * Needed in two shapes. Reading statuses, it hangs off the status row,
 * that is `visibleStatusCondition` below. Selecting *people who are
 * available*, it has to apply to the profile itself, because a filter that
 * only checks "has a live status" returns members whose audience excludes
 * the viewer. Their badge is then hidden, and their presence in a list
 * headed "free right now" discloses exactly what the audience setting exists
 * to keep private.
 */
export function availabilityAudienceCondition(viewerProfileId: string) {
  const connectedToViewer = {
    OR: [
      { sentConnections: { some: { addresseeId: viewerProfileId, status: "ACCEPTED" as const } } },
      { receivedConnections: { some: { requesterId: viewerProfileId, status: "ACCEPTED" as const } } },
    ],
  };

  return {
    OR: [
      { privacy: { is: { whoCanSeeAvailability: "EVERYONE" as AudienceScope } } },
      {
        privacy: { is: { whoCanSeeAvailability: "CONNECTIONS" as AudienceScope } },
        OR: [
          // Connected to the viewer directly…
          ...connectedToViewer.OR,
          // …or connected to somebody who is.
          {
            sentConnections: {
              some: { status: "ACCEPTED" as const, addressee: connectedToViewer },
            },
          },
          {
            receivedConnections: {
              some: { status: "ACCEPTED" as const, requester: connectedToViewer },
            },
          },
        ],
      },
      {
        privacy: { is: { whoCanSeeAvailability: "BUNCH_MEMBERS" as AudienceScope } },
        bunchMemberships: {
          some: {
            status: "ACTIVE" as const,
            bunch: {
              memberships: {
                some: { profileId: viewerProfileId, status: "ACTIVE" as const },
              },
            },
          },
        },
      },
      // A member with no privacy row at all has never been offered the
      // choice, so they are treated as the default the column carries.
      { privacy: { is: null } },
    ],
  };
}

/** The same test, shaped for a query over AvailabilityStatus rows. */
export function visibleStatusCondition(viewerProfileId: string) {
  return { profile: availabilityAudienceCondition(viewerProfileId) };
}

// --- Aggregates -------------------------------------------------------------

export interface AvailabilityCluster {
  /** A city label, never coordinates. */
  where: string;
  kind: AvailabilityKind;
  /** Where the words are. The reader's language is not this module's business. */
  label: PhraseRef;
  count: number;
}

/**
 * "8 people near Antwerp are up for something tonight."
 *
 * Counts only, no names, and nothing below `MIN_CLUSTER`, a count of one is a
 * person, not a statistic. Members who chose NOBODY are excluded entirely
 * rather than counted anonymously: they asked not to be part of this.
 */
export async function availabilityClusters(
  viewerProfileId: string,
  options: { countryCode?: string | null; now?: Date } = {},
): Promise<AvailabilityCluster[]> {
  const now = options.now ?? new Date();

  const rows = await db.availabilityStatus.findMany({
    where: {
      expiresAt: { gt: now },
      profileId: { not: viewerProfileId },
      profile: {
        privacy: {
          is: {
            discoverable: true,
            whoCanSeeAvailability: { not: "NOBODY" },
          },
        },
        blocksMade: { none: { blockedId: viewerProfileId } },
        blocksReceived: { none: { blockerId: viewerProfileId } },
        ...(options.countryCode ? { countryCode: options.countryCode } : {}),
      },
    },
    select: {
      kind: true,
      profile: {
        select: { cityLabel: true, regionLabel: true, countryCode: true },
      },
    },
  });

  const counts = new Map<string, AvailabilityCluster>();
  for (const row of rows) {
    const where = locationLabel(row.profile);
    const key = `${where}::${row.kind}`;
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, {
        where,
        kind: row.kind,
        label: AVAILABILITY_LABELS[row.kind],
        count: 1,
      });
    }
  }

  return [...counts.values()]
    .filter((cluster) => cluster.count >= MIN_CLUSTER)
    .sort((a, b) => b.count - a.count);
}

// --- Internals --------------------------------------------------------------

/** Drops ids that are not real interests, rather than storing them. */
async function validInterestIds(ids: string[]): Promise<string[]> {
  const unique = [...new Set(ids)].slice(0, 8);
  if (unique.length === 0) return [];

  const rows = await db.interest.findMany({
    where: { id: { in: unique } },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

async function interestLabels(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const rows = await db.interest.findMany({
    where: { id: { in: ids } },
    select: { id: true, label: true },
  });
  return new Map(rows.map((r) => [r.id, r.label] as const));
}

function decorate(
  row: {
    kind: AvailabilityKind;
    note: string | null;
    interestIds: string[];
    mode: "ONLINE" | "OFFLINE" | null;
    expiresAt: Date;
  },
  labels: Map<string, string>,
): AvailabilityStatusView {
  return {
    kind: row.kind,
    label: AVAILABILITY_LABELS[row.kind],
    note: row.note,
    interests: row.interestIds.flatMap((id) => {
      const label = labels.get(id);
      return label ? [{ id, label }] : [];
    }),
    mode: row.mode,
    expiresAt: row.expiresAt,
  };
}

/**
 * Deletes statuses that ran out.
 *
 * Not required for correctness, every read filters on `expiresAt`, but a
 * member who set a status on Friday should not find the row still sitting in an
 * export or a database dump on Monday. Data that has served its purpose is
 * deleted rather than merely ignored.
 */
export async function purgeExpiredAvailability(now = new Date()): Promise<number> {
  const { count } = await db.availabilityStatus.deleteMany({
    where: { expiresAt: { lte: now } },
  });
  return count;
}

/** Guards a caller that must own the status it is touching. */
export async function requireOwnStatus(profileId: string): Promise<void> {
  const exists = await db.availabilityStatus.findUnique({
    where: { profileId },
    select: { profileId: true },
  });
  if (!exists) throw notFound("You don't have a status set.");
}

/** Whether this member has switched Who's Up off entirely. */
export async function availabilityDisabled(profileId: string): Promise<boolean> {
  const privacy = await db.privacySettings.findUnique({
    where: { profileId },
    select: { whoCanSeeAvailability: true },
  });
  return privacy?.whoCanSeeAvailability === "NOBODY";
}

/** Throws when the member has the feature off. Keeps routes from writing dead rows. */
export async function assertAvailabilityEnabled(profileId: string): Promise<void> {
  if (await availabilityDisabled(profileId)) {
    throw forbidden(
      "Who's Up is switched off for your account. Turn it back on in privacy settings.",
    );
  }
}
