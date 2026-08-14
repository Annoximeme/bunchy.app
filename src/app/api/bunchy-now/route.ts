import { z } from "zod";
import { handle, parseQuery } from "@/server/http/route";
import { requireViewer } from "@/server/auth/current-user";
import { bunchyNow } from "@/server/modules/discovery/bunchy-now";
import { consume } from "@/server/ratelimit";

const schema = z.object({
  horizon: z.enum(["now", "tonight", "weekend", "all"]).optional(),
  withinKm: z.coerce.number().int().min(1).max(20_000).optional(),
  minScore: z.coerce.number().int().min(0).max(100).optional(),
});

/**
 * The Bunchy Now board.
 *
 * GET, because it reads. Rate limited on the search rule because each call runs
 * the matcher, and a filter control that fires on every keystroke would be an
 * expensive thing to leave unbounded.
 */
export async function GET(request: Request) {
  return handle(async () => {
    const viewer = await requireViewer();
    await consume("aiAssist", viewer.profileId);
    const filters = parseQuery(request, schema);
    return bunchyNow(viewer.profileId, filters);
  });
}
