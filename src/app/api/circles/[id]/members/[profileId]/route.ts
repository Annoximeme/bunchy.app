import { z } from "zod";
import { handleAuthed, parseJson } from "@/server/http/route";
import {
  approveJoinRequest,
  declineJoinRequest,
  removeMember,
  setMemberRole,
} from "@/server/modules/circles/service";

const schema = z.object({
  action: z.enum(["approve", "decline", "promote", "demote"]),
});

/** Moderator actions on one member. */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; profileId: string }> },
) {
  return handleAuthed(async (viewer) => {
    const { id, profileId } = await context.params;
    const { action } = await parseJson(request, schema);

    switch (action) {
      case "approve":
        await approveJoinRequest(id, viewer.profileId, profileId);
        break;
      case "decline":
        await declineJoinRequest(id, viewer.profileId, profileId);
        break;
      case "promote":
        await setMemberRole(id, viewer.profileId, profileId, "MODERATOR");
        break;
      case "demote":
        await setMemberRole(id, viewer.profileId, profileId, "MEMBER");
        break;
    }

    return { ok: true };
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; profileId: string }> },
) {
  return handleAuthed(async (viewer) => {
    const { id, profileId } = await context.params;
    await removeMember(id, viewer.profileId, profileId);
    return { ok: true };
  });
}
