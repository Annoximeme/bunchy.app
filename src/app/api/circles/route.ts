import { z } from "zod";
import { handleAuthed, parseJson, parseQuery } from "@/server/http/route";
import { browseCircles, createCircle } from "@/server/modules/circles/service";
import { circleCreateSchema } from "@/server/modules/circles/schemas";

const querySchema = z.object({ q: z.string().trim().max(80).optional() });

export async function GET(request: Request) {
  return handleAuthed(async (viewer) => {
    const { q } = parseQuery(request, querySchema);
    return { circles: await browseCircles(viewer.profileId, q) };
  });
}

export async function POST(request: Request) {
  return handleAuthed(async (viewer) => {
    const input = await parseJson(request, circleCreateSchema);
    const circle = await createCircle(viewer.profileId, input);
    return { ok: true, circle };
  });
}
