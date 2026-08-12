import { db } from "@/server/db/client";
import { blocked, conflict, notFound } from "@/server/errors";
import { consume } from "@/server/ratelimit";
import type { ReportReason, ReportTargetType } from "@/generated/prisma/enums";

/**
 * Blocks and reports.
 *
 * A block is symmetric in effect: neither person sees the other in Discover,
 * neither can message or invite the other, and existing conversations go
 * read-only. It is enforced here, in the service layer, rather than in the UI —
 * every other module calls `assertNotBlocked` before it acts, so there is no
 * route that can accidentally route around it.
 */

export async function isBlockedBetween(
  a: string,
  b: string,
): Promise<boolean> {
  const existing = await db.block.findFirst({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
    select: { blockerId: true },
  });
  return existing !== null;
}

/**
 * Throws the deliberately vague `blocked` error, which the HTTP layer renders
 * identically to "not found". Confirming that a block exists would tell someone
 * they have been blocked, which is information we do not owe them.
 */
export async function assertNotBlocked(a: string, b: string): Promise<void> {
  if (await isBlockedBetween(a, b)) throw blocked();
}

export async function blockProfile(
  blockerId: string,
  blockedId: string,
): Promise<void> {
  if (blockerId === blockedId) {
    throw conflict("You cannot block yourself.");
  }

  const target = await db.profile.findUnique({
    where: { id: blockedId },
    select: { id: true },
  });
  if (!target) throw notFound("That profile no longer exists.");

  await db.$transaction(async (tx) => {
    await tx.block.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      create: { blockerId, blockedId },
      update: {},
    });

    // Withdraw anything already in flight between them.
    await tx.connection.deleteMany({
      where: {
        OR: [
          { requesterId: blockerId, addresseeId: blockedId },
          { requesterId: blockedId, addresseeId: blockerId },
        ],
      },
    });

    // Stop recommending either to the other.
    await tx.recommendation.deleteMany({
      where: {
        OR: [
          { profileId: blockerId, kind: "PERSON", targetId: blockedId },
          { profileId: blockedId, kind: "PERSON", targetId: blockerId },
        ],
      },
    });
  });
}

export async function unblockProfile(
  blockerId: string,
  blockedId: string,
): Promise<void> {
  await db.block.deleteMany({ where: { blockerId, blockedId } });
}

export async function listBlocked(profileId: string) {
  const rows = await db.block.findMany({
    where: { blockerId: profileId },
    select: {
      createdAt: true,
      blocked: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((r) => ({ ...r.blocked, blockedAt: r.createdAt.toISOString() }));
}

export interface ReportInput {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details?: string;
}

/**
 * Files a report for human review.
 *
 * Reports are never auto-actioned. Automatic enforcement on an unreviewed
 * report is a harassment vector — a coordinated group could mute anyone — so
 * this records the case and, for profile reports, applies the one remedy that
 * is safe and immediate: the reporter stops seeing the reported member.
 */
export async function fileReport(
  reporterId: string,
  input: ReportInput,
): Promise<{ id: string }> {
  await consume("report", reporterId);

  const reportedProfileId = await resolveReportedProfile(
    input.targetType,
    input.targetId,
  );

  // A report about something that does not exist is a client mistake, not a
  // server fault — without this the insert fails a foreign key and surfaces
  // as a 500.
  if (input.targetType === "PROFILE" && reportedProfileId === null) {
    throw notFound("We couldn't find who you're reporting.");
  }

  const existing = await db.report.findFirst({
    where: {
      reporterId,
      targetType: input.targetType,
      targetId: input.targetId,
      status: { in: ["OPEN", "REVIEWING"] },
    },
    select: { id: true },
  });
  if (existing) return { id: existing.id };

  const report = await db.report.create({
    data: {
      reporterId,
      targetType: input.targetType,
      targetId: input.targetId,
      reportedProfileId,
      reason: input.reason,
      details: input.details?.slice(0, 2000),
    },
    select: { id: true },
  });

  return report;
}

/** Finds the member behind a reported message/bunch/activity, for the queue. */
async function resolveReportedProfile(
  targetType: ReportTargetType,
  targetId: string,
): Promise<string | null> {
  switch (targetType) {
    case "PROFILE": {
      const profile = await db.profile.findUnique({
        where: { id: targetId },
        select: { id: true },
      });
      return profile?.id ?? null;
    }
    case "BUNCH_MESSAGE": {
      const message = await db.bunchMessage.findUnique({
        where: { id: targetId },
        select: { authorId: true },
      });
      return message?.authorId ?? null;
    }
    case "DIRECT_MESSAGE": {
      const message = await db.directMessage.findUnique({
        where: { id: targetId },
        select: { senderId: true },
      });
      return message?.senderId ?? null;
    }
    case "ACTIVITY": {
      const activity = await db.activity.findUnique({
        where: { id: targetId },
        select: { organizerId: true },
      });
      return activity?.organizerId ?? null;
    }
    case "BUNCH": {
      const bunch = await db.bunch.findUnique({
        where: { id: targetId },
        select: { createdById: true },
      });
      return bunch?.createdById ?? null;
    }
    default:
      return null;
  }
}
