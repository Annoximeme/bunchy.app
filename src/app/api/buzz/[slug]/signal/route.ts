import { handleAuthed } from "@/server/http/route";
import { toggleBuzzSignal } from "@/server/modules/buzz/service";
import { consume } from "@/server/ratelimit";

/**
 * Putting your hand up on a Buzz post, or taking it back.
 *
 * Rate limited on the `message` bucket: it writes a row per press and it is the
 * one endpoint on this surface a script could hold down.
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  return handleAuthed(async (viewer) => {
    const { slug } = await context.params;
    await consume("message", viewer.profileId);
    return toggleBuzzSignal(slug, viewer.profileId);
  });
}
