import { db } from "@/server/db/client";
import { pendingOutcome } from "@/server/modules/activities/outcomes";

/**
 * Everything that is waiting on this member, in one place.
 *
 * ## Why this is a feature rather than a query
 *
 * The things people owe each other here were scattered across six screens: a
 * connection request on one page, a vote on a plan inside a bunch, an
 * introduction on a third, a seat to confirm on an activity, a join request
 * only a moderator sees, an evening to say how it went. Each of them is
 * somebody else waiting, and none of them was visible from anywhere else, so
 * the honest answer to "is there anything for me" was "open six pages".
 *
 * ## Why it is the only thing allowed to chase somebody
 *
 * This product does not send messages about itself. What it can say without
 * embarrassment is that other people are waiting, because that is true, it is
 * about them rather than about us, and it stops being true the moment they
 * deal with it. Everything here disappears when it is answered, which is the
 * test a pending item has to pass to belong on this list: if ignoring it
 * forever changes nothing, it is not waiting on anybody.
 *
 * Deliberately excluded for that reason: unread messages (reading is not
 * owed), recommendations, suggested bunches, and anything else the product
 * thought of by itself.
 */

export type WaitingKind =
  | "CONNECTION_REQUEST"
  | "INTRODUCTION"
  | "PLAN_VOTE"
  | "SEAT_CONFIRMATION"
  | "JOIN_REQUEST"
  | "MEETUP"
  | "OUTCOME";

export interface WaitingItem {
  kind: WaitingKind;
  /** Whoever or whatever it is about: a name, a bunch, an evening. */
  subject: string;
  linkPath: string;
  /** When it started waiting, so the oldest can go first. */
  since: Date;
}

/** More than this and the list stops being a list. */
const MAX_ITEMS = 12;

export async function waitingOnYou(
  profileId: string,
  now = new Date(),
): Promise<WaitingItem[]> {
  const [
    connections,
    introductions,
    plans,
    seats,
    joinRequests,
    meetups,
    outcome,
  ] = await Promise.all([
    db.connection.findMany({
      where: { addresseeId: profileId, status: "PENDING" },
      select: { createdAt: true, requester: { select: { displayName: true } } },
      take: MAX_ITEMS,
    }),

    db.memberIntroduction.findMany({
      where: {
        status: "PENDING",
        OR: [
          { oneId: profileId, oneAccepted: null },
          { otherId: profileId, otherAccepted: null },
        ],
      },
      select: {
        createdAt: true,
        introducer: { select: { displayName: true } },
      },
      take: MAX_ITEMS,
    }),

    // An open plan where they hold a seat at the table and have not answered
    // any of the times. Voting on one option is an answer; the plan is then
    // waiting on everybody else rather than on them.
    db.socialPlan.findMany({
      where: {
        status: "OPEN",
        options: { none: { votes: { some: { profileId } } } },
        OR: [
          {
            bunch: {
              memberships: { some: { profileId, status: "ACTIVE" } },
            },
          },
          {
            conversation: {
              participants: { some: { profileId } },
            },
          },
        ],
      },
      select: {
        createdAt: true,
        title: true,
        bunch: { select: { slug: true } },
        conversationId: true,
      },
      take: MAX_ITEMS,
    }),

    db.activityParticipant.findMany({
      where: {
        profileId,
        status: "JOINED",
        confirmedAt: null,
        activity: {
          status: "SCHEDULED",
          startsAt: { gt: now },
          confirmationsAskedAt: { not: null },
        },
      },
      select: {
        joinedAt: true,
        activity: { select: { id: true, title: true, confirmationsAskedAt: true } },
      },
      take: MAX_ITEMS,
    }),

    db.bunchMembership.findMany({
      where: {
        status: "REQUESTED",
        bunch: {
          archivedAt: null,
          memberships: {
            some: {
              profileId,
              status: "ACTIVE",
              role: { in: ["OWNER", "MODERATOR"] },
            },
          },
        },
      },
      select: {
        joinedAt: true,
        profile: { select: { displayName: true } },
        bunch: { select: { slug: true, name: true } },
      },
      take: MAX_ITEMS,
    }),

    db.bunchMeetup.findMany({
      where: {
        status: "PROPOSED",
        guestBunch: {
          memberships: {
            some: {
              profileId,
              status: "ACTIVE",
              role: { in: ["OWNER", "MODERATOR"] },
            },
          },
        },
      },
      select: {
        createdAt: true,
        activityId: true,
        hostBunch: { select: { name: true } },
      },
      take: MAX_ITEMS,
    }),

    pendingOutcome(profileId, now),
  ]);

  const items: WaitingItem[] = [
    ...connections.map((row) => ({
      kind: "CONNECTION_REQUEST" as const,
      subject: row.requester.displayName,
      linkPath: "/connections",
      since: row.createdAt,
    })),
    ...introductions.map((row) => ({
      kind: "INTRODUCTION" as const,
      subject: row.introducer?.displayName ?? "",
      linkPath: "/connections",
      since: row.createdAt,
    })),
    ...plans.map((row) => ({
      kind: "PLAN_VOTE" as const,
      subject: row.title,
      linkPath: row.bunch
        ? `/bunches/${row.bunch.slug}`
        : `/messages/${row.conversationId}`,
      since: row.createdAt,
    })),
    ...seats.map((row) => ({
      kind: "SEAT_CONFIRMATION" as const,
      subject: row.activity.title,
      linkPath: `/activities/${row.activity.id}`,
      // When they were asked, not when they joined: the waiting started with
      // the question.
      since: row.activity.confirmationsAskedAt ?? row.joinedAt,
    })),
    ...joinRequests.map((row) => ({
      kind: "JOIN_REQUEST" as const,
      subject: row.profile.displayName,
      linkPath: `/bunches/${row.bunch.slug}`,
      since: row.joinedAt,
    })),
    ...meetups.map((row) => ({
      kind: "MEETUP" as const,
      subject: row.hostBunch.name,
      linkPath: `/activities/${row.activityId}`,
      since: row.createdAt,
    })),
    ...(outcome
      ? [
          {
            kind: "OUTCOME" as const,
            subject: outcome.title,
            linkPath: `/activities/${outcome.activityId}`,
            since: new Date(outcome.endedAt),
          },
        ]
      : []),
  ];

  // Oldest first. Somebody has been waiting longest on the thing at the top,
  // which is the only ordering that is about them rather than about us.
  return items
    .sort((a, b) => a.since.getTime() - b.since.getTime())
    .slice(0, MAX_ITEMS);
}

/**
 * How many things are waiting, for a badge or a subject line.
 *
 * Counts the same items rather than approximating with a cheaper query,
 * because a number that disagrees with the list under it is worse than no
 * number.
 */
export async function waitingCount(
  profileId: string,
  now = new Date(),
): Promise<number> {
  return (await waitingOnYou(profileId, now)).length;
}
