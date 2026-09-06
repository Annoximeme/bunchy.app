import { db } from "@/server/db/client";
import { conflict, forbidden, notFound, validationFailed } from "@/server/errors";
import { consume } from "@/server/ratelimit";
import { notify } from "@/server/modules/notifications/service";
import { track } from "@/server/modules/analytics/track";
import { ANALYTICS_EVENTS } from "@/server/modules/analytics/events";
import { scorer } from "@/server/modules/matching";
import {
  buildScoringContext,
  loadMatchProfile,
} from "@/server/modules/matching/repository";
import type { MatchProfile } from "@/server/modules/matching/types";
import type { PairScores } from "@/server/modules/bunches/formation";
import {
  pairGroups,
  PAIRING_FLOOR,
  type GroupPairing,
} from "@/server/modules/bunches/pairing";

/**
 * Two bunches, one evening.
 *
 * ## The shape of it
 *
 * A moderator of the bunch that is hosting an evening opens it to another
 * bunch. A moderator of that bunch accepts. Their members can then take a seat
 * at it, each deciding for themselves, and afterwards the two groups are still
 * two groups. Nothing merges, nothing is renamed, and neither bunch acquires
 * any standing in the other.
 *
 * ## Why candidates are scored on the person most likely to be stranded
 *
 * See `pairing.ts`. The short version: an evening where fifteen people click
 * and one stands at the edge of the room is the failure this is trying to
 * avoid, and it is invisible to an average.
 *
 * ## Why the ranking is computed on demand and never stored
 *
 * It is expensive, it is only ever looked at by a moderator deciding, and a
 * stored ranking of which groups suit which other groups is a table nobody
 * asked us to keep. `BunchChemistry` is stored because a job computes it for a
 * screen every member sees; this is computed when somebody presses the button
 * that asks the question.
 */

/** How many other bunches are considered. Scoring is O(members squared). */
const MAX_CANDIDATES = 12;
/** And how many members of each are loaded into the scorer. */
const MAX_MEMBERS = 12;

export interface MeetupCandidate {
  bunchId: string;
  slug: string;
  name: string;
  description: string;
  memberCount: number;
  locationLabel: string | null;
  pairing: GroupPairing;
}

async function requireModerator(bunchId: string, profileId: string) {
  const membership = await db.bunchMembership.findUnique({
    where: { bunchId_profileId: { bunchId, profileId } },
    select: { role: true, status: true },
  });
  if (!membership || membership.status !== "ACTIVE") {
    throw forbidden("You're not a member of this bunch.");
  }
  if (membership.role !== "OWNER" && membership.role !== "MODERATOR") {
    throw forbidden("Only moderators can invite another bunch.");
  }
}

async function membersOf(bunchId: string): Promise<MatchProfile[]> {
  const memberships = await db.bunchMembership.findMany({
    where: { bunchId, status: "ACTIVE" },
    orderBy: { joinedAt: "asc" },
    take: MAX_MEMBERS,
    select: { profileId: true },
  });

  const loaded = await Promise.all(
    memberships.map((membership) => loadMatchProfile(membership.profileId)),
  );
  return loaded.filter((profile): profile is MatchProfile => profile !== null);
}

/** Every cross-group pair, scored once. Never within a group. */
async function scoreAcross(
  host: MatchProfile[],
  guest: MatchProfile[],
): Promise<PairScores> {
  const context = await buildScoringContext();
  const active = scorer();
  const map = new Map<string, number>();

  for (const person of host) {
    const matches = await active.scorePeople(person, guest, context);
    for (const match of matches) {
      const value = match.score / 100;
      map.set(`${person.profileId}|${match.profileId}`, value);
      map.set(`${match.profileId}|${person.profileId}`, value);
    }
  }

  return { get: (a, b) => map.get(`${a}|${b}`) };
}

/**
 * Bunches worth asking along, best first.
 *
 * Only public bunches, and never one that has already been invited to this
 * evening. A private bunch is not a thing to be discovered by another group:
 * being invite-only is the whole of what it means.
 */
