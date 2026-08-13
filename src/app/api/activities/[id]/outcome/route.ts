import { z } from "zod";
import { handleAuthed, parseJson } from "@/server/http/route";
import { recordOutcome } from "@/server/modules/activities/outcomes";

const schema = z.object({
  attended: z.boolean(),
  metSomeone: z.boolean().optional(),
});

/**
 * Answering "did you go?".
 *
 * No GET: the prompt is loaded with the page that shows it, so there is no
 * endpoint to poll for a fresh one.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleAuthed(async (viewer) => {
    const { id } = await context.params;
    const input = await parseJson(request, schema);
    await recordOutcome(viewer.profileId, id, input);
    return { ok: true };
  });
}
