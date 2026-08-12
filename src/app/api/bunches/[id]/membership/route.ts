import { z } from "zod";
import { handleAuthed, parseJson } from "@/server/http/route";
import {
  acceptInvite,
  leaveBunch,
  requestToJoin,
} from "@/server/modules/bunches/service";

const schema = z.object({ action: z.enum(["join", "accept_invite"]) });

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleAuthed(async (viewer) => {
    const { id } = await context.params;
    const { action } = await parseJson(request, schema);

    if (action === "accept_invite") {
      await acceptInvite(id, viewer.profileId);
      return { ok: true, status: "ACTIVE" };
    }

    return { ok: true, ...(await requestToJoin(id, viewer.profileId)) };
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleAuthed(async (viewer) => {
    const { id } = await context.params;
    await leaveBunch(id, viewer.profileId);
    return { ok: true };
  });
}
