import { handleAuthed, parseJson } from "@/server/http/route";
import { joinActivity, leaveActivity } from "@/server/modules/activities/service";
import { participationSchema } from "@/server/modules/activities/schemas";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleAuthed(async (viewer) => {
    const { id } = await context.params;
    // A body is optional: "count me in" is still one tap and still sends
    // nothing, and only somebody bringing a friend has anything to say here.
    const { guests } = await parseJson(request, participationSchema).catch(() => ({
      guests: 0,
    }));
    return { ok: true, ...(await joinActivity(id, viewer.profileId, guests)) };
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
