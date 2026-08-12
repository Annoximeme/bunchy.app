import { db } from "@/server/db/client";
import { forbidden, notFound } from "@/server/errors";
import { consume } from "@/server/ratelimit";
import { isBlockedBetween } from "@/server/modules/moderation/service";
import { notify } from "@/server/modules/notifications/service";
import { assistant } from "@/server/modules/ai";
import { GOAL_LABELS } from "@/server/modules/profile/serialize";

/**
 * Direct messages between connected members.
 *
 * There is no way to start a conversation here. Conversations are created by
 * `connections.respondToRequest` when someone accepts — which means an
 * unwanted message is not something we filter, it is something that has no code
 * path to exist.
 */

export interface ConversationSummary {
  id: string;
  other: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  lastMessage: { body: string; createdAt: string; fromViewer: boolean } | null;
  unreadCount: number;
}

export async function listConversations(
  profileId: string,
): Promise<ConversationSummary[]> {
  const rows = await db.conversation.findMany({
    where: { participants: { some: { profileId } } },
    select: {
      id: true,
      lastMessageAt: true,
      participants: {
        select: {
          profileId: true,
          lastReadAt: true,
          profile: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true, createdAt: true, senderId: true, deletedAt: true },
      },
    },
    orderBy: { lastMessageAt: "desc" },
  });

  const summaries = await Promise.all(
    rows.map(async (row) => {
      const viewer = row.participants.find((p) => p.profileId === profileId);
      const other = row.participants.find((p) => p.profileId !== profileId);
      if (!other) return null;

      const unreadCount = await db.directMessage.count({
        where: {
          conversationId: row.id,
          senderId: { not: profileId },
          deletedAt: null,
          ...(viewer?.lastReadAt ? { createdAt: { gt: viewer.lastReadAt } } : {}),
        },
      });

      const last = row.messages[0];

      return {
        id: row.id,
        other: other.profile,
        lastMessage: last
          ? {
              body: last.deletedAt ? "Message removed" : last.body,
              createdAt: last.createdAt.toISOString(),
              fromViewer: last.senderId === profileId,
            }
          : null,
        unreadCount,
      } satisfies ConversationSummary;
    }),
  );

  return summaries.filter((s): s is ConversationSummary => s !== null);
}

async function requireParticipant(conversationId: string, profileId: string) {
  const participant = await db.conversationParticipant.findUnique({
    where: { conversationId_profileId: { conversationId, profileId } },
    select: { conversationId: true },
  });
  if (!participant) throw notFound("That conversation doesn't exist.");

  const other = await db.conversationParticipant.findFirst({
    where: { conversationId, profileId: { not: profileId } },
    select: { profileId: true },
  });
  if (!other) throw notFound("That conversation doesn't exist.");

  return other.profileId;
}

export async function getConversation(
  conversationId: string,
  profileId: string,
  options: { limit?: number; before?: string } = {},
) {
  const otherProfileId = await requireParticipant(conversationId, profileId);
  const limit = Math.min(options.limit ?? 50, 100);

  const [other, messages, blockedEither] = await Promise.all([
    db.profile.findUniqueOrThrow({
      where: { id: otherProfileId },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
      },
    }),
    db.directMessage.findMany({
      where: {
        conversationId,
        ...(options.before ? { createdAt: { lt: new Date(options.before) } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        body: true,
        senderId: true,
        createdAt: true,
        deletedAt: true,
      },
    }),
    isBlockedBetween(profileId, otherProfileId),
  ]);

  await db.conversationParticipant
    .update({
      where: { conversationId_profileId: { conversationId, profileId } },
      data: { lastReadAt: new Date() },
    })
    .catch(() => {});

  return {
    id: conversationId,
    other,
    // A block makes the history readable but the composer inert.
    readOnly: blockedEither,
    messages: messages.reverse().map((m) => ({
      id: m.id,
      body: m.deletedAt ? "Message removed" : m.body,
      createdAt: m.createdAt.toISOString(),
      fromViewer: m.senderId === profileId,
      deleted: m.deletedAt !== null,
    })),
  };
}

export async function sendDirectMessage(
  conversationId: string,
  senderId: string,
  body: string,
): Promise<{ id: string; createdAt: string }> {
  const otherProfileId = await requireParticipant(conversationId, senderId);
  await consume("message", senderId);

  if (await isBlockedBetween(senderId, otherProfileId)) {
    throw forbidden("You can't send messages in this conversation.");
  }

  const [message] = await db.$transaction([
    db.directMessage.create({
      data: { conversationId, senderId, body: body.slice(0, 4000) },
      select: { id: true, createdAt: true },
    }),
    db.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    }),
  ]);

  const sender = await db.profile.findUnique({
    where: { id: senderId },
    select: { displayName: true },
  });

  await notify({
    profileId: otherProfileId,
    actorProfileId: senderId,
    type: "DIRECT_MESSAGE",
    title: `New message from ${sender?.displayName ?? "someone"}`,
    linkPath: `/messages/${conversationId}`,
    groupKey: `dm:${conversationId}`,
  });

  return { id: message.id, createdAt: message.createdAt.toISOString() };
}

export async function markConversationRead(
  conversationId: string,
  profileId: string,
): Promise<void> {
  await db.conversationParticipant
    .update({
      where: { conversationId_profileId: { conversationId, profileId } },
      data: { lastReadAt: new Date() },
    })
    .catch(() => {});
}

/**
 * "You both like Warhammer, strategy games and AI — here's something to say."
 *
 * Computed on demand from what the two people have in common rather than stored,
 * so it stays truthful as profiles change.
 */
export async function conversationContext(
  conversationId: string,
  profileId: string,
) {
  const otherProfileId = await requireParticipant(conversationId, profileId);

  const [viewer, other] = await Promise.all([
    db.profile.findUniqueOrThrow({
      where: { id: profileId },
      select: {
        displayName: true,
        interests: {
          select: {
            intent: true,
            interest: { select: { slug: true, label: true } },
          },
        },
      },
    }),
    db.profile.findUniqueOrThrow({
      where: { id: otherProfileId },
      select: {
        displayName: true,
        interests: {
          select: {
            intent: true,
            interest: { select: { slug: true, label: true } },
          },
        },
        goals: { select: { goal: true } },
      },
    }),
  ]);

  const viewerBySlug = new Map(
    viewer.interests.map((i) => [i.interest.slug, i] as const),
  );

  const shared: string[] = [];
  const complementary: string[] = [];

  for (const theirs of other.interests) {
    const mine = viewerBySlug.get(theirs.interest.slug);
    if (!mine) continue;
    if (mine.intent === theirs.intent) {
      shared.push(theirs.interest.label);
    } else {
      // One practices it, the other is curious — worth calling out separately.
      complementary.push(theirs.interest.label);
    }
  }

  const starters = await assistant().conversationStarters({
    viewerName: viewer.displayName,
    otherName: other.displayName,
    sharedInterests: shared,
    complementaryInterests: complementary,
    otherGoals: other.goals.map((g) => GOAL_LABELS[g.goal] ?? g.goal),
  });

  return { sharedInterests: shared, complementaryInterests: complementary, starters };
}
