import { z } from "zod";
import { handleAuthed, parseJson } from "@/server/http/route";
import { respondToIntroduction } from "@/server/modules/discovery/introductions";

/**
 * Acting on an introduction.
 *
 * There is no GET: an introduction is computed by the Discover page as part of
 * the render it was already doing, and an endpoint that hands them out on
 * request would be an endpoint somebody polls.
 */

const schema = z.object({
  profileId: z.string().min(1),
  response: z.enum(["send", "dismiss", "not_interested"]),
  /** The opener, when the member picked or wrote one. */
  message: z.string().trim().max(500).optional(),
});

export async function POST(request: Request) {
  return handleAuthed(async (viewer) => {
    const input = await parseJson(request, schema);
    return respondToIntroduction(
      viewer.profileId,
      input.profileId,
      input.response,
      input.message,
    );
  });
}
