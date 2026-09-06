import { db } from "@/server/db/client";
import { conflict, forbidden, notFound } from "@/server/errors";
import { notify } from "@/server/modules/notifications/service";
import { promoteFromWaitlist } from "@/server/modules/activities/service";
import { track } from "@/server/modules/analytics/track";
import { ANALYTICS_EVENTS } from "@/server/modules/analytics/events";

/**
 * Whether the people who said they were coming are actually coming.
 *
 * ## The problem, and the thing this deliberately is not
 *
 * An evening for six where three people quietly do not turn up is how offline
 * plans die, and the product had nothing between joining and being asked
 * afterwards whether you went.
 *
 * The obvious fix is a reliability score, and `hosting.ts` already argues
 * against it: `ActivityOutcome.attended` is somebody's own answer about
 * themselves, publishing a number derived from self-report is both weak and
 * trivially gameable, and a trust signal that can be typed into existence is
 * worse than none because it looks like proof. Nothing here scores anybody.
 *
 * What is here is two pieces of scheduling.
 *
 * **A confirmation round.** The day before, everybody holding a seat on an
 * activity where seats are scarce is asked whether they are still coming. A
 * seat nobody confirms goes back to the room a few hours before the start, and
 * the waitlist promotes into it through exactly the same path as somebody
 * leaving. That is a decision about a chair, not a verdict about a person, and
 * the status it writes says so: RELEASED rather than LEFT.
 *
 * **A door.** The host opens check-in when they arrive, and people tap in
 * while they are there. That turns attendance from a self-report into
 * something recorded at the time and place, which is the corroboration
 * `hosting.ts` names as the missing half of its evidence.
 */

/** Asked this far ahead, so somebody has an evening to answer. */
const ASK_LEAD_HOURS = 24;

/**
 * And never asked later than this, because the whole bargain is that a seat is
 * released if nobody answers, and releasing a seat somebody had four hours to
 * confirm is a trap rather than a round.
 */
const RELEASE_HOURS = 6;

/**
 * Below this many seats, nobody is asked anything.
 *
 * A coffee for two does not need a confirmation round: the other person is
 * sitting in a conversation with you, and a notification asking whether you
 * still mean it is the product being anxious on your behalf. Scarcity is what
 * makes an unconfirmed seat cost somebody something, so scarcity is the test.
 */
const SMALL_ENOUGH_TO_LEAVE_ALONE = 4;

/** From half an hour before the start until well after it has ended. */
const CHECK_IN_OPENS_MINUTES_BEFORE = 30;
const CHECK_IN_CLOSES_HOURS_AFTER = 6;

const HOUR_MS = 3_600_000;

/**
 * Whether this activity's seats are worth confirming.
 *
 * Pure, and separate from the query that finds candidates, because it is the
 * rule rather than the plumbing and it is the part worth testing exhaustively.
 */
export function needsConfirmation(activity: {
  seatsTaken: number;
  waitlisted: number;
}): boolean {
  if (activity.waitlisted > 0) return true;
  return activity.seatsTaken >= SMALL_ENOUGH_TO_LEAVE_ALONE;
}

/**
 * Asks everybody holding a seat whether they are still coming.
 *
 * Once per activity, guarded by `confirmationsAskedAt` rather than by a group
 * key, because the round is a property of the activity: an hourly job that
 * overlaps a deploy must not ask twice, and the timestamp is also what the
 * release pass reads to know a round actually happened.
 *
 * The organiser is not asked. They are the person opening the door.
 */
export async function askForConfirmations(now = new Date()): Promise<number> {
  const activities = await db.activity.findMany({
    where: {
      status: "SCHEDULED",
      confirmationsAskedAt: null,
      startsAt: {
        gt: new Date(now.getTime() + RELEASE_HOURS * HOUR_MS),
        lte: new Date(now.getTime() + ASK_LEAD_HOURS * HOUR_MS),
      },
    },
    select: {
      id: true,
      title: true,
      organizerId: true,
      participants: {
        where: { status: { in: ["JOINED", "WAITLISTED"] } },
        select: { profileId: true, status: true, guests: true },
      },
    },
  });

  let asked = 0;
  for (const activity of activities) {
    const joined = activity.participants.filter((p) => p.status === "JOINED");
    const seatsTaken = joined.reduce((sum, p) => sum + 1 + p.guests, 0);
    const waitlisted = activity.participants.filter(
      (p) => p.status === "WAITLISTED",
    ).length;

    if (!needsConfirmation({ seatsTaken, waitlisted })) continue;

    for (const participant of joined) {
      if (participant.profileId === activity.organizerId) continue;
      await notify({
        profileId: participant.profileId,
        type: "ACTIVITY_REMINDER",
        title: `Still coming to ${activity.title}?`,
        body:
          waitlisted > 0
            ? "Someone is waiting for a seat, so say either way."
            : "Confirm your seat, or let it go back to the room.",
        linkPath: `/activities/${activity.id}`,
        groupKey: `activity-confirm:${activity.id}`,
      });
      asked += 1;
    }

    await db.activity.update({
      where: { id: activity.id },
      data: { confirmationsAskedAt: now },
    });
  }

  return asked;
}