export async function suggestBunchesToMeet(
  bunchId: string,
  profileId: string,
  activityId?: string,
): Promise<MeetupCandidate[]> {
  await requireModerator(bunchId, profileId);

  const host = await db.bunch.findUniqueOrThrow({
    where: { id: bunchId },
    select: { id: true, cityLabel: true, countryCode: true },
  });

  const alreadyAsked = activityId
    ? await db.bunchMeetup.findMany({
        where: { activityId, status: { in: ["PROPOSED", "ACCEPTED"] } },
        select: { guestBunchId: true },
      })
    : [];

  const candidates = await db.bunch.findMany({
    where: {
      id: { not: bunchId, notIn: alreadyAsked.map((m) => m.guestBunchId) },
      visibility: "PUBLIC",
      archivedAt: null,
      // A group of one is not a group to meet.
      memberships: { some: { status: "ACTIVE" } },
      // Same country at least, and the nearby ones first. Two bunches that
      // would have to fly to meet are not a suggestion, they are a joke.
      ...(host.countryCode ? { countryCode: host.countryCode } : {}),
    },
    orderBy: [{ activityScore: "desc" }],
    take: MAX_CANDIDATES,
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      cityLabel: true,
      regionLabel: true,
      _count: { select: { memberships: { where: { status: "ACTIVE" } } } },
    },
  });

  const hostMembers = await membersOf(bunchId);
  if (hostMembers.length === 0) return [];

  const scored: MeetupCandidate[] = [];
  for (const candidate of candidates) {
    const guestMembers = await membersOf(candidate.id);
    if (guestMembers.length === 0) continue;

    const scores = await scoreAcross(hostMembers, guestMembers);
    const pairing = pairGroups(hostMembers, guestMembers, scores);
    if (pairing.everyoneHasSomeone < PAIRING_FLOOR) continue;

    scored.push({
      bunchId: candidate.id,
      slug: candidate.slug,
      name: candidate.name,
      description: candidate.description,
      memberCount: candidate._count.memberships,
      locationLabel: candidate.cityLabel ?? candidate.regionLabel,
      pairing,
    });
  }

  return scored
    .sort((a, b) => b.pairing.everyoneHasSomeone - a.pairing.everyoneHasSomeone)
    .slice(0, 3);
}

/** Opens one of your bunch's evenings to another bunch. */
export async function proposeMeetup(
  activityId: string,
  guestBunchId: string,
  profileId: string,
  note?: string | null,
): Promise<{ id: string }> {
  const activity = await db.activity.findUnique({
    where: { id: activityId },
    select: {
      id: true,
      title: true,
      startsAt: true,
      status: true,
      bunchId: true,
      bunch: { select: { name: true } },
    },
  });
  if (!activity) throw notFound("That activity no longer exists.");
  if (!activity.bunchId) {
    throw validationFailed("Only a bunch's evening can be opened to another bunch.");
  }
  if (activity.bunchId === guestBunchId) {
    throw validationFailed("That is the same bunch.");
  }
  if (activity.status !== "SCHEDULED" || activity.startsAt.getTime() < Date.now()) {
    throw conflict("That evening has been and gone.");
  }

  await requireModerator(activity.bunchId, profileId);
  await consume("activityCreate", profileId);

  const guest = await db.bunch.findUnique({
    where: { id: guestBunchId },
    select: { id: true, name: true, visibility: true, archivedAt: true },
  });
  if (!guest || guest.archivedAt) throw notFound("That bunch no longer exists.");
  if (guest.visibility !== "PUBLIC") {
    // A private bunch cannot be found this way, so it cannot be asked this way
    // either. Being invite-only is the whole of what it means.
    throw forbidden("That bunch is invite-only.");
  }

  const existing = await db.bunchMeetup.findUnique({
    where: { activityId_guestBunchId: { activityId, guestBunchId } },
    select: { id: true, status: true },
  });
  if (existing && existing.status !== "DECLINED" && existing.status !== "WITHDRAWN") {
    throw conflict("You've already asked them to this one.");
  }
  if (existing) {
    throw conflict("They've already answered about this evening.");
  }

  const meetup = await db.bunchMeetup.create({
    data: {
      hostBunchId: activity.bunchId,
      guestBunchId,
      activityId,
      proposedById: profileId,
      note: note?.trim().slice(0, 300) || null,
    },
    select: { id: true },
  });

  // Their moderators, not their members. Nobody in the guest bunch is asked to
  // decide anything until their own bunch has agreed to the evening.
  const moderators = await db.bunchMembership.findMany({
    where: { bunchId: guestBunchId, status: "ACTIVE", role: { in: ["OWNER", "MODERATOR"] } },
    select: { profileId: true },
  });

  for (const moderator of moderators) {
    await notify({
      profileId: moderator.profileId,
      type: "BUNCH_INVITE",
      title: `${activity.bunch?.name ?? "Another bunch"} asked your bunch along`,
      body: `${activity.title}. Have a look and see if it suits you.`,
      linkPath: `/activities/${activityId}`,
      groupKey: `meetup:${meetup.id}`,
    });
  }

  track({
    name: ANALYTICS_EVENTS.MEETUP_PROPOSED,
    profileId,
    properties: { activityId, hostBunchId: activity.bunchId, guestBunchId },
  });

  return meetup;
}

