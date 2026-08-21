import { db } from "@/server/db/client";
import { validationFailed } from "@/server/errors";
import { consume } from "@/server/ratelimit";

/**
 * Quick calls: "anyone want to play right now".
 *
 * ## What this is, and what it deliberately is not
 *
 * Not a temporary bunch. `instant.ts` already refused that, and gave the
 * reason: "a temporary bunch that can become permanent is a state a member is
 * in, not a column, and adding a `temporary` flag would mean writing the code
 * that deletes people's groups." That reasoning still holds and this does not
 * touch it.
 *
 * What was missing is the other half. `Availability` already says "I am up for
 * gaming until eight", and it already expires, but nobody can *join* it: it is
 * a status other people can only reply to one at a time. A quick call is the
 * same impulse pointed outward, an offer with a slot count that somebody can
 * simply take up.
 *
 * So it is an `Activity`, which already has participants, joining, capacity,
 * chat through its bunch and a place in discovery. The only new thing is
 * `expiresAt`, and expiry sets a status rather than deleting a row. Nobody's
 * evening disappears; an offer nobody answered just stops being open.
 *
 * ## Why the defaults are aggressive
 *
 * Somebody making one of these is bored now. Every question asked is a reason
 * to close the app instead, so the shape is: what, when, how many. Everything
 * else is inferred, and the window closes on its own so nobody has to remember
 * to tidy up after themselves.
 */

/** How long an unanswered call stays open when nobody says otherwise. */
export const DEFAULT_WINDOW_MINUTES = 180;

/** Beyond this it is not a quick call, it is a plan, and should be made as one. */
export const MAX_WINDOW_MINUTES = 12 * 60;

export interface QuickCallInput {
  title: string;
  /** When it would happen. Defaults to the moment it is posted. */
  startsAt?: Date;
  /** How long the offer stays open. */
  windowMinutes?: number;
  maxParticipants?: number;
  mode?: "ONLINE" | "OFFLINE";
  locationLabel?: string | null;
  onlineUrl?: string | null;
}

export async function createQuickCall(profileId: string, input: QuickCallInput) {
  const now = new Date();
  const windowMinutes = input.windowMinutes ?? DEFAULT_WINDOW_MINUTES;

  if (windowMinutes < 15 || windowMinutes > MAX_WINDOW_MINUTES) {
    throw validationFailed(
      "A quick call stays open for somewhere between a quarter of an hour and half a day. For anything longer, plan it properly.",
    );
  }

  const startsAt = input.startsAt ?? now;
  const expiresAt = new Date(now.getTime() + windowMinutes * 60_000);

  if (startsAt.getTime() > expiresAt.getTime()) {
    throw validationFailed(
      "That starts after the call closes. Either bring it forward or leave the window open longer.",
    );
  }

  // The same budget as any other activity. A quick call is cheaper to make, so
  // if anything it needs the ceiling more, and a second rule for the same act
  // is how two limits drift apart.
  await consume("activityCreate", profileId);

  return db.activity.create({
    data: {
      title: input.title,
      // Not asked for. A description is a paragraph somebody writes instead of
      // going and doing the thing, and the title already says what it is.
      description: input.title,
      startsAt,
      expiresAt,
      mode: input.mode ?? "ONLINE",
      locationLabel: input.locationLabel ?? null,
      onlineUrl: input.onlineUrl ?? null,
      maxParticipants: input.maxParticipants ?? 6,
      organizerId: profileId,
      // Whoever asked is in it. An offer with nobody in it is not an offer.
      participants: { create: { profileId, status: "JOINED" } },
    },
    select: { id: true, expiresAt: true },
  });
}

export interface ExpiryResult {
  expired: number;
}

/**
 * Close the calls nobody took up.
 *
 * Runs hourly from `run-jobs.ts`. Only touches calls that are still
 * `SCHEDULED`, past their window, and have nobody in them but the person who
 * asked: one other person joining makes it a real plan between two people, and
 * closing that because a clock ran out would be the product cancelling somebody
 * else's evening.
 *
 * Idempotent, unlike the series job: the update filters on `status:
 * "SCHEDULED"`, so a second pass matches nothing.
 */
export async function expireStaleCalls(now = new Date()): Promise<ExpiryResult> {
  const stale = await db.activity.findMany({
    where: {
      status: "SCHEDULED",
      expiresAt: { not: null, lte: now },
    },
    select: {
      id: true,
      organizerId: true,
      participants: {
        where: { status: "JOINED" },
        select: { profileId: true },
        take: 2,
      },
    },
  });

  const unanswered = stale.filter(
    (a) =>
      a.participants.length === 0 ||
      (a.participants.length === 1 &&
        a.participants[0]!.profileId === a.organizerId),
  );

  if (unanswered.length === 0) return { expired: 0 };

  const { count } = await db.activity.updateMany({
    where: { id: { in: unanswered.map((a) => a.id) }, status: "SCHEDULED" },
    data: { status: "EXPIRED" },
  });

  return { expired: count };
}

/**
 * Calls that are still open, newest first.
 *
 * Newest rather than best-matched, and that is the point of the surface. This
 * is what is happening in the next few hours, and freshness is the whole signal:
 * a call posted four minutes ago is more likely to still be true than a better
 * matched one posted this morning. Ranked discovery already exists elsewhere
 * and does the other job well.
 */
export async function openCalls(viewerProfileId: string, limit = 8) {
  const now = new Date();

  const rows = await db.activity.findMany({
    where: {
      status: "SCHEDULED",
      expiresAt: { not: null, gt: now },
      // Not the ones they are already in. Somebody who has answered a call does
      // not need to be offered it again.
      participants: { none: { profileId: viewerProfileId, status: "JOINED" } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      startsAt: true,
      expiresAt: true,
      mode: true,
      locationLabel: true,
      maxParticipants: true,
      organizer: { select: { username: true, displayName: true, avatarUrl: true } },
      _count: { select: { participants: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    startsAt: row.startsAt,
    expiresAt: row.expiresAt!,
    mode: row.mode,
    locationLabel: row.locationLabel,
    going: row._count.participants,
    spotsLeft: Math.max(0, row.maxParticipants - row._count.participants),
    organizer: row.organizer,
  }));
}
