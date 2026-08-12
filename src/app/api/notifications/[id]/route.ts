import { handleAuthed } from "@/server/http/route";
import { markRead } from "@/server/modules/notifications/service";

/**
 * Marks one notification read.
 *
 * Scoped to the viewer inside `markRead` (it filters on `profileId`), so an id
 * belonging to someone else silently affects nothing rather than erroring —
 * which would otherwise confirm that the id exists.
 */
export async function PATCH(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleAuthed(async (viewer) => {
    const { id } = await context.params;
    await markRead(viewer.profileId, id);
    return { ok: true };
  });
}
