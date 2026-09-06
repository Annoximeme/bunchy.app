import { z } from "zod";
import { handleAuthed, parseJson } from "@/server/http/route";
import {
  askToBeRehomed,
  closeQuietBunch,
  stopLookingForABunch,
} from "@/server/modules/bunches/dormancy";

/**
 * The two things you can do about a bunch that has stopped.
 *
 * Put your hand up for another group, which does not touch this one, or close
 * this one, which does not touch you. They are deliberately separate: somebody
 * can want a new group and still not want to be the person who ended the old
 * one, and the reverse is just as common.
 */

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("looking") }),
  z.object({ action: z.literal("not_looking") }),
  z.object({ action: z.literal("close") }),
]);

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleAuthed(async (viewer) => {
    const { id } = await context.params;
    const input = await parseJson(request, schema);

    switch (input.action) {
      case "looking":
        await askToBeRehomed(viewer.profileId);
        return { ok: true };
      case "not_looking":
        await stopLookingForABunch(viewer.profileId);
        return { ok: true };
      case "close":
        await closeQuietBunch(id, viewer.profileId);
        return { ok: true };
    }
  });
}
