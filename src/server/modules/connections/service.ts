import { db } from "@/server/db/client";
import { conflict, forbidden, notFound } from "@/server/errors";
import { consume } from "@/server/ratelimit";
import { assertNotBlocked } from "@/server/modules/moderation/service";
import { notify } from "@/server/modules/notifications/service";
import { markRecommendationActed } from "@/server/modules/matching/engine";
import type { AudienceScope } from "@/generated/prisma/enums";
import { track } from "@/server/modules/analytics/track";
import { ANALYTICS_EVENTS } from "@/server/modules/analytics/events";

/**
 * Connections, mutual consent, always.
 *
 * Nobody can message anybody until both people have agreed. That single rule is
 * what keeps Bunchy from becoming an inbox full of strangers, and it is enforced
 * here rather than by hiding a button: a request creates *nothing* a recipient
 * has to read, and a conversation only exists once it has been accepted.
 */

/**
 * How `whoCanSendRequests` / `whoCanMessage` are interpreted:
 *
 * - EVERYONE       anyone on Bunchy
 * - BUNCH_MEMBERS only people who share an active bunch
 * - CONNECTIONS    only people with a connection in common (friend of a friend)
 * - NOBODY         nobody, full stop
 */
export async function satisfiesAudience(
  scope: AudienceScope,
  senderProfileId: string,
  recipientProfileId: string,
): Promise<boolean> {
  switch (scope) {
    case "EVERYONE":
      return true;
    case "NOBODY":
      return false;
    case "BUNCH_MEMBERS": {
      const shared = await db.bunchMembership.findFirst({
        where: {
          profileId: senderProfileId,
          status: "ACTIVE",
          bunch: {
            memberships: { some: { profileId: recipientProfileId, status: "ACTIVE" } },
          },
        },
        select: { bunchId: true },
      });
      return shared !== null;
    }
    case "CONNECTIONS": {
      const recipientConnections = await connectedProfileIds(recipientProfileId);
      if (recipientConnections.length === 0) return false;
      const mutual = await db.connection.findFirst({
        where: {
          status: "ACCEPTED",
          OR: [
            { requesterId: senderProfileId, addresseeId: { in: recipientConnections } },
            { addresseeId: senderProfileId, requesterId: { in: recipientConnections } },
          ],
        },
        select: { id: true },
      });
      return mutual !== null;
    }
    default:
      return false;
  }
}

export async function connectedProfileIds(profileId: string): Promise<string[]> {
  const rows = await db.connection.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: profileId }, { addresseeId: profileId }],
    },
    select: { requesterId: true, addresseeId: true },
  });

  return rows.map((r) => (r.requesterId === profileId ? r.addresseeId : r.requesterId));
}

export async function sendRequest(
  requesterId: string,
  addresseeId: string,
  note?: string,
): Promise<{ id: string; status: string }> {
  if (requesterId === addresseeId) {
    throw conflict("You cannot connect with yourself.");
  }

  await consume("connectionRequest", requesterId);
  await assertNotBlocked(requesterId, addresseeId);

  const target = await db.profile.findUnique({
    where: { id: addresseeId },
    select: {
      id: true,
      displayName: true,
      username: true,
      user: { select: { status: true } },
      privacy: { select: { whoCanSendRequests: true } },
    },
  });
  if (!target || target.user.status !== "ACTIVE") {
    throw notFound("We couldn't find that profile.");
  }

  const scope = target.privacy?.whoCanSendRequests ?? "EVERYONE";
  if (!(await satisfiesAudience(scope, requesterId, addresseeId))) {
    throw forbidden("This person isn't accepting connection requests right now.");
  }

  const existing = await db.connection.findFirst({
    where: {
      OR: [
        { requesterId, addresseeId },
        { requesterId: addresseeId, addresseeId: requesterId },
      ],
    },
    select: { id: true, status: true, requesterId: true },
  });

  if (existing) {
    if (existing.status === "ACCEPTED") {
      throw conflict("You're already connected.");
    }
    if (existing.status === "PENDING") {
      // They already asked us, treat this as accepting rather than a duplicate.
      if (existing.requesterId === addresseeId) {
        await respondToRequest(existing.id, requesterId, true);
        return { id: existing.id, status: "ACCEPTED" };
      }
      throw conflict("You've already sent a request.");
    }

    // A previously declined or withdrawn request may be tried once more.
    const revived = await db.connection.update({
      where: { id: existing.id },
      data: {
        requesterId,
        addresseeId,
        status: "PENDING",
        note: note?.slice(0, 300) ?? null,
        respondedAt: null,
        createdAt: new Date(),
      },
      select: { id: true, status: true },
    });
    await notifyOfRequest(requesterId, target, revived.id);
    return revived;
  }

  const connection = await db.connection.create({
    data: { requesterId, addresseeId, note: note?.slice(0, 300) ?? null },
    select: { id: true, status: true },
  });

  await markRecommendationActed(requesterId, "PERSON", addresseeId);
  track({ name: ANALYTICS_EVENTS.CONNECTION_SENT, profileId: requesterId });
  await notifyOfRequest(requesterId, target, connection.id);

  return connection;
}

async function notifyOfRequest(
  requesterId: string,
  target: { id: string; displayName: string },
  connectionId: string,
): Promise<void> {
  const requester = await db.profile.findUnique({
    where: { id: requesterId },
    select: { displayName: true, username: true },
  });

  await notify({
    profileId: target.id,
    actorProfileId: requesterId,
    type: "CONNECTION_REQUEST",
    title: `${requester?.displayName ?? "Someone"} would like to connect`,
    body: "Take a look at their profile and decide if you'd like to talk.",
    linkPath: "/connections",
    groupKey: `connection:${connectionId}`,
  });
}

