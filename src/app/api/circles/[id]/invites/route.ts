import { z } from "zod";
import { handleAuthed, parseJson } from "@/server/http/route";
import { inviteToCircle } from "@/server/modules/circles/service";

const schema = z.object({ profileId: z.string().trim().min(1).max(40) });

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleAuthed(async (viewer) => {
    const { id } = await context.params;
    const { profileId } = await parseJson(request, schema);
    await inviteToCircle(id, viewer.profileId, profileId);
    return { ok: true };
  });
}
