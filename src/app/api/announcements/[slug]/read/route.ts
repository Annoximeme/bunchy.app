import { handleAuthed } from "@/server/http/route";
import { markRead } from "@/server/modules/announcements/service";

/**
 * Marking an announcement read, which is also what dismissing its banner does.
 *
 * Not rate limited. The write is idempotent, it is the record that notice was
 * given, and a member who cannot record having read something would keep being
 * shown it, a limiter here would turn a promise-keeping mechanism into a nag.
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  return handleAuthed(async (viewer) => {
    const { slug } = await context.params;
    await markRead(slug, viewer.profileId);
    return { ok: true };
  });
}
