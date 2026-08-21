import { z } from "zod";
import { handleAuthed, parseJson } from "@/server/http/route";
import {
  MAX_WINDOW_MINUTES,
  createQuickCall,
  openCalls,
} from "@/server/modules/activities/quick";

/**
 * Open calls: making one, and seeing what is open.
 *
 * Its own route rather than a flag on `/api/activities`, unlike the recurring
 * case. There the form asked the same questions and a cadence was one more
 * answer about the same plan. Here almost nothing is the same: three fields
 * instead of eight, no description, a window instead of an end time, and a
 * different rule about what happens when nobody responds. Folding it in would
 * have meant one schema with two shapes and most fields optional, which is a
 * schema that validates neither.
 */
const schema = z.object({
  title: z.string().trim().min(3, "Say what you fancy doing.").max(100),
  startsAt: z.coerce.date().optional(),
  windowMinutes: z.number().int().min(15).max(MAX_WINDOW_MINUTES).optional(),
  maxParticipants: z.number().int().min(2).max(50).optional(),
  mode: z.enum(["ONLINE", "OFFLINE"]).optional(),
  locationLabel: z.string().trim().max(160).optional(),
  onlineUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
});

export async function GET() {
  return handleAuthed(async (viewer) => ({
    calls: await openCalls(viewer.profileId),
  }));
}

export async function POST(request: Request) {
  return handleAuthed(async (viewer) => {
    const input = await parseJson(request, schema);
    const activity = await createQuickCall(viewer.profileId, {
      ...input,
      locationLabel: input.locationLabel ?? null,
      onlineUrl: input.onlineUrl || null,
    });
    return { ok: true, activity };
  });
}
