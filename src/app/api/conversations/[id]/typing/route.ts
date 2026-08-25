import { handleAuthed } from "@/server/http/route";
import { markTyping } from "@/server/modules/messaging/direct";

/**
 * "I am writing something."
 *
 * A bare POST with no body, called at most once every few seconds by the
 * composer, never on every keystroke. The whole message is the timestamp the
 * server records on arrival, so there is nothing to send and nothing to
 * validate.
 *
 * There is no matching "I stopped". The mark ages out on its own, which is one
 * fewer request, one fewer write, and correct in the case that actually
 * happens: somebody closing the tab mid-sentence, who is never going to send
 * the "stopped" signal anyway.
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleAuthed(async (viewer) => {
    const { id } = await context.params;
    await markTyping(id, viewer.profileId);
    return { ok: true };
  });
}
