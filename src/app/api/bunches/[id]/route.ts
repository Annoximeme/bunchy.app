import { handleAuthed, parseJson } from "@/server/http/route";
import { getBunch, updateBunch } from "@/server/modules/bunches/service";
import { bunchUpdateSchema } from "@/server/modules/bunches/schemas";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleAuthed(async (viewer) => {
    const { id } = await context.params;
    return { bunch: await getBunch(id, viewer.profileId) };
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleAuthed(async (viewer) => {
    const { id } = await context.params;
    const input = await parseJson(request, bunchUpdateSchema);
    await updateBunch(id, viewer.profileId, input);
    return { ok: true };
  });
}
