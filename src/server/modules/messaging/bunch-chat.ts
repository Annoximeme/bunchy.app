import { db } from "@/server/db/client";
import { forbidden, notFound } from "@/server/errors";
import { consume } from "@/server/ratelimit";
import { notify } from "@/server/modules/notifications/service";
import type { BunchMessageInput } from "@/server/modules/bunches/schemas";
import { track } from "@/server/modules/analytics/track";
import { ANALYTICS_EVENTS } from "@/server/modules/analytics/events";

/**
 * Bunch chat.
 *
 * Text, replies, reactions, mentions and system messages, with moderation
 * hooks. The read model is a plain cursor over `createdAt`, which is what makes
 * the streaming endpoint (`/api/bunches/[id]/stream`) trivial: it is the same
 * query with a moving cursor. When voice or video arrives it becomes another
 * `BunchMessageKind` plus a payload column rather than a new subsystem.
 */

export interface BunchMessageView {
  id: string;
  kind: "TEXT" | "SYSTEM";
  body: string;
  createdAt: string;
  editedAt: string | null;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
  parent: { id: string; body: string; authorName: string | null } | null;
  reactions: Array<{ emoji: string; count: number; reactedByViewer: boolean }>;
  mentionsViewer: boolean;
  canModerate: boolean;
}

const MESSAGE_SELECT = {
  id: true,
  kind: true,
  body: true,
  createdAt: true,
  editedAt: true,
  deletedAt: true,
  authorId: true,
  author: {
    select: { id: true, username: true, displayName: true, avatarUrl: true },
  },
  parent: {
    select: { id: true, body: true, author: { select: { displayName: true } } },
  },
  reactions: { select: { emoji: true, profileId: true } },
  mentions: { select: { profileId: true } },
} as const;

async function requireActiveMember(bunchId: string, profileId: string) {
  const membership = await db.bunchMembership.findUnique({
    where: { bunchId_profileId: { bunchId, profileId } },
    select: { role: true, status: true },
  });
  if (!membership || membership.status !== "ACTIVE") {
    throw forbidden("You're not a member of this bunch.");
  }
  return membership;
}

type MessageRow = {
  id: string;
  kind: string;
  body: string;
  createdAt: Date;
  editedAt: Date | null;
  deletedAt: Date | null;
  authorId: string | null;
  author: { id: string; username: string; displayName: string; avatarUrl: string | null } | null;
  parent: { id: string; body: string; author: { displayName: string } | null } | null;
  reactions: Array<{ emoji: string; profileId: string }>;
  mentions: Array<{ profileId: string }>;
};

function toView(
  row: MessageRow,
  viewerProfileId: string,
  viewerIsModerator: boolean,
): BunchMessageView {
  const byEmoji = new Map<string, { count: number; viewer: boolean }>();
  for (const reaction of row.reactions) {
    const entry = byEmoji.get(reaction.emoji) ?? { count: 0, viewer: false };
    entry.count += 1;
    if (reaction.profileId === viewerProfileId) entry.viewer = true;
    byEmoji.set(reaction.emoji, entry);
  }

  const removed = row.deletedAt !== null;

  return {
    id: row.id,
    kind: row.kind === "SYSTEM" ? "SYSTEM" : "TEXT",
    body: removed ? "This message was removed." : row.body,
    createdAt: row.createdAt.toISOString(),
    editedAt: row.editedAt?.toISOString() ?? null,
    author: removed ? null : row.author,
    parent: row.parent
      ? {
          id: row.parent.id,
          body: row.parent.body.slice(0, 140),
          authorName: row.parent.author?.displayName ?? null,
        }
      : null,
    reactions: [...byEmoji.entries()].map(([emoji, v]) => ({
      emoji,
      count: v.count,
      reactedByViewer: v.viewer,
    })),
    mentionsViewer: row.mentions.some((m) => m.profileId === viewerProfileId),
    canModerate:
      !removed && (viewerIsModerator || row.authorId === viewerProfileId),
  };
}

export async function listMessages(
  bunchId: string,
  profileId: string,
  options: { before?: string; after?: string; limit?: number } = {},
): Promise<BunchMessageView[]> {
  const membership = await requireActiveMember(bunchId, profileId);
  const limit = Math.min(options.limit ?? 50, 100);

  const cursorFilter = options.after
    ? { createdAt: { gt: new Date(options.after) } }
    : options.before
      ? { createdAt: { lt: new Date(options.before) } }
      : {};

  const rows = await db.bunchMessage.findMany({
    where: { bunchId, ...cursorFilter },
    select: MESSAGE_SELECT,
    orderBy: { createdAt: options.after ? "asc" : "desc" },
    take: limit,
  });

  const isModerator = membership.role !== "MEMBER";
  const views = (rows as MessageRow[]).map((row) =>
    toView(row, profileId, isModerator),
  );

  // Always hand back oldest-first; the cursor direction is an implementation
  // detail the client should not have to think about.
  return options.after ? views : views.reverse();
}

