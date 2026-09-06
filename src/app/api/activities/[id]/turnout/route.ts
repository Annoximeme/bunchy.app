import { z } from "zod";
import { handleAuthed, parseJson } from "@/server/http/route";
import {
  checkIn,
  confirmSeat,
  openCheckIn,
} from "@/server/modules/activities/turnout";

/**
 * Confirming a seat, opening the door, and tapping in at it.
 *
 * Three verbs on one route because they are one thing from three sides: who is
 * actually coming. The service decides who may do which, and the two that a
 * member does are deliberately one press with no body worth speaking of.
 */

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("confirm") }),
  z.object({ action: z.literal("open_check_in") }),
  z.object({ action: z.literal("check_in") }),
]);

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleAuthed(async (viewer) => {
    const { id } = await context.params;
    const input = await parseJson(request, schema);

    switch (input.action) {
      case "confirm":
        await confirmSeat(id, viewer.profileId);
        return { ok: true };
      case "open_check_in":
        await openCheckIn(id, viewer.profileId);
        return { ok: true };
      case "check_in":
        await checkIn(id, viewer.profileId);
        return { ok: true };
    }
  });
}
