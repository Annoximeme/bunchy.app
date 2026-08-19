import { z } from "zod";
import { handleAuthed, parseJson } from "@/server/http/route";
import { findPeople } from "@/server/modules/discovery/find-people";
import { consume } from "@/server/ratelimit";

/**
 * Find Someone.
 *
 * POST rather than GET with a query string, because the search text is a
 * sentence about what somebody wants to do this weekend and query strings end
 * up in access logs, proxy caches and browser history. Nothing here is
 * cacheable anyway, the answer depends on who is asking.
 */

const schema = z.object({
  query: z.string().trim().min(2, "Say what you're after.").max(280),
  availableNow: z.boolean().optional(),
  /** Null means "anywhere"; omitted means "use whatever the request implied". */
  withinKm: z.number().int().min(1).max(20_000).nullable().optional(),
});

export async function POST(request: Request) {
  return handleAuthed(async (viewer) => {
    // Shares the AI budget: a search may consult the assistant, and searches
    // are the cheapest thing on the platform to run in a loop.
    await consume("aiAssist", viewer.profileId);

    const input = await parseJson(request, schema);
    return findPeople(viewer.profileId, input.query, {
      availableNow: input.availableNow,
      withinKm: input.withinKm,
    });
  });
}
