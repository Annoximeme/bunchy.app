import { z } from "zod";
import { handleAuthed, parseJson, parseQuery } from "@/server/http/route";
import { activityCreateSchema } from "@/server/modules/activities/schemas";
import { createActivity, listActivities } from "@/server/modules/activities/service";
import { createSeries } from "@/server/modules/activities/series";

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

/**
 * One evening, or a standing arrangement.
 *
 * The same endpoint for both, because the form asks the same questions and a
 * cadence is one more answer about the same plan rather than a different act.
 * Splitting it would mean two routes, two schemas and two ways for the
 * validation to drift.
 *
 * A series returns its first occurrence's id rather than the series id, so the
 * caller can send somebody to the thing that is actually happening. The job
 * materialises it within the hour; the response says which it made so the UI
 * can word itself honestly.
 */
export async function POST(request: Request) {
  return handleAuthed(async (viewer) => {
    const input = await parseJson(request, activityCreateSchema);

    if (input.cadence) {
      const series = await createSeries(viewer.profileId, {
        title: input.title,
        description: input.description,
        cadence: input.cadence,
        startsAt: input.startsAt,
        durationMinutes: input.endsAt
          ? Math.round((input.endsAt.getTime() - input.startsAt.getTime()) / 60_000)
          : null,
        mode: input.mode,
        locationLabel: input.locationLabel ?? null,
        onlineUrl: input.onlineUrl || null,
        maxParticipants: input.maxParticipants,
        bunchId: input.bunchId ?? null,
      });
      return { ok: true, series };
    }

    const activity = await createActivity(viewer.profileId, input);
    return { ok: true, activity };
  });
}
