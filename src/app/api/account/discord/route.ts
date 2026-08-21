import { handleAuthed } from "@/server/http/route";
import { issueLinkCode, unlinkDiscord } from "@/server/modules/discord/link";

/**
 * Getting a code, and undoing the link.
 *
 * POST mints a short-lived code the member types at the bot. GET is
 * deliberately absent: a code is a credential, and a GET that mints one is a
 * credential anything that prefetches a link can spend on somebody's behalf.
 */
export async function POST() {
  return handleAuthed(async (viewer) => {
    const { code, expiresAt } = await issueLinkCode(viewer.profileId);
    return { ok: true, code, expiresAt };
  });
}

export async function DELETE() {
  return handleAuthed(async (viewer) => {
    await unlinkDiscord(viewer.profileId);
    return { ok: true };
  });
}
