import { handleAuthed } from "@/server/http/route";
import { conversationContext } from "@/server/modules/messaging/direct";
import { consume } from "@/server/ratelimit";

/**
 * What these two have in common, plus openers.
 *
 * Fetched on demand rather than embedded in the page so an assistant call never
 * sits in the critical path of reading your messages.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleAuthed(async (viewer) => {
    const { id } = await context.params;
    await consume("assistant", viewer.profileId);
    return conversationContext(id, viewer.profileId);
  });
}
