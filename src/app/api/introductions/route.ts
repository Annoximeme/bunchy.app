import { z } from "zod";
import { handleAuthed, parseJson } from "@/server/http/route";
import {
  introduce,
  respondToIntroduction,
} from "@/server/modules/connections/introduce";

/**
 * Introducing two people, and answering an introduction.
 *
 * One route, because they are the two ends of one act. Everything that decides
 * whether either is allowed lives in the service: connected to both, blocked by
 * neither, and their own privacy settings still deciding.
 */

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("introduce"),
    oneId: z.string().min(1).max(40),
    otherId: z.string().min(1).max(40),
    note: z.string().trim().max(300).nullable().optional(),
  }),
  z.object({
    action: z.literal("respond"),
    introductionId: z.string().min(1).max(40),
    accept: z.boolean(),
  }),
]);

export async function POST(request: Request) {
  return handleAuthed(async (viewer) => {
    const input = await parseJson(request, schema);

    if (input.action === "introduce") {
      return introduce(viewer.profileId, input.oneId, input.otherId, input.note);
    }
    return respondToIntroduction(
      input.introductionId,
      viewer.profileId,
      input.accept,
    );
  });
}
