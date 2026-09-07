import { z } from "zod";
import { handleAuthed, parseJson } from "@/server/http/route";
import { db } from "@/server/db/client";

/**
 * When, or never, to send the weekly summary.
 *
 * A day and an hour rather than a switch, because the two shapes of this email
 * are different products: Sunday evening is deciding what to do with a
 * weekend, Monday morning is planning a week. Null for both is off, and off is
 * where everybody starts.
 */
const schema = z.object({
  /** 0 is Sunday, matching `Date.getUTCDay`. Null turns it off. */
  day: z.number().int().min(0).max(6).nullable(),
  hour: z.number().int().min(0).max(23).nullable(),
});

export async function PATCH(request: Request) {
  return handleAuthed(async (viewer) => {
    const input = await parseJson(request, schema);
    // One representation of "off", so a day without an hour cannot exist and
    // the job never has to guess what half an answer meant.
    const off = input.day === null || input.hour === null;

    await db.profile.update({
      where: { id: viewer.profileId },
      data: off
        ? { digestDay: null, digestHour: null }
        : { digestDay: input.day, digestHour: input.hour },
    });
    return { ok: true };
  });
}
