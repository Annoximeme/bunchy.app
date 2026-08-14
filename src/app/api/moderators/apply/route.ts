import { z } from "zod";
import { handleAuthed, parseJson } from "@/server/http/route";
import { consume } from "@/server/ratelimit";
import {
  applyToModerate,
  MAX_HOURS_PER_WEEK,
} from "@/server/modules/admin/moderator-applications";

const schema = z.object({
  hoursPerWeek: z.number().int().min(1).max(MAX_HOURS_PER_WEEK),
  motivation: z.string().trim().min(20, "A couple of sentences, so we know who we are talking to.").max(2000),
  experience: z.string().trim().max(2000).optional(),
  acknowledgedExposure: z.boolean(),
});

/**
 * Applying to moderate.
 *
 * Rate limited on the signup rule rather than a rule of its own: one
 * application is allowed per profile anyway, so this exists only to stop
 * somebody hammering the endpoint to find out whether it behaves differently
 * for an account that has already applied.
 */
export async function POST(request: Request) {
  return handleAuthed(async (viewer) => {
    await consume("signup", viewer.profileId);
    const input = await parseJson(request, schema);
    await applyToModerate(viewer.profileId, viewer.userId, input);
    return { ok: true };
  });
}
