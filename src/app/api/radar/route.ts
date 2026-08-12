import { z } from "zod";
import { handleAuthed, parseJson } from "@/server/http/route";
import { scanRadar } from "@/server/modules/discovery/radar";

/**
 * The radar, re-scanned with new filters.
 *
 * POST because nothing about the answer is cacheable — it depends entirely on
 * who is asking and roughly where they are — and because a GET whose query
 * string described someone's search radius would end up in access logs.
 */

const schema = z.object({
  withinKm: z.number().int().min(1).max(20_000).nullable().optional(),
  interestSlug: z.string().trim().max(64).nullable().optional(),
  mode: z.enum(["ONLINE", "OFFLINE"]).nullable().optional(),
  withinDays: z.number().int().min(1).max(365).nullable().optional(),
});

export async function POST(request: Request) {
  return handleAuthed(async (viewer) => {
    const input = await parseJson(request, schema);
    return scanRadar(viewer.profileId, input);
  });
}
