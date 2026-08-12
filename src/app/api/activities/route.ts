import { z } from "zod";
import { handleAuthed, parseJson, parseQuery } from "@/server/http/route";
import { activityCreateSchema } from "@/server/modules/activities/schemas";
import { createActivity, listActivities } from "@/server/modules/activities/service";

const querySchema = z.object({
  scope: z.enum(["upcoming", "mine", "organizing"]).default("upcoming"),
  bunchId: z.string().trim().max(40).optional(),
});

export async function GET(request: Request) {
  return handleAuthed(async (viewer) => {
    const query = parseQuery(request, querySchema);
    return { activities: await listActivities(viewer.profileId, query) };
  });
}

export async function POST(request: Request) {
  return handleAuthed(async (viewer) => {
    const input = await parseJson(request, activityCreateSchema);
    const activity = await createActivity(viewer.profileId, input);
    return { ok: true, activity };
  });
}
