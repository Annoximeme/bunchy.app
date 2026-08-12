import { handleAuthed, parseJson } from "@/server/http/route";
import { activityUpdateSchema } from "@/server/modules/activities/schemas";
import {
  cancelActivity,
  getActivity,
  updateActivity,
} from "@/server/modules/activities/service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleAuthed(async (viewer) => {
    const { id } = await context.params;
    return { activity: await getActivity(id, viewer.profileId) };
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleAuthed(async (viewer) => {
    const { id } = await context.params;
    const input = await parseJson(request, activityUpdateSchema);
    await updateActivity(id, viewer.profileId, input);
    return { ok: true };
  });
}

/** Cancels rather than deletes: people who signed up need to be told. */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleAuthed(async (viewer) => {
    const { id } = await context.params;
    await cancelActivity(id, viewer.profileId);
    return { ok: true };
  });
}
