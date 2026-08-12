import { db } from "@/server/db/client";
import { conflict, notFound, validationFailed } from "@/server/errors";
import { revokeAllSessionsForUser } from "@/server/auth/session";
import { recordModerationEventTx } from "@/server/modules/admin/audit";
import {
  refusalToActOn,
  type StaffViewer,
} from "@/server/modules/admin/guard";
import type { UserRole, UserStatus } from "@/generated/prisma/enums";

/**
 * Account administration.
 *
 * Two invariants hold across every function here:
 *
 * - **Nothing mutates without an audit entry**, written in the same transaction
 *   as the change.
 * - **Staff cannot act on themselves or on their equals.** A moderator cannot
 *   touch an admin, and nobody can suspend, ban or demote their own account.
 *   Without that, one compromised staff session can lock out everyone else.
 */

async function loadTarget(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      status: true,
      role: true,
      suspendedUntil: true,
      profile: { select: { id: true, username: true, displayName: true } },
    },
  });
  if (!user) throw notFound("No such account.");
  return user;
}

/**
 * Rank check. A moderator may only act on ordinary members; an admin may act on
 * moderators but not on another admin. The matrix itself lives in `guard.ts` as
 * a pure function so it can be tested exhaustively.
 */
function assertOutranks(
  actor: StaffViewer,
  target: { id: string; role: UserRole },
): void {
  const refusal = refusalToActOn(
    { userId: actor.userId, role: actor.role },
    { userId: target.id, role: target.role },
  );
  if (refusal) throw conflict(refusal);
}

export interface UserSearchQuery {
  q?: string;
  status?: UserStatus;
  role?: UserRole;
  limit?: number;
  cursor?: string;
}

export async function searchUsers(query: UserSearchQuery = {}) {
  const limit = Math.min(query.limit ?? 25, 100);
  const needle = query.q?.trim();

  const rows = await db.user.findMany({
    where: {
      ...(query.status ? { status: query.status } : {}),
      ...(query.role ? { role: query.role } : {}),
      ...(needle
        ? {
            OR: [
              { email: { contains: needle, mode: "insensitive" as const } },
              {
                profile: {
                  username: { contains: needle, mode: "insensitive" as const },
                },
              },
              {
                profile: {
                  displayName: {
                    contains: needle,
                    mode: "insensitive" as const,
                  },
                },
              },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    select: {
      id: true,
      email: true,
      status: true,
      role: true,
      suspendedUntil: true,
      emailVerifiedAt: true,
      createdAt: true,
      profile: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          cityLabel: true,
          lastActiveAt: true,
          onboardingStage: true,
          _count: {
            select: {
              bunchMemberships: { where: { status: "ACTIVE" } },
              reportsAbout: true,
            },
          },
        },
      },
    },
  });

  const hasMore = rows.length > limit;
  const users = hasMore ? rows.slice(0, limit) : rows;

  return {
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      status: u.status,
      role: u.role,
      suspendedUntil: u.suspendedUntil?.toISOString() ?? null,
      emailVerified: u.emailVerifiedAt !== null,
      createdAt: u.createdAt.toISOString(),
      profileId: u.profile?.id ?? null,
      username: u.profile?.username ?? null,
      displayName: u.profile?.displayName ?? null,
      avatarUrl: u.profile?.avatarUrl ?? null,
      cityLabel: u.profile?.cityLabel ?? null,
      lastActiveAt: u.profile?.lastActiveAt.toISOString() ?? null,
      onboardingStage: u.profile?.onboardingStage ?? null,
      bunchCount: u.profile?._count.bunchMemberships ?? 0,
      reportsAgainst: u.profile?._count.reportsAbout ?? 0,
    })),
    nextCursor: hasMore ? (users.at(-1)?.id ?? null) : null,
  };
}

