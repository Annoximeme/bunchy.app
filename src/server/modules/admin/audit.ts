import { db } from "@/server/db/client";
import type { Prisma } from "@/generated/prisma/client";
import type { ModerationAction } from "@/generated/prisma/enums";
import type { StaffViewer } from "@/server/modules/admin/guard";

/**
 * The moderation audit trail.
 *
 * Every staff action writes one of these, and the write happens in the same
 * transaction as the action wherever the action is transactional. Moderation
 * power without a record of who used it is how a platform quietly becomes
 * unaccountable — so this module has no "skip audit" path, and callers cannot
 * mutate moderated state without going through a service that records first.
 *
 * The actor is denormalized into `actorLabel` alongside the foreign key so the
 * trail still reads correctly after a staff account is deleted.
 */

export interface AuditInput {
  actor: StaffViewer;
  action: ModerationAction;
  /** "SITE" is the platform itself — currently only the public on/off gate. */
  targetType:
    | "USER"
    | "PROFILE"
    | "REPORT"
    | "BUNCH"
    | "ACTIVITY"
    | "BUNCH_MESSAGE"
    | "INTEREST"
    | "SITE";
  targetId: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

function toData(input: AuditInput): Prisma.ModerationEventCreateInput {
  return {
    action: input.action,
    actor: { connect: { id: input.actor.userId } },
    actorLabel: `${input.actor.displayName} <${input.actor.email}>`,
    targetType: input.targetType,
    targetId: input.targetId,
    reason: input.reason?.slice(0, 1000) ?? null,
    metadata: (input.metadata ?? undefined) as
      | Prisma.InputJsonValue
      | undefined,
  };
}

export async function recordModerationEvent(input: AuditInput): Promise<void> {
  await db.moderationEvent.create({ data: toData(input) });
}

/**
 * Same record, but on a transaction client so the audit entry and the action it
 * describes commit or roll back together. There is no state in which an action
 * happened without a record of it.
 */
export async function recordModerationEventTx(
  tx: Prisma.TransactionClient,
  input: AuditInput,
): Promise<void> {
  await tx.moderationEvent.create({ data: toData(input) });
}

export interface AuditQuery {
  action?: ModerationAction;
  targetType?: string;
  targetId?: string;
  actorUserId?: string;
  limit?: number;
  cursor?: string;
}

export async function listModerationEvents(query: AuditQuery = {}) {
  const limit = Math.min(query.limit ?? 50, 200);

  const rows = await db.moderationEvent.findMany({
    where: {
      ...(query.action ? { action: query.action } : {}),
      ...(query.targetType ? { targetType: query.targetType } : {}),
      ...(query.targetId ? { targetId: query.targetId } : {}),
      ...(query.actorUserId ? { actorUserId: query.actorUserId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    select: {
      id: true,
      action: true,
      actorLabel: true,
      targetType: true,
      targetId: true,
      reason: true,
      metadata: true,
      createdAt: true,
    },
  });

  const hasMore = rows.length > limit;
  const events = hasMore ? rows.slice(0, limit) : rows;

  return {
    events: events.map((e) => ({
      ...e,
      createdAt: e.createdAt.toISOString(),
    })),
    nextCursor: hasMore ? (events.at(-1)?.id ?? null) : null,
  };
}
