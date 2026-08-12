import { db } from "@/server/db/client";
import { conflict, notFound } from "@/server/errors";
import { recordModerationEventTx } from "@/server/modules/admin/audit";
import { notify } from "@/server/modules/notifications/service";
import type { StaffViewer } from "@/server/modules/admin/guard";

/**
 * Content administration: bunches, activities and individual messages.
 *
 * Staff archive and cancel rather than delete. A bunch that vanishes takes its
 * members' conversation history with it, and a cancelled activity still needs
 * to tell the people who had planned around it. Reversibility is also what
 * makes a mistaken moderation call recoverable.
 */

// --- Bunches ----------------------------------------------------------------

export interface BunchAdminQuery {
  q?: string;
  archived?: boolean;
  limit?: number;
  cursor?: string;
}

export async function listBunchesForAdmin(query: BunchAdminQuery = {}) {
  const limit = Math.min(query.limit ?? 25, 100);
  const needle = query.q?.trim();

  const rows = await db.bunch.findMany({
    where: {
      ...(query.archived === undefined
        ? {}
        : query.archived
          ? { archivedAt: { not: null } }
          : { archivedAt: null }),
      ...(needle
        ? {
            OR: [
              { name: { contains: needle, mode: "insensitive" as const } },
              { description: { contains: needle, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      visibility: true,
      type: true,
      cityLabel: true,
      maxMembers: true,
      activityScore: true,
      archivedAt: true,
      createdAt: true,
      createdBy: { select: { username: true, displayName: true } },
      _count: {
        select: {
          memberships: { where: { status: "ACTIVE" } },
          messages: true,
        },
      },
    },
  });

  const hasMore = rows.length > limit;
  const bunches = hasMore ? rows.slice(0, limit) : rows;

  return {
    bunches: bunches.map((b) => ({
      id: b.id,
      slug: b.slug,
      name: b.name,
      description: b.description,
      visibility: b.visibility,
      type: b.type,
      cityLabel: b.cityLabel,
      memberCount: b._count.memberships,
      maxMembers: b.maxMembers,
      messageCount: b._count.messages,
      activityScore: b.activityScore,
      archivedAt: b.archivedAt?.toISOString() ?? null,
      createdAt: b.createdAt.toISOString(),
      createdBy: b.createdBy?.displayName ?? "(deleted)",
    })),
    nextCursor: hasMore ? (bunches.at(-1)?.id ?? null) : null,
  };
}

export async function archiveBunch(
  actor: StaffViewer,
  bunchId: string,
  reason: string,
): Promise<void> {
  const bunch = await db.bunch.findUnique({
    where: { id: bunchId },
    select: { id: true, name: true, archivedAt: true },
  });
  if (!bunch) throw notFound("No such bunch.");
  if (bunch.archivedAt) throw conflict("Already archived.");

  await db.$transaction(async (tx) => {
    await tx.bunch.update({
      where: { id: bunchId },
      data: { archivedAt: new Date() },
    });
    // Members should learn why in the place they'd look.
    await tx.bunchMessage.create({
      data: {
        bunchId,
        kind: "SYSTEM",
        body: "This bunch was archived by Bunchy staff.",
      },
    });
    await recordModerationEventTx(tx, {
      actor,
      action: "BUNCH_ARCHIVED",
      targetType: "BUNCH",
      targetId: bunchId,
      reason,
      metadata: { name: bunch.name },
    });
  });
}

export async function restoreBunch(
  actor: StaffViewer,
  bunchId: string,
  reason: string,
): Promise<void> {
  const bunch = await db.bunch.findUnique({
    where: { id: bunchId },
    select: { id: true, name: true, archivedAt: true },
  });
  if (!bunch) throw notFound("No such bunch.");
  if (!bunch.archivedAt) throw conflict("That bunch is not archived.");

  await db.$transaction(async (tx) => {
    await tx.bunch.update({
      where: { id: bunchId },
      data: { archivedAt: null },
    });
    await recordModerationEventTx(tx, {
      actor,
      action: "BUNCH_RESTORED",
      targetType: "BUNCH",
      targetId: bunchId,
      reason,
      metadata: { name: bunch.name },
    });
  });
}

// --- Activities ---------------------------------------------------------------

export interface ActivityAdminQuery {
  q?: string;
  upcomingOnly?: boolean;
  limit?: number;
  cursor?: string;
}

export async function listActivitiesForAdmin(query: ActivityAdminQuery = {}) {
  const limit = Math.min(query.limit ?? 25, 100);
  const needle = query.q?.trim();

  const rows = await db.activity.findMany({
    where: {
      ...(query.upcomingOnly ? { startsAt: { gte: new Date() } } : {}),
      ...(needle
        ? {
            OR: [
              { title: { contains: needle, mode: "insensitive" as const } },
              { description: { contains: needle, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: { startsAt: "desc" },
    take: limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    select: {
      id: true,
      title: true,
      startsAt: true,
      mode: true,
      status: true,
      locationLabel: true,
      cityLabel: true,
      maxParticipants: true,
      organizer: { select: { username: true, displayName: true } },
      bunch: { select: { name: true, slug: true } },
      _count: { select: { participants: { where: { status: "JOINED" } } } },
    },
  });

  const hasMore = rows.length > limit;
  const activities = hasMore ? rows.slice(0, limit) : rows;

  return {
    activities: activities.map((a) => ({
      id: a.id,
      title: a.title,
      startsAt: a.startsAt.toISOString(),
      mode: a.mode,
      status: a.status,
      locationLabel: a.locationLabel ?? a.cityLabel,
      participantCount: a._count.participants,
      maxParticipants: a.maxParticipants,
      organizer: a.organizer.displayName,
      organizerUsername: a.organizer.username,
      bunch: a.bunch?.name ?? null,
    })),
    nextCursor: hasMore ? (activities.at(-1)?.id ?? null) : null,
  };
}

export async function cancelActivityAsStaff(
  actor: StaffViewer,
  activityId: string,
  reason: string,
): Promise<void> {
  const activity = await db.activity.findUnique({
    where: { id: activityId },
    select: { id: true, title: true, status: true },
  });
  if (!activity) throw notFound("No such activity.");
  if (activity.status === "CANCELLED") throw conflict("Already cancelled.");

  await db.$transaction(async (tx) => {
    await tx.activity.update({
      where: { id: activityId },
      data: { status: "CANCELLED" },
    });
    await recordModerationEventTx(tx, {
      actor,
      action: "ACTIVITY_CANCELLED",
      targetType: "ACTIVITY",
      targetId: activityId,
      reason,
      metadata: { title: activity.title },
    });
  });

  // Everyone who signed up is told, exactly as if the organizer had cancelled.
  const participants = await db.activityParticipant.findMany({
    where: { activityId, status: { in: ["JOINED", "WAITLISTED"] } },
    select: { profileId: true },
  });
  await Promise.all(
    participants.map((p) =>
      notify({
        profileId: p.profileId,
        type: "ACTIVITY_CHANGED",
        title: `${activity.title} was cancelled`,
        body: "Bunchy staff cancelled this activity.",
        linkPath: `/activities/${activityId}`,
        groupKey: `activity:${activityId}`,
      }),
    ),
  );
}

// --- Individual messages ------------------------------------------------------

export async function removeBunchMessageAsStaff(
  actor: StaffViewer,
  messageId: string,
  reason: string,
): Promise<void> {
  const message = await db.bunchMessage.findUnique({
    where: { id: messageId },
    select: { id: true, bunchId: true, deletedAt: true, authorId: true },
  });
  if (!message) throw notFound("No such message.");
  if (message.deletedAt) throw conflict("Already removed.");

  await db.$transaction(async (tx) => {
    await tx.bunchMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), moderatedAt: new Date() },
    });
    await recordModerationEventTx(tx, {
      actor,
      action: "BUNCH_MESSAGE_REMOVED",
      targetType: "BUNCH_MESSAGE",
      targetId: messageId,
      reason,
      metadata: { bunchId: message.bunchId, authorId: message.authorId },
    });
  });
}
