import { db } from "@/server/db/client";
import { notFound } from "@/server/errors";
import { recordModerationEventTx } from "@/server/modules/admin/audit";
import type { StaffViewer } from "@/server/modules/admin/guard";
import type { ReportStatus } from "@/generated/prisma/enums";

/**
 * The report queue.
 *
 * Reports are never auto-actioned — a coordinated group filing reports must not
 * be able to mute anyone. A human reads each one, and both the decision and the
 * decider are recorded.
 *
 * Ordering is oldest-first within a status. A newest-first queue quietly means
 * the hardest reports never get read.
 */

export interface ReportQueueQuery {
  status?: ReportStatus;
  limit?: number;
  cursor?: string;
}

/**
 * Loads the content a report points at, so a moderator can judge it without
 * leaving the queue. Deleted targets come back as null rather than erroring —
 * a report about something already removed is still worth reviewing.
 */
async function resolveTarget(targetType: string, targetId: string) {
  switch (targetType) {
    case "BUNCH_MESSAGE": {
      const m = await db.bunchMessage.findUnique({
        where: { id: targetId },
        select: {
          body: true,
          deletedAt: true,
          createdAt: true,
          bunch: { select: { id: true, name: true, slug: true } },
          author: { select: { username: true, displayName: true } },
        },
      });
      return m
        ? {
            kind: "message" as const,
            body: m.deletedAt ? "(already removed)" : m.body,
            context: m.bunch.name,
            href: `/bunches/${m.bunch.slug}`,
            author: m.author?.displayName ?? "Unknown",
            removed: m.deletedAt !== null,
          }
        : null;
    }
    case "DIRECT_MESSAGE": {
      const m = await db.directMessage.findUnique({
        where: { id: targetId },
        select: {
          body: true,
          deletedAt: true,
          sender: { select: { username: true, displayName: true } },
        },
      });
      return m
        ? {
            kind: "message" as const,
            body: m.deletedAt ? "(already removed)" : m.body,
            context: "Direct message",
            href: null,
            author: m.sender.displayName,
            removed: m.deletedAt !== null,
          }
        : null;
    }
    case "BUNCH": {
      const b = await db.bunch.findUnique({
        where: { id: targetId },
        select: { name: true, slug: true, description: true, archivedAt: true },
      });
      return b
        ? {
            kind: "bunch" as const,
            body: b.description,
            context: b.name,
            href: `/bunches/${b.slug}`,
            author: null,
            removed: b.archivedAt !== null,
          }
        : null;
    }
    case "ACTIVITY": {
      const a = await db.activity.findUnique({
        where: { id: targetId },
        select: {
          title: true,
          description: true,
          status: true,
          organizer: { select: { displayName: true } },
        },
      });
      return a
        ? {
            kind: "activity" as const,
            body: a.description,
            context: a.title,
            href: `/activities/${targetId}`,
            author: a.organizer.displayName,
            removed: a.status === "CANCELLED",
          }
        : null;
    }
    case "PROFILE": {
      const p = await db.profile.findUnique({
        where: { id: targetId },
        select: { username: true, displayName: true, bio: true },
      });
      return p
        ? {
            kind: "profile" as const,
            body: p.bio,
            context: `@${p.username}`,
            href: `/u/${p.username}`,
            author: p.displayName,
            removed: false,
          }
        : null;
    }
    default:
      return null;
  }
}

export async function listReports(query: ReportQueueQuery = {}) {
  const limit = Math.min(query.limit ?? 25, 100);

  const rows = await db.report.findMany({
    where: query.status ? { status: query.status } : {},
    // Oldest first: a newest-first queue means old reports are never read.
    orderBy: { createdAt: "asc" },
    take: limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    select: {
      id: true,
      targetType: true,
      targetId: true,
      reason: true,
      details: true,
      status: true,
      createdAt: true,
      reviewedAt: true,
      reviewNote: true,
      reporter: { select: { username: true, displayName: true } },
      reportedProfile: {
        select: {
          id: true,
          username: true,
          displayName: true,
          user: { select: { id: true, status: true } },
        },
      },
    },
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const reports = await Promise.all(
    page.map(async (r) => ({
      id: r.id,
      targetType: r.targetType,
      targetId: r.targetId,
      reason: r.reason,
      details: r.details,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      reviewedAt: r.reviewedAt?.toISOString() ?? null,
      reviewNote: r.reviewNote,
      reporter: r.reporter,
      reported: r.reportedProfile
        ? {
            profileId: r.reportedProfile.id,
            userId: r.reportedProfile.user.id,
            username: r.reportedProfile.username,
            displayName: r.reportedProfile.displayName,
            status: r.reportedProfile.user.status,
          }
        : null,
      target: await resolveTarget(r.targetType, r.targetId),
    })),
  );

  return {
    reports,
    nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
  };
}

export async function countReportsByStatus() {
  const grouped = await db.report.groupBy({
    by: ["status"],
    _count: { status: true },
  });
  const counts: Record<string, number> = {
    OPEN: 0,
    REVIEWING: 0,
    ACTIONED: 0,
    DISMISSED: 0,
  };
  for (const row of grouped) counts[row.status] = row._count.status;
  return counts;
}

export type ReportDecision = "ACTIONED" | "DISMISSED" | "REVIEWING";

const DECISION_TO_AUDIT = {
  ACTIONED: "REPORT_ACTIONED",
  DISMISSED: "REPORT_DISMISSED",
  REVIEWING: "REPORT_REVIEWING",
} as const;

/**
 * Records a decision on a report. Deliberately does *not* also punish the
 * reported member — that is a separate, separately audited action, so nobody
 * can suspend an account as an invisible side effect of clearing a queue.
 */
export async function decideReport(
  actor: StaffViewer,
  reportId: string,
  decision: ReportDecision,
  note?: string,
): Promise<void> {
  const report = await db.report.findUnique({
    where: { id: reportId },
    select: { id: true, status: true, targetType: true, targetId: true },
  });
  if (!report) throw notFound("No such report.");

  await db.$transaction(async (tx) => {
    await tx.report.update({
      where: { id: reportId },
      data: {
        status: decision,
        reviewedAt: decision === "REVIEWING" ? null : new Date(),
        reviewNote: note?.slice(0, 1000) ?? null,
      },
    });
    await recordModerationEventTx(tx, {
      actor,
      action: DECISION_TO_AUDIT[decision],
      targetType: "REPORT",
      targetId: reportId,
      reason: note,
      metadata: {
        previousStatus: report.status,
        reportTargetType: report.targetType,
        reportTargetId: report.targetId,
      },
    });
  });
}
