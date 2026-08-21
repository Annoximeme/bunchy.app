import { db } from "@/server/db/client";
import { forbidden, notFound, validationFailed } from "@/server/errors";
import { consume } from "@/server/ratelimit";
import type { SeriesCadence } from "@/generated/prisma/enums";

/**
 * Rituals: the thing a group does again and again.
 *
 * ## What this is for
 *
 * The product could describe one Thursday and not "our Thursday". A group that
 * met weekly recreated the activity weekly, and the only record that these were
 * the same people doing the same thing lived in their heads. That is the
 * difference between a calendar entry and a standing arrangement, and the
 * second is the one worth building: somebody returns because their people are
 * there on Thursday, not because the product asked them to.
 *
 * Which is also the line this feature must not cross. Nothing here notifies
 * anybody to come back, counts consecutive weeks at a person, or rewards
 * turning up. An occurrence appears because the group has one, and the existing
 * activity reminder covers it exactly as it covers a one-off.
 *
 * ## Membership and attendance are different promises
 *
 * Holding the series says "this is my Thursday". Joining an occurrence says "I
 * am coming this week". Somebody can hold the ritual and miss a week without
 * leaving, which is how a standing arrangement actually works, so the two are
 * separate tables and a missed week is not an exit.
 */

/** How far ahead an occurrence is materialised. */
export const HORIZON_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The next instant a cadence lands on, given the one before it.
 *
 * Pure, exported and tested on its own, because it is the only arithmetic in
 * the feature and every bug a recurring system has is in here.
 *
 * Weekly and fortnightly are exact multiples of a day, and are added in UTC so
 * a fortnight is always fourteen days. Monthly is not a fixed length, so it
 * moves the calendar month and then clamps: the 31st of a month followed by a
 * 30-day month lands on the 30th rather than silently skipping to the 1st,
 * which is the classic recurring-event bug. Once clamped it does not "remember"
 * the 31st, because a ritual that jumps between the 30th and the 31st is not a
 * ritual anybody can plan around.
 */
export function nextOccurrence(from: Date, cadence: SeriesCadence): Date {
  if (cadence === "WEEKLY") return new Date(from.getTime() + 7 * DAY_MS);
  if (cadence === "BIWEEKLY") return new Date(from.getTime() + 14 * DAY_MS);

  const year = from.getUTCFullYear();
  const month = from.getUTCMonth();
  const day = from.getUTCDate();

  // Day 0 of the following month is the last day of the target month.
  const lastOfTarget = new Date(Date.UTC(year, month + 2, 0)).getUTCDate();

  return new Date(
    Date.UTC(
      year,
      month + 1,
      Math.min(day, lastOfTarget),
      from.getUTCHours(),
      from.getUTCMinutes(),
      from.getUTCSeconds(),
    ),
  );
}

/**
 * Catch a series up to now, without materialising the past.
 *
 * A series whose organiser went quiet for two months should not wake up and
 * create eight activities that already happened. This walks the cadence forward
 * until the next occurrence is genuinely ahead, and the caller materialises
 * from there.
 *
 * The step ceiling is a guard rather than a limit anybody reaches: a corrupt
 * `nextAt` far in the past with a weekly cadence would otherwise spin.
 */
export function advanceToFuture(
  nextAt: Date,
  cadence: SeriesCadence,
  now: Date,
  maxSteps = 500,
): Date {
  let at = nextAt;
  for (let i = 0; i < maxSteps && at <= now; i += 1) {
    at = nextOccurrence(at, cadence);
  }
  return at;
}

export interface CreateSeriesInput {
  title: string;
  description: string;
  cadence: SeriesCadence;
  /** When the first occurrence starts. */
  startsAt: Date;
  durationMinutes?: number | null;
  mode?: "ONLINE" | "OFFLINE";
  locationLabel?: string | null;
  onlineUrl?: string | null;
  maxParticipants?: number;
  bunchId?: string | null;
}

/**
 * Start a ritual.
 *
 * Rate limited on `activityCreate` rather than a rule of its own. A series is
 * a promise to create many activities, so if anything it deserves the tighter
 * ceiling, and inventing a second budget for the same act is how two limits
 * drift apart.
 */
export async function createSeries(
  organizerId: string,
  input: CreateSeriesInput,
) {
  if (input.startsAt.getTime() <= Date.now()) {
    throw validationFailed(
      "A ritual starts on its first evening, which has to be ahead of now. Pick a date in the future.",
    );
  }

  if (input.bunchId) {
    const membership = await db.bunchMembership.findFirst({
      where: { bunchId: input.bunchId, profileId: organizerId, status: "ACTIVE" },
      select: { profileId: true },
    });
    if (!membership) {
      throw forbidden("You can only start a ritual in a bunch you are in.");
    }
  }

  await consume("activityCreate", organizerId);

  const series = await db.activitySeries.create({
    data: {
      title: input.title,
      description: input.description,
      cadence: input.cadence,
      nextAt: input.startsAt,
      durationMinutes: input.durationMinutes ?? null,
      mode: input.mode ?? "OFFLINE",
      locationLabel: input.locationLabel ?? null,
      onlineUrl: input.onlineUrl ?? null,
      maxParticipants: input.maxParticipants ?? 8,
      organizerId,
      bunchId: input.bunchId ?? null,
      // The organiser holds their own ritual. Anything else would let somebody
      // start a Thursday they are not part of.
      members: { create: { profileId: organizerId } },
    },
    select: { id: true },
  });

  return series;
}

