import { handleAuthed } from "@/server/http/route";
import { joinActivity, leaveActivity } from "@/server/modules/activities/service";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleAuthed(async (viewer) => {
    const { id } = await context.params;
    return { ok: true, ...(await joinActivity(id, viewer.profileId)) };
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleAuthed(async (viewer) => {
    const { id } = await context.params;
    await leaveActivity(id, viewer.profileId);
    return { ok: true };
  });
}