export async function postMessage(
  bunchId: string,
  authorId: string,
  input: BunchMessageInput,
): Promise<BunchMessageView> {
  await requireActiveMember(bunchId, authorId);
  await consume("message", authorId);

  const bunch = await db.bunch.findUniqueOrThrow({
    where: { id: bunchId },
    select: { name: true },
  });

  // Only mention people who are actually in the bunch — otherwise a mention is
  // a way to notify a stranger.
  const validMentions =
    input.mentionProfileIds.length > 0
      ? await db.bunchMembership.findMany({
          where: {
            bunchId,
            status: "ACTIVE",
            profileId: { in: input.mentionProfileIds },
          },
          select: { profileId: true },
        })
      : [];

  if (input.parentId) {
    const parent = await db.bunchMessage.findFirst({
      where: { id: input.parentId, bunchId },
      select: { id: true },
    });
    if (!parent) throw notFound("The message you're replying to is gone.");
  }

  const created = await db.bunchMessage.create({
    data: {
      bunchId,
      authorId,
      body: input.body,
      parentId: input.parentId ?? null,
      mentions: {
        create: validMentions.map((m) => ({ profileId: m.profileId })),
      },
    },
    select: MESSAGE_SELECT,
  });

  track({
    name: ANALYTICS_EVENTS.BUNCH_MESSAGE_SENT,
    profileId: authorId,
    properties: { bunchId, isReply: Boolean(input.parentId) },
  });

  await bumpActivityScore(bunchId);
  await fanOutNotifications(bunchId, bunch.name, authorId, created.id, input.parentId, validMentions.map((m) => m.profileId));

  return toView(created as MessageRow, authorId, false);
}

/**
 * Notifies the people a message concerns: whoever was replied to, and whoever
 * was mentioned. Not the whole bunch — a busy bunch would otherwise notify
 * everyone about everything, which is how people end up muting a group and
 * drifting away from it.
 */
async function fanOutNotifications(
  bunchId: string,
  bunchName: string,
  authorId: string,
  messageId: string,
  parentId: string | undefined,
  mentionedProfileIds: string[],
): Promise<void> {
  const author = await db.profile.findUnique({
    where: { id: authorId },
    select: { displayName: true },
  });
  const name = author?.displayName ?? "Someone";
  const notified = new Set<string>([authorId]);

  if (parentId) {
    const parent = await db.bunchMessage.findUnique({
      where: { id: parentId },
      select: { authorId: true },
    });
    if (parent?.authorId && !notified.has(parent.authorId)) {
      notified.add(parent.authorId);
      await notify({
        profileId: parent.authorId,
        actorProfileId: authorId,
        type: "BUNCH_MESSAGE_REPLY",
        title: `${name} replied to you in ${bunchName}`,
        linkPath: `/bunches/${bunchId}#${messageId}`,
        groupKey: `bunch-reply:${bunchId}`,
      });
    }
  }

  for (const profileId of mentionedProfileIds) {
    if (notified.has(profileId)) continue;
    notified.add(profileId);
    await notify({
      profileId,
      actorProfileId: authorId,
      type: "BUNCH_MENTION",
      title: `${name} mentioned you in ${bunchName}`,
      linkPath: `/bunches/${bunchId}#${messageId}`,
      groupKey: `bunch-mention:${bunchId}`,
    });
  }
}

/**
 * Rolling activity level, 0-1, decayed by age.
 *
 * Used to rank bunches in Discover and to spot bunches that have gone quiet. It
 * is never rendered as a public number or a rank — a leaderboard of bunches is
 * exactly the popularity hierarchy this product is trying not to build.
 */
export async function bumpActivityScore(bunchId: string): Promise<void> {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const [messageCount, memberCount] = await Promise.all([
    db.bunchMessage.count({
      where: { bunchId, kind: "TEXT", createdAt: { gte: since } },
    }),
    db.bunchMembership.count({ where: { bunchId, status: "ACTIVE" } }),
  ]);

  // Messages per member per fortnight, saturating at ~10.
  const perMember = messageCount / Math.max(1, memberCount);
  const score = Math.min(1, perMember / 10);

  await db.bunch.update({
    where: { id: bunchId },
    data: { activityScore: score },
  });
}

export async function toggleReaction(
  messageId: string,
  profileId: string,
  emoji: string,
): Promise<{ reacted: boolean }> {
  const message = await db.bunchMessage.findUnique({
    where: { id: messageId },
    select: { bunchId: true, deletedAt: true },
  });
  if (!message || message.deletedAt) throw notFound("That message is gone.");
  await requireActiveMember(message.bunchId, profileId);

  const existing = await db.messageReaction.findUnique({
    where: { messageId_profileId_emoji: { messageId, profileId, emoji } },
    select: { emoji: true },
  });

  if (existing) {
    await db.messageReaction.delete({
      where: { messageId_profileId_emoji: { messageId, profileId, emoji } },
    });
    return { reacted: false };
  }

  await db.messageReaction.create({ data: { messageId, profileId, emoji } });
  return { reacted: true };
}

/** Authors delete their own messages; moderators remove anyone's. */
export async function deleteMessage(
  messageId: string,
  profileId: string,
): Promise<void> {
  const message = await db.bunchMessage.findUnique({
    where: { id: messageId },
    select: { bunchId: true, authorId: true, deletedAt: true },
  });
  if (!message || message.deletedAt) throw notFound("That message is gone.");

  const membership = await requireActiveMember(message.bunchId, profileId);
  const isModerator = membership.role !== "MEMBER";
  const isAuthor = message.authorId === profileId;
  if (!isModerator && !isAuthor) throw forbidden();

  await db.bunchMessage.update({
    where: { id: messageId },
    data: {
      deletedAt: new Date(),
      ...(isModerator && !isAuthor ? { moderatedAt: new Date() } : {}),
    },
  });
}

export async function markBunchRead(
  bunchId: string,
  profileId: string,
): Promise<void> {
  await db.bunchMembership
    .update({
      where: { bunchId_profileId: { bunchId, profileId } },
      data: { lastReadAt: new Date() },
    })
    .catch(() => {});
}
