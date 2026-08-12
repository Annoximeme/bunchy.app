import { z } from "zod";
import { handleAuthed, parseJson } from "@/server/http/route";
import {
  respondToRequest,
  withdrawRequest,
} from "@/server/modules/connections/service";

const schema = z.object({ action: z.enum(["accept", "decline"]) });

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleAuthed(async (viewer) => {
    const { id } = await context.params;
    const { action } = await parseJson(request, schema);
    await respondToRequest(id, viewer.profileId, action === "accept");
    return { ok: true };
  });
}

/** Withdraws a request the viewer sent. */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleAuthed(async (viewer) => {
    const { id } = await context.params;
    await withdrawRequest(id, viewer.profileId);
    return { ok: true };
  });
}
