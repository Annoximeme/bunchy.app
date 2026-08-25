import { requireViewer } from "@/server/auth/current-user";
import { errorResponse } from "@/server/http/route";
import { eventStream } from "@/server/http/sse";
import { listMessages } from "@/server/modules/messaging/bunch-chat";

/**
 * Live bunch chat over Server-Sent Events.
 *
 * The transport, the connection ceiling and the keep-alive all live in
 * `@/server/http/sse`, which this and the direct-message stream share. What is
 * left here is the only part that is about bunch chat: check the membership,
 * then tail the cursor.
 */

const POLL_INTERVAL_MS = 2000;

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const viewer = await requireViewer();
    const { id: bunchId } = await context.params;

    // Membership is checked here, and again on every tick by listMessages.
    await listMessages(bunchId, viewer.profileId, { limit: 1 });

    let cursor = new Date().toISOString();

    return eventStream({
      profileId: viewer.profileId,
      request,
      intervalMs: POLL_INTERVAL_MS,
      ready: { cursor },
      tick: async ({ send }) => {
        const messages = await listMessages(bunchId, viewer.profileId, {
          after: cursor,
          limit: 50,
        });
        if (messages.length > 0) {
          cursor = messages.at(-1)!.createdAt;
          send("messages", { messages });
        }
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
