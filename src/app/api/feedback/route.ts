import { z } from "zod";
import { handle, parseJson } from "@/server/http/route";
import { requireViewer } from "@/server/auth/current-user";
import { submitFeedback } from "@/server/modules/feedback/service";

const schema = z.object({
  kind: z.enum(["IDEA", "BROKEN", "CONFUSING", "OTHER"]),
  message: z.string().min(1).max(4000),
  /** Ours only, and validated again on the server. */
  pagePath: z.string().max(300).nullable().optional(),
});

/**
 * Send feedback about the product.
 *
 * Signed in, because the point of the whole thing is that somebody can be
 * answered. Anonymous feedback is a suggestion box with the lid glued shut:
 * there is nowhere for the reply to go, so the loop that makes people write a
 * second time cannot exist.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const viewer = await requireViewer();
    const input = await parseJson(request, schema);
    return {
      ok: true,
      feedback: await submitFeedback({ profileId: viewer.profileId, ...input }),
    };
  });
}
