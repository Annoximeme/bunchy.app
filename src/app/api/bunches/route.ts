import { z } from "zod";
import { handleAuthed, parseJson, parseQuery } from "@/server/http/route";
import { browseBunches, createBunch } from "@/server/modules/bunches/service";
import { bunchCreateSchema } from "@/server/modules/bunches/schemas";

const querySchema = z.object({ q: z.string().trim().max(80).optional() });

export async function GET(request: Request) {
  return handleAuthed(async (viewer) => {
    const { q } = parseQuery(request, querySchema);
    return { bunches: await browseBunches(viewer.profileId, q) };
  });
}

export async function POST(request: Request) {
  return handleAuthed(async (viewer) => {
    const input = await parseJson(request, bunchCreateSchema);
    const bunch = await createBunch(viewer.profileId, input);
    return { ok: true, bunch };
  });
}
