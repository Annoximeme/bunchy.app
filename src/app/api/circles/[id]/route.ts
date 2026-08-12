import { handleAuthed, parseJson } from "@/server/http/route";
import { getCircle, updateCircle } from "@/server/modules/circles/service";
import { circleUpdateSchema } from "@/server/modules/circles/schemas";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleAuthed(async (viewer) => {
    const { id } = await context.params;
    return { circle: await getCircle(id, viewer.profileId) };
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleAuthed(async (viewer) => {
    const { id } = await context.params;
    const input = await parseJson(request, circleUpdateSchema);
    await updateCircle(id, viewer.profileId, input);
    return { ok: true };
  });
}
