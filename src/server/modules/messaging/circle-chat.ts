import { db } from "@/server/db/client";
import { forbidden, notFound } from "@/server/errors";
import { consume } from "@/server/ratelimit";
import { notify } from "@/server/modules/notifications/service";
import type { CircleMessageInput } from "@/server/modules/circles/schemas";

/**
 * Circle chat.
 *
 * Text, replies, reactions, mentions and system messages, with moderation
 * hooks. The read model is a plain cursor over `createdAt`, which is what makes
 * the streaming endpoint (`/api/circles/[id]/stream`) trivial: it is the same
 * query with a moving cursor. When voice or video arrives it becomes another
 * `CircleMessageKind` plus a payload column rather than a new subsystem.
 */

export interface CircleMessageView {
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

async function requireActiveMember(circleId: string, profileId: string) {
  const membership = await db.circleMembership.findUnique({
    where: { circleId_profileId: { circleId, profileId } },
    select: { role: true, status: true },
  });
  if (!membership || membership.status !== "ACTIVE") {
    throw forbidden("You're not a member of this circle.");
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
): CircleMessageView {
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
  circleId: string,
  profileId: string,
  options: { before?: string; after?: string; limit?: number } = {},
): Promise<CircleMessageView[]> {
  const membership = await requireActiveMember(circleId, profileId);
  const limit = Math.min(options.limit ?? 50, 100);

  const cursorFilter = options.after
    ? { createdAt: { gt: new Date(options.after) } }
    : options.before
      ? { createdAt: { lt: new Date(options.before) } }
      : {};

  const rows = await db.circleMessage.findMany({
    where: { circleId, ...cursorFilter },
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
  circleId: string,
  authorId: string,
  input: CircleMessageInput,
): Promise<CircleMessageView> {
  await requireActiveMember(circleId, authorId);
  await consume("message", authorId);

  const circle = await db.circle.findUniqueOrThrow({
    where: { id: circleId },
    select: { name: true },
  });

  // Only mention people who are actually in the circle — otherwise a mention is
  // a way to notify a stranger.
  const validMentions =
    input.mentionProfileIds.length > 0
      ? await db.circleMembership.findMany({
          where: {
            circleId,
            status: "ACTIVE",
            profileId: { in: input.mentionProfileIds },
          },
          select: { profileId: true },
        })
      : [];

  if (input.parentId) {
    const parent = await db.circleMessage.findFirst({
      where: { id: input.parentId, circleId },
      select: { id: true },
    });
    if (!parent) throw notFound("The message you're replying to is gone.");
  }

  const created = await db.circleMessage.create({
    data: {
      circleId,
      authorId,
      body: input.body,
      parentId: input.parentId ?? null,
      mentions: {
        create: validMentions.map((m) => ({ profileId: m.profileId })),
      },
    },
    select: MESSAGE_SELECT,
  });

  await bumpActivityScore(circleId);
  await fanOutNotifications(circleId, circle.name, authorId, created.id, input.parentId, validMentions.map((m) => m.profileId));

  return toView(created as MessageRow, authorId, false);
}

/**
 * Notifies the people a message concerns: whoever was replied to, and whoever
 * was mentioned. Not the whole circle — a busy circle would otherwise notify
 * everyone about everything, which is how people end up muting a group and
 * drifting away from it.
 */
async function fanOutNotifications(
  circleId: string,
  circleName: string,
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
    const parent = await db.circleMessage.findUnique({
      where: { id: parentId },
      select: { authorId: true },
    });
    if (parent?.authorId && !notified.has(parent.authorId)) {
      notified.add(parent.authorId);
      await notify({
        profileId: parent.authorId,
        actorProfileId: authorId,
        type: "CIRCLE_MESSAGE_REPLY",
        title: `${name} replied to you in ${circleName}`,
        linkPath: `/circles/${circleId}#${messageId}`,
        groupKey: `circle-reply:${circleId}`,
      });
    }
  }

  for (const profileId of mentionedProfileIds) {
    if (notified.has(profileId)) continue;
    notified.add(profileId);
    await notify({
      profileId,
      actorProfileId: authorId,
      type: "CIRCLE_MENTION",
      title: `${name} mentioned you in ${circleName}`,
      linkPath: `/circles/${circleId}#${messageId}`,
      groupKey: `circle-mention:${circleId}`,
    });
  }
}

/**
 * Rolling activity level, 0-1, decayed by age.
 *
 * Used to rank circles in Discover and to spot circles that have gone quiet. It
 * is never rendered as a public number or a rank — a leaderboard of circles is
 * exactly the popularity hierarchy this product is trying not to build.
 */
export async function bumpActivityScore(circleId: string): Promise<void> {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const [messageCount, memberCount] = await Promise.all([
    db.circleMessage.count({
      where: { circleId, kind: "TEXT", createdAt: { gte: since } },
    }),
    db.circleMembership.count({ where: { circleId, status: "ACTIVE" } }),
  ]);

  // Messages per member per fortnight, saturating at ~10.
  const perMember = messageCount / Math.max(1, memberCount);
  const score = Math.min(1, perMember / 10);

  await db.circle.update({
    where: { id: circleId },
    data: { activityScore: score },
  });
}

export async function toggleReaction(
  messageId: string,
  profileId: string,
  emoji: string,
): Promise<{ reacted: boolean }> {
  const message = await db.circleMessage.findUnique({
    where: { id: messageId },
    select: { circleId: true, deletedAt: true },
  });
  if (!message || message.deletedAt) throw notFound("That message is gone.");
  await requireActiveMember(message.circleId, profileId);

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
  const message = await db.circleMessage.findUnique({
    where: { id: messageId },
    select: { circleId: true, authorId: true, deletedAt: true },
  });
  if (!message || message.deletedAt) throw notFound("That message is gone.");

  const membership = await requireActiveMember(message.circleId, profileId);
  const isModerator = membership.role !== "MEMBER";
  const isAuthor = message.authorId === profileId;
  if (!isModerator && !isAuthor) throw forbidden();

  await db.circleMessage.update({
    where: { id: messageId },
    data: {
      deletedAt: new Date(),
      ...(isModerator && !isAuthor ? { moderatedAt: new Date() } : {}),
    },
  });
}

export async function markCircleRead(
  circleId: string,
  profileId: string,
): Promise<void> {
  await db.circleMembership
    .update({
      where: { circleId_profileId: { circleId, profileId } },
      data: { lastReadAt: new Date() },
    })
    .catch(() => {});
}
