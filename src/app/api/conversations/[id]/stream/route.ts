import { requireViewer } from "@/server/auth/current-user";
import { errorResponse } from "@/server/http/route";
import { eventStream } from "@/server/http/sse";
import { messagesSince } from "@/server/modules/messaging/direct";

/**
 * A one-to-one conversation, live.
 *
 * Bunch chat has streamed since it shipped while direct messages re-fetched
 * the whole thread every five seconds, which is the wrong way round: a group
 * chat tolerates a lag that a conversation between two people does not, and
 * the five seconds were the reason a reply felt like it arrived late even when
 * it had not.
 *
 * The stream carries the other person's read mark and whether they are typing
 * alongside the messages, because both change with no message being sent and
 * are therefore invisible to anything that only watches for new messages. Each
 * is sent when it moves and not otherwise, so an idle conversation costs the
 * keep-alive and nothing else.
 */

const POLL_INTERVAL_MS = 2000;

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const viewer = await requireViewer();
    const { id: conversationId } = await context.params;

    let cursor = new Date().toISOString();
    // Only sent when it moves. A read mark that has not changed is not news,
    // and re-sending it every two seconds would make the client re-render a
    // conversation nobody is touching.
    let lastSeenSent: string | null = null;
    let lastTypingSent = false;

    // Participation is proved here, and again on every tick by messagesSince.
    const initial = await messagesSince(conversationId, viewer.profileId, cursor);
    lastSeenSent = initial.otherLastReadAt;
    lastTypingSent = initial.otherTyping;

    return eventStream({
      profileId: viewer.profileId,
      request,
      intervalMs: POLL_INTERVAL_MS,
      ready: {
        cursor,
        otherLastReadAt: initial.otherLastReadAt,
        otherTyping: initial.otherTyping,
      },
      tick: async ({ send }) => {
        const { messages, otherLastReadAt, otherTyping } = await messagesSince(
          conversationId,
          viewer.profileId,
          cursor,
        );

        if (messages.length > 0) {
          cursor = messages.at(-1)!.createdAt;
          send("messages", { messages });
        }
        if (otherLastReadAt !== lastSeenSent) {
          lastSeenSent = otherLastReadAt;
          send("read", { otherLastReadAt });
        }
        if (otherTyping !== lastTypingSent) {
          lastTypingSent = otherTyping;
          send("typing", { otherTyping });
        }
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