/** Everything staff need on one account, including its moderation history. */
export async function getUserDetail(userId: string) {
  const user = await loadTarget(userId);

  const [reportsAgainst, history, sessions] = await Promise.all([
    user.profile
      ? db.report.findMany({
          where: { reportedProfileId: user.profile.id },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            reason: true,
            status: true,
            targetType: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
    db.moderationEvent.findMany({
      where: { targetType: "USER", targetId: userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        action: true,
        actorLabel: true,
        reason: true,
        createdAt: true,
      },
    }),
    db.session.count({ where: { userId, expiresAt: { gt: new Date() } } }),
  ]);

  return {
    id: user.id,
    email: user.email,
    status: user.status,
    role: user.role,
    suspendedUntil: user.suspendedUntil?.toISOString() ?? null,
    profileId: user.profile?.id ?? null,
    username: user.profile?.username ?? null,
    displayName: user.profile?.displayName ?? null,
    activeSessions: sessions,
    reportsAgainst: reportsAgainst.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
    history: history.map((h) => ({ ...h, createdAt: h.createdAt.toISOString() })),
  };
}

export interface SuspendInput {
  userId: string;
  reason: string;
  /** Null suspends indefinitely. */
  days: number | null;
}

export async function suspendUser(
  actor: StaffViewer,
  input: SuspendInput,
): Promise<void> {
  const target = await loadTarget(input.userId);
  assertOutranks(actor, target);
  if (target.status === "BANNED") {
    throw conflict("That account is already banned.");
  }
  if (input.days !== null && (input.days < 1 || input.days > 365)) {
    throw validationFailed("A suspension runs between 1 and 365 days.");
  }

  const suspendedUntil =
    input.days === null
      ? null
      : new Date(Date.now() + input.days * 24 * 60 * 60 * 1000);

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: target.id },
      data: { status: "SUSPENDED", suspendedUntil },
    });
    await recordModerationEventTx(tx, {
      actor,
      action: "USER_SUSPENDED",
      targetType: "USER",
      targetId: target.id,
      reason: input.reason,
      metadata: {
        previousStatus: target.status,
        days: input.days,
        until: suspendedUntil?.toISOString() ?? null,
      },
    });
  });

  // Suspension that leaves live sessions working is not a suspension.
  await revokeAllSessionsForUser(target.id);
}

export async function unsuspendUser(
  actor: StaffViewer,
  userId: string,
  reason: string,
): Promise<void> {
  const target = await loadTarget(userId);
  assertOutranks(actor, target);
  if (target.status !== "SUSPENDED") {
    throw conflict("That account is not suspended.");
  }

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: target.id },
      data: { status: "ACTIVE", suspendedUntil: null },
    });
    await recordModerationEventTx(tx, {
      actor,
      action: "USER_UNSUSPENDED",
      targetType: "USER",
      targetId: target.id,
      reason,
    });
  });
}

export async function banUser(
  actor: StaffViewer,
  userId: string,
  reason: string,
): Promise<void> {
  const target = await loadTarget(userId);
  assertOutranks(actor, target);
  if (target.status === "BANNED") throw conflict("Already banned.");

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: target.id },
      data: { status: "BANNED", suspendedUntil: null },
    });
    // A banned account must also stop appearing to everyone else.
    if (target.profile) {
      await tx.privacySettings.updateMany({
        where: { profileId: target.profile.id },
        data: { discoverable: false },
      });
    }
    await recordModerationEventTx(tx, {
      actor,
      action: "USER_BANNED",
      targetType: "USER",
      targetId: target.id,
      reason,
      metadata: { previousStatus: target.status },
    });
  });

  await revokeAllSessionsForUser(target.id);
}

export async function unbanUser(
  actor: StaffViewer,
  userId: string,
  reason: string,
): Promise<void> {
  const target = await loadTarget(userId);
  assertOutranks(actor, target);
  if (target.status !== "BANNED") throw conflict("That account is not banned.");

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: target.id },
      data: { status: "ACTIVE" },
    });
    await recordModerationEventTx(tx, {
      actor,
      action: "USER_UNBANNED",
      targetType: "USER",
      targetId: target.id,
      reason,
    });
  });
}

/**
 * Role changes are admin-only and never self-applied — an admin cannot demote
 * themselves into a state where nobody can restore them.
 */
export async function setUserRole(
  actor: StaffViewer,
  userId: string,
  role: UserRole,
  reason: string,
): Promise<void> {
  if (actor.role !== "ADMIN") throw notFound();
  if (actor.userId === userId) {
    throw conflict("You can't change your own role.");
  }

  const target = await loadTarget(userId);
  if (target.role === role) throw conflict("That is already their role.");
  if (target.role === "ADMIN") {
    throw conflict("Another admin's role can't be changed from the dashboard.");
  }

  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: target.id }, data: { role } });
    await recordModerationEventTx(tx, {
      actor,
      action: "USER_ROLE_CHANGED",
      targetType: "USER",
      targetId: target.id,
      reason,
      metadata: { from: target.role, to: role },
    });
  });

  // Privilege changes take effect immediately, not at the next natural logout.
  await revokeAllSessionsForUser(target.id);
}
