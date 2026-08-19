import { z } from "zod";
import { handleAuthed, parseJson } from "@/server/http/route";
import { ask } from "@/server/modules/concierge/service";
import { consume } from "@/server/ratelimit";

/**
 * Ask Bunchy.
 *
 * POST only, and only ever reads. There is no companion endpoint that acts on
 * an answer, the concierge returns links, and the member follows one into a
 * flow that asks them to confirm. That is not a convention to remember; the
 * service has no write path at all.
 */

const schema = z.object({
  query: z.string().trim().min(1, "Ask me something.").max(280),
});

export async function POST(request: Request) {
  return handleAuthed(async (viewer) => {
    // Costs nothing per call, but it runs several searches, so it is metered
    // the same as any other query-heavy endpoint.
    await consume("aiAssist", viewer.profileId);

    const { query } = await parseJson(request, schema);
    return ask(viewer.profileId, query);
  });
}