/** The guest bunch's answer. */
export async function respondToMeetup(
  meetupId: string,
  profileId: string,
  accept: boolean,
): Promise<void> {
  const meetup = await db.bunchMeetup.findUnique({
    where: { id: meetupId },
    select: {
      id: true,
      status: true,
      guestBunchId: true,
      hostBunchId: true,
      activityId: true,
      activity: { select: { title: true } },
      hostBunch: { select: { name: true } },
      guestBunch: { select: { name: true } },
    },
  });
  if (!meetup) throw notFound("That invitation no longer exists.");
  if (meetup.status !== "PROPOSED") {
    throw conflict("That invitation has already been answered.");
  }

  await requireModerator(meetup.guestBunchId, profileId);

  await db.bunchMeetup.update({
    where: { id: meetupId },
    data: {
      status: accept ? "ACCEPTED" : "DECLINED",
      respondedById: profileId,
      respondedAt: new Date(),
    },
  });

  if (!accept) {
    // The host is told, in the room where they proposed it. Declining does not
    // notify anybody individually: a group saying no to an evening is not a
    // rejection anybody needs delivered to them.
    await db.bunchMessage.create({
      data: {
        bunchId: meetup.hostBunchId,
        kind: "SYSTEM",
        body: `${meetup.guestBunch.name} can't make ${meetup.activity.title}.`,
      },
    });
    return;
  }

  await db.$transaction([
    db.bunchMessage.create({
      data: {
        bunchId: meetup.guestBunchId,
        kind: "SYSTEM",
        body: `${meetup.hostBunch.name} asked us along to ${meetup.activity.title}.`,
      },
    }),
    db.bunchMessage.create({
      data: {
        bunchId: meetup.hostBunchId,
        kind: "SYSTEM",
        body: `${meetup.guestBunch.name} are coming to ${meetup.activity.title}.`,
      },
    }),
  ]);

  // Now the members hear about it, because now there is something they can
  // actually take a seat at.
  const members = await db.bunchMembership.findMany({
    where: { bunchId: meetup.guestBunchId, status: "ACTIVE" },
    select: { profileId: true },
  });

  for (const member of members) {
    if (member.profileId === profileId) continue;
    await notify({
      profileId: member.profileId,
      type: "ACTIVITY_INVITE",
      title: `${meetup.hostBunch.name} asked us along`,
      body: `${meetup.activity.title}. Take a seat if you fancy it.`,
      linkPath: `/activities/${meetup.activityId}`,
      groupKey: `meetup:${meetup.id}`,
    });
  }

  track({
    name: ANALYTICS_EVENTS.MEETUP_ACCEPTED,
    profileId,
    properties: { activityId: meetup.activityId, guestBunchId: meetup.guestBunchId },
  });
}

