import { db } from "@/server/db/client";
import { hashToken, issueToken } from "@/server/auth/tokens";

/**
 * Session lifecycle, expressed purely in terms of tokens and rows.
 *
 * Nothing here knows about cookies or requests — `cookies.ts` owns that glue.
 * Keeping the split means sessions can be exercised in tests without a fake
 * HTTP layer.
 */

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/** Refresh `lastUsedAt`/`expiresAt` at most once an hour to avoid a write per request. */
const SLIDING_REFRESH_THRESHOLD_MS = 60 * 60 * 1000;

export interface SessionContext {
  userAgent?: string | null;
  ipHash?: string | null;
}

export async function createSession(
  userId: string,
  context: SessionContext = {},
): Promise<{ token: string; expiresAt: Date }> {
  const { token, hash } = issueToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.session.create({
    data: {
      userId,
      tokenHash: hash,
      expiresAt,
      userAgent: context.userAgent?.slice(0, 500) ?? null,
      ipHash: context.ipHash ?? null,
    },
  });

  return { token, expiresAt };
}

export interface ResolvedSession {
  sessionId: string;
  userId: string;
  profileId: string | null;
}

/**
 * Validates a raw session token. Returns null for anything unusable — expired,
 * unknown, or belonging to a suspended account — so callers have a single
 * "not signed in" path.
 */
export async function resolveSession(
  token: string | undefined,
): Promise<ResolvedSession | null> {
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      lastUsedAt: true,
      user: {
        select: { status: true, profile: { select: { id: true } } },
      },
    },
  });

  if (!session) return null;

  if (session.expiresAt.getTime() <= Date.now()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  if (session.user.status !== "ACTIVE") return null;

  const sinceLastUse = Date.now() - session.lastUsedAt.getTime();
  if (sinceLastUse > SLIDING_REFRESH_THRESHOLD_MS) {
    await db.session
      .update({
        where: { id: session.id },
        data: {
          lastUsedAt: new Date(),
          expiresAt: new Date(Date.now() + SESSION_TTL_MS),
        },
      })
      .catch(() => {});
  }

  return {
    sessionId: session.id,
    userId: session.userId,
    profileId: session.user.profile?.id ?? null,
  };
}

export async function revokeSession(token: string | undefined): Promise<void> {
  if (!token) return;
  await db.session
    .deleteMany({ where: { tokenHash: hashToken(token) } })
    .catch(() => {});
}

/** Used after a password change: every other device must sign in again. */
export async function revokeAllSessionsForUser(
  userId: string,
  exceptSessionId?: string,
): Promise<void> {
  await db.session.deleteMany({
    where: {
      userId,
      ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
    },
  });
}

export async function pruneExpiredSessions(): Promise<number> {
  const { count } = await db.session.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return count;
}