/**
 * Returns unconfirmed seats to the room, and fills them from the waitlist.
 *
 * The organiser keeps their seat without confirming, and so does anybody who
 * joined after the round went out: they cannot have been asked, so they cannot
 * have failed to answer.
 */
export async function releaseUnconfirmedSeats(now = new Date()): Promise<number> {
  const activities = await db.activity.findMany({
    where: {
      status: "SCHEDULED",
      confirmationsAskedAt: { not: null },
      seatsReleasedAt: null,
      startsAt: { gt: now, lte: new Date(now.getTime() + RELEASE_HOURS * HOUR_MS) },
    },
    select: {
      id: true,
      title: true,
      organizerId: true,
      confirmationsAskedAt: true,
      participants: {
        where: { status: "JOINED", confirmedAt: null },
        select: { profileId: true, joinedAt: true },
      },
    },
  });

  let released = 0;
  for (const activity of activities) {
    for (const participant of activity.participants) {
      if (participant.profileId === activity.organizerId) continue;
      // Joined after the asking, so never asked.
      if (
        activity.confirmationsAskedAt &&
        participant.joinedAt > activity.confirmationsAskedAt
      ) {
        continue;
      }

      await db.activityParticipant.update({
        where: {
          activityId_profileId: {
            activityId: activity.id,
            profileId: participant.profileId,
          },
        },
        data: { status: "RELEASED" },
      });

      await notify({
        profileId: participant.profileId,
        type: "ACTIVITY_CHANGED",
        title: `Your seat for ${activity.title} went back`,
        body: "Nobody heard either way, so it went to whoever was waiting. Join again if you can still make it.",
        linkPath: `/activities/${activity.id}`,
      });

      // One freed seat, filled the same way as a seat somebody left.
      await promoteFromWaitlist(activity.id, activity.title);
      released += 1;
    }

    await db.activity.update({
      where: { id: activity.id },
      data: { seatsReleasedAt: now },
    });
  }

  return released;
}

/** "Yes, still coming." */
export async function confirmSeat(
  activityId: string,
  profileId: string,
  now = new Date(),
): Promise<void> {
  const entry = await db.activityParticipant.findUnique({
    where: { activityId_profileId: { activityId, profileId } },
    select: { status: true },
  });
  if (!entry) throw notFound("You're not going to this.");
  if (entry.status !== "JOINED") {
    throw conflict("There's nothing to confirm: you don't hold a seat.");
  }

  await db.activityParticipant.update({
    where: { activityId_profileId: { activityId, profileId } },
    data: { confirmedAt: now },
  });
}

/** The host, at the door. */
export async function openCheckIn(
  activityId: string,
  profileId: string,
  now = new Date(),
): Promise<void> {
  const activity = await db.activity.findUnique({
    where: { id: activityId },
    select: { organizerId: true, startsAt: true, status: true },
  });
  if (!activity) throw notFound("That activity no longer exists.");
  if (activity.organizerId !== profileId) {
    throw forbidden("Only the organizer opens check-in.");
  }
  if (activity.status === "CANCELLED") {
    throw conflict("That activity was called off.");
  }
  if (now.getTime() < activity.startsAt.getTime() - 2 * HOUR_MS) {
    throw conflict("Too early. Open it when you get there.");
  }

  await db.activity.update({
    where: { id: activityId },
    data: { checkInOpenedAt: now },
  });
}

export function checkInWindow(activity: {
  startsAt: Date;
  checkInOpenedAt: Date | null;
}, now = new Date()): { open: boolean; reason: "not_opened" | "too_early" | "closed" | null } {
  if (!activity.checkInOpenedAt) return { open: false, reason: "not_opened" };
  const opens = activity.startsAt.getTime() - CHECK_IN_OPENS_MINUTES_BEFORE * 60_000;
  const closes = activity.startsAt.getTime() + CHECK_IN_CLOSES_HOURS_AFTER * HOUR_MS;
  if (now.getTime() < opens) return { open: false, reason: "too_early" };
  if (now.getTime() > closes) return { open: false, reason: "closed" };
  return { open: true, reason: null };
}

/** "I'm here." */
export async function checkIn(
  activityId: string,
  profileId: string,
  now = new Date(),
): Promise<void> {
  const activity = await db.activity.findUnique({
    where: { id: activityId },
    select: { startsAt: true, checkInOpenedAt: true, status: true },
  });
  if (!activity) throw notFound("That activity no longer exists.");

  const window = checkInWindow(activity, now);
  if (!window.open) {
    throw conflict(
      window.reason === "not_opened"
        ? "Check-in isn't open yet. The organizer opens it when they arrive."
        : window.reason === "too_early"
          ? "Too early to check in."
          : "Check-in has closed.",
    );
  }

  const entry = await db.activityParticipant.findUnique({
    where: { activityId_profileId: { activityId, profileId } },
    select: { status: true, checkedInAt: true },
  });
  if (!entry || entry.status !== "JOINED") {
    throw forbidden("You don't hold a seat at this.");
  }
  if (entry.checkedInAt) return;

  await db.activityParticipant.update({
    where: { activityId_profileId: { activityId, profileId } },
    data: { checkedInAt: now, confirmedAt: entry.checkedInAt ?? now },
  });

  track({
    name: ANALYTICS_EVENTS.ACTIVITY_CHECKED_IN,
    profileId,
    properties: { activityId },
  });
}