/** Called off by the bunch that opened the evening, before an answer. */
export async function withdrawMeetup(
  meetupId: string,
  profileId: string,
): Promise<void> {
  const meetup = await db.bunchMeetup.findUnique({
    where: { id: meetupId },
    select: { id: true, status: true, hostBunchId: true },
  });
  if (!meetup) throw notFound("That invitation no longer exists.");
  await requireModerator(meetup.hostBunchId, profileId);
  if (meetup.status !== "PROPOSED") {
    throw conflict("That invitation has already been answered.");
  }

  await db.bunchMeetup.update({
    where: { id: meetupId },
    data: { status: "WITHDRAWN", respondedById: profileId, respondedAt: new Date() },
  });
}

export interface MeetupView {
  id: string;
  status: "PROPOSED" | "ACCEPTED" | "DECLINED" | "WITHDRAWN";
  note: string | null;
  hostBunch: { slug: string; name: string };
  guestBunch: { slug: string; name: string };
  /** Whether this viewer can answer it, which means moderating the guest bunch. */
  viewerCanRespond: boolean;
  /** And whether they can call it off, which means moderating the host bunch. */
  viewerCanWithdraw: boolean;
}

/** What the activity page needs to show about other bunches. */
export async function meetupsForActivity(
  activityId: string,
  profileId: string,
): Promise<MeetupView[]> {
  const meetups = await db.bunchMeetup.findMany({
    where: { activityId, status: { in: ["PROPOSED", "ACCEPTED"] } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      status: true,
      note: true,
      hostBunchId: true,
      guestBunchId: true,
      hostBunch: { select: { slug: true, name: true } },
      guestBunch: { select: { slug: true, name: true } },
    },
  });
  if (meetups.length === 0) return [];

  const roles = await db.bunchMembership.findMany({
    where: {
      profileId,
      status: "ACTIVE",
      bunchId: {
        in: meetups.flatMap((meetup) => [meetup.hostBunchId, meetup.guestBunchId]),
      },
    },
    select: { bunchId: true, role: true },
  });
  const moderatorOf = new Set(
    roles
      .filter((role) => role.role === "OWNER" || role.role === "MODERATOR")
      .map((role) => role.bunchId),
  );

  return meetups.map((meetup) => ({
    id: meetup.id,
    status: meetup.status,
    note: meetup.note,
    hostBunch: meetup.hostBunch,
    guestBunch: meetup.guestBunch,
    viewerCanRespond:
      meetup.status === "PROPOSED" && moderatorOf.has(meetup.guestBunchId),
    viewerCanWithdraw:
      meetup.status === "PROPOSED" && moderatorOf.has(meetup.hostBunchId),
  }));
}

/**
 * Whether this member may take a seat at an evening because their bunch was
 * asked along.
 *
 * Read by `joinActivity`, which otherwise treats a private bunch's evening as
 * members-only. An accepted meetup is the second bunch being let in, and
 * without this the invitation would arrive with no way to answer it.
 */
export async function invitedViaMeetup(
  activityId: string,
  profileId: string,
): Promise<boolean> {
  const meetup = await db.bunchMeetup.findFirst({
    where: {
      activityId,
      status: "ACCEPTED",
      guestBunch: {
        memberships: { some: { profileId, status: "ACTIVE" } },
      },
    },
    select: { id: true },
  });
  return meetup !== null;
}

/**
 * Whether this member moderates that bunch.
 *
 * A boolean for a page to render with, next to the guard that actually
 * enforces it. The screen decides what to draw; `requireModerator` above
 * decides what may happen, and it runs again on every call regardless of what
 * the screen believed.
 */
export async function moderatesBunch(
  bunchId: string,
  profileId: string,
): Promise<boolean> {
  const membership = await db.bunchMembership.findUnique({
    where: { bunchId_profileId: { bunchId, profileId } },
    select: { role: true, status: true },
  });
  return (
    membership?.status === "ACTIVE" &&
    (membership.role === "OWNER" || membership.role === "MODERATOR")
  );
}
