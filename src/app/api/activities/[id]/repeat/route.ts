import { z } from "zod";
import { handleAuthed, parseJson } from "@/server/http/route";
import { repeatActivity } from "@/server/modules/activities/series";

const schema = z.object({
  cadence: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY"]),
});

/**
 * Make an evening that worked into a standing arrangement.
 *
 * Its own route rather than a flag on the outcome endpoint, because they are
 * different acts with different permissions: anyone who was there answers the
 * outcome, and only the organiser can commit the group to a Thursday. Folding
 * the second into the first would mean one endpoint with two authorisation
 * rules inside it.
 *
 * Every refusal lives in `repeatActivity`: not the organiser, no such activity,
 * or it already repeats.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleAuthed(async (viewer) => {
    const { id } = await params;
    const { cadence } = await parseJson(request, schema);
    const series = await repeatActivity(id, viewer.profileId, cadence);
    return { ok: true, series: { id: series.id, nextAt: series.nextAt } };
  });
}