/** Take on a standing arrangement. */
export async function joinSeries(seriesId: string, profileId: string) {
  const series = await db.activitySeries.findUnique({
    where: { id: seriesId },
    select: { id: true, endedAt: true },
  });
  if (!series) throw notFound("There is no such ritual.");
  if (series.endedAt) throw validationFailed("That ritual has ended.");

  await db.activitySeriesMember.upsert({
    where: { seriesId_profileId: { seriesId, profileId } },
    create: { seriesId, profileId },
    update: {},
  });
}

/**
 * Step out of a ritual.
 *
 * Leaves any occurrence already joined alone. Somebody who steps out of the
 * standing arrangement may still be coming this Thursday, and cancelling their
 * attendance for them would be the product deciding what they meant.
 */
export async function leaveSeries(seriesId: string, profileId: string) {
  await db.activitySeriesMember.deleteMany({ where: { seriesId, profileId } });
}

/** End the ritual. The row and every occurrence it produced stay. */
export async function endSeries(seriesId: string, profileId: string) {
  const series = await db.activitySeries.findUnique({
    where: { id: seriesId },
    select: { organizerId: true },
  });
  if (!series) throw notFound("There is no such ritual.");
  if (series.organizerId !== profileId) {
    throw forbidden("Only whoever started a ritual can end it.");
  }
  await db.activitySeries.update({
    where: { id: seriesId },
    data: { endedAt: new Date() },
  });
}

export interface MaterialiseResult {
  created: number;
  advanced: number;
}

/**
 * Turn the rituals that are due into real activities.
 *
 * Runs from `run-jobs.ts`. Convergent rather than idempotent, and the
 * difference is worth stating because a probe caught me claiming the wrong
 * one: each pass materialises the next occurrence that falls inside the
 * horizon and advances `nextAt` by one cadence step, so repeated passes keep
 * going until the horizon is full and then do nothing. A weekly series three
 * days out produces two occurrences over two passes, a week apart, which is
 * the fortnight of visibility the horizon exists to give.
 *
 * It creates no duplicates under repetition because `nextAt` moves in the same
 * transaction as the occurrence. It is not safe under genuine concurrency: the
 * read happens outside that transaction, so two workers starting together
 * could both see the same `nextAt` and both write it. `run-jobs.ts` is a single
 * cron process by design, for exactly this class of reason. A second runner
 * would need a row lock here first.
 *
 * Members of the series are added to the occurrence as participants, because
 * holding the ritual is the RSVP. That is the whole point of the distinction:
 * you say "Thursdays" once rather than every week.
 */
export async function materialiseDueOccurrences(
  now = new Date(),
): Promise<MaterialiseResult> {
  const horizon = new Date(now.getTime() + HORIZON_DAYS * DAY_MS);

  const due = await db.activitySeries.findMany({
    where: { endedAt: null, nextAt: { lte: horizon } },
    select: {
      id: true,
      title: true,
      description: true,
      cadence: true,
      nextAt: true,
      durationMinutes: true,
      mode: true,
      locationLabel: true,
      onlineUrl: true,
      maxParticipants: true,
      organizerId: true,
      bunchId: true,
      members: { select: { profileId: true } },
    },
  });

  const result: MaterialiseResult = { created: 0, advanced: 0 };

  for (const series of due) {
    // A series left alone for months must not backfill evenings that have
    // already been and gone.
    const startsAt =
      series.nextAt > now
        ? series.nextAt
        : advanceToFuture(series.nextAt, series.cadence, now);

    if (startsAt > horizon) {
      // Catching up moved it past the horizon. Record the new position and
      // leave the occurrence for a later pass.
      await db.activitySeries.update({
        where: { id: series.id },
        data: { nextAt: startsAt },
      });
      result.advanced += 1;
      continue;
    }

    const endsAt = series.durationMinutes
      ? new Date(startsAt.getTime() + series.durationMinutes * 60_000)
      : null;

    await db.$transaction([
      db.activity.create({
        data: {
          title: series.title,
          description: series.description,
          startsAt,
          endsAt,
          mode: series.mode,
          locationLabel: series.locationLabel,
          onlineUrl: series.onlineUrl,
          maxParticipants: series.maxParticipants,
          organizerId: series.organizerId,
          bunchId: series.bunchId,
          seriesId: series.id,
          participants: {
            create: series.members.map((m) => ({
              profileId: m.profileId,
              status: "JOINED" as const,
            })),
          },
        },
      }),
      db.activitySeries.update({
        where: { id: series.id },
        data: { nextAt: nextOccurrence(startsAt, series.cadence) },
      }),
    ]);

    result.created += 1;
  }

  return result;
}

/**
 * What this member has coming, ritual or otherwise.
 *
 * The data behind "Your Week". One query over activities they have joined
 * rather than a union of series and one-offs, because a materialised occurrence
 * *is* an activity: the surface should not care which of the two produced it,
 * and a member does not think of Thursday as a different kind of thing because
 * it repeats.
 */
export async function upcomingForProfile(
  profileId: string,
  days = 7,
  now = new Date(),
) {
  const until = new Date(now.getTime() + days * DAY_MS);

  const rows = await db.activityParticipant.findMany({
    where: {
      profileId,
      status: "JOINED",
      activity: {
        status: "SCHEDULED",
        startsAt: { gte: now, lte: until },
      },
    },
    orderBy: { activity: { startsAt: "asc" } },
    select: {
      activity: {
        select: {
          id: true,
          title: true,
          startsAt: true,
          mode: true,
          locationLabel: true,
          seriesId: true,
          bunch: { select: { slug: true, name: true } },
          _count: { select: { participants: true } },
        },
      },
    },
  });

  return rows.map((row) => ({
    ...row.activity,
    going: row.activity._count.participants,
    /** Whether this is part of a standing arrangement, for the label. */
    recurring: row.activity.seriesId !== null,
  }));
}
