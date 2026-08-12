import { z } from "zod";
import { handleAuthed, parseJson } from "@/server/http/route";
import { reactionSchema } from "@/server/modules/circles/schemas";
import {
  deleteMessage,
  toggleReaction,
} from "@/server/modules/messaging/circle-chat";

const patchSchema = z.object({ action: z.literal("react") }).and(reactionSchema);

/** Toggles a reaction on this message. */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ messageId: string }> },
) {
  return handleAuthed(async (viewer) => {
    const { messageId } = await context.params;
    const input = await parseJson(request, patchSchema);
    const result = await toggleReaction(messageId, viewer.profileId, input.emoji);
    return { ok: true, ...result };
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ messageId: string }> },
) {
  return handleAuthed(async (viewer) => {
    const { messageId } = await context.params;
    await deleteMessage(messageId, viewer.profileId);
    return { ok: true };
  });
}
