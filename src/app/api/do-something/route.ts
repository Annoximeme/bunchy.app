import { z } from "zod";
import { handleAuthed, parseJson } from "@/server/http/route";
import { consume } from "@/server/ratelimit";
import { doSomething } from "@/server/modules/activities/do-something";

const schema = z.object({
  budget: z.number().int().min(0).max(500).optional(),
  hours: z.number().int().min(1).max(12).optional(),
  withinKm: z.number().int().min(1).max(500).optional(),
  mood: z.enum(["chill", "social", "adventurous", "competitive", "random"]).optional(),
  people: z.enum(["alone", "friends", "find"]).optional(),
  /** Advanced by the client so "try another" moves without reshuffling on render. */
  seed: z.number().int().min(1).max(9999).default(1),
});

/**
 * An evening, from constraints.
 *
 * Rate limited on the AI rule because it runs the activity recommender and,
 * when asked to find people, the matcher — and "try another" is a button people
 * press repeatedly by design.
 */
export async function POST(request: Request) {
  return handleAuthed(async (viewer) => {
    await consume("aiAssist", viewer.profileId);
    const { seed, ...constraints } = await parseJson(request, schema);
    return doSomething(viewer.profileId, constraints, seed);
  });
}