/**
 * Accepting creates the conversation. Declining is silent by design, the
 * requester is not told, because "X said no" is an invitation to try again from
 * a new angle.
 */
export async function respondToRequest(
  connectionId: string,
  profileId: string,
  accept: boolean,
): Promise<void> {
  const connection = await db.connection.findUnique({
    where: { id: connectionId },
    select: {
      id: true,
      requesterId: true,
      addresseeId: true,
      status: true,
      addressee: { select: { displayName: true } },
    },
  });

  if (!connection) throw notFound("That request no longer exists.");
  if (connection.addresseeId !== profileId) {
    throw forbidden("That request isn't yours to answer.");
  }
  if (connection.status !== "PENDING") {
    throw conflict("That request has already been answered.");
  }

  if (!accept) {
    await db.connection.update({
      where: { id: connectionId },
      data: { status: "DECLINED", respondedAt: new Date() },
    });
    track({ name: ANALYTICS_EVENTS.CONNECTION_DECLINED, profileId });
    return;
  }

  await db.$transaction(async (tx) => {
    await tx.connection.update({
      where: { id: connectionId },
      data: { status: "ACCEPTED", respondedAt: new Date() },
    });

    await tx.conversation.create({
      data: {
        connectionId,
        participants: {
          create: [
            { profileId: connection.requesterId },
            { profileId: connection.addresseeId },
          ],
        },
      },
    });
  });

  track({ name: ANALYTICS_EVENTS.CONNECTION_ACCEPTED, profileId });

  await notify({
    profileId: connection.requesterId,
    actorProfileId: profileId,
    type: "CONNECTION_ACCEPTED",
    title: `${connection.addressee.displayName} accepted your request`,
    body: "You can message each other now.",
    linkPath: "/messages",
  });
}

export async function withdrawRequest(
  connectionId: string,
  profileId: string,
): Promise<void> {
  const connection = await db.connection.findUnique({
    where: { id: connectionId },
    select: { requesterId: true, status: true },
  });
  if (!connection) throw notFound("That request no longer exists.");
  if (connection.requesterId !== profileId) throw forbidden();
  if (connection.status !== "PENDING") {
    throw conflict("That request has already been answered.");
  }

  await db.connection.update({
    where: { id: connectionId },
    data: { status: "WITHDRAWN", respondedAt: new Date() },
  });
}

export async function removeConnection(
  profileId: string,
  otherProfileId: string,
): Promise<void> {
  const connection = await db.connection.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { requesterId: profileId, addresseeId: otherProfileId },
        { requesterId: otherProfileId, addresseeId: profileId },
      ],
    },
    select: { id: true },
  });
  if (!connection) throw notFound("You aren't connected.");

  // Deleting the connection cascades the conversation away with it.
  await db.connection.delete({ where: { id: connection.id } });
}

const CONNECTION_PROFILE_SELECT = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
  cityLabel: true,
  privacy: { select: { showApproxLocation: true } },
} as const;

export async function listConnections(profileId: string) {
  const rows = await db.connection.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: profileId }, { addresseeId: profileId }],
    },
    select: {
      id: true,
      respondedAt: true,
      requester: { select: CONNECTION_PROFILE_SELECT },
      addressee: { select: CONNECTION_PROFILE_SELECT },
    },
    orderBy: { respondedAt: "desc" },
  });

  return rows.map((row) => {
    const other = row.requester.id === profileId ? row.addressee : row.requester;
    return {
      connectionId: row.id,
      connectedAt: row.respondedAt?.toISOString() ?? null,
      profile: {
        id: other.id,
        username: other.username,
        displayName: other.displayName,
        avatarUrl: other.avatarUrl,
        bio: other.bio,
        locationLabel:
          other.privacy?.showApproxLocation === false ? null : other.cityLabel,
      },
    };
  });
}

export async function listPendingRequests(profileId: string) {
  const [incoming, outgoing] = await Promise.all([
    db.connection.findMany({
      where: { addresseeId: profileId, status: "PENDING" },
      select: {
        id: true,
        note: true,
        createdAt: true,
        requester: { select: CONNECTION_PROFILE_SELECT },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.connection.findMany({
      where: { requesterId: profileId, status: "PENDING" },
      select: {
        id: true,
        note: true,
        createdAt: true,
        addressee: { select: CONNECTION_PROFILE_SELECT },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const shape = (p: { id: string; username: string; displayName: string; avatarUrl: string | null; bio: string | null; cityLabel: string | null; privacy: { showApproxLocation: boolean } | null }) => ({
    id: p.id,
    username: p.username,
    displayName: p.displayName,
    avatarUrl: p.avatarUrl,
    bio: p.bio,
    locationLabel: p.privacy?.showApproxLocation === false ? null : p.cityLabel,
  });

  return {
    incoming: incoming.map((r) => ({
      id: r.id,
      note: r.note,
      createdAt: r.createdAt.toISOString(),
      profile: shape(r.requester),
    })),
    outgoing: outgoing.map((r) => ({
      id: r.id,
      note: r.note,
      createdAt: r.createdAt.toISOString(),
      profile: shape(r.addressee),
    })),
  };
}

export async function areConnected(a: string, b: string): Promise<boolean> {
  const row = await db.connection.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { requesterId: a, addresseeId: b },
        { requesterId: b, addresseeId: a },
      ],
    },
    select: { id: true },
  });
  return row !== null;
}
