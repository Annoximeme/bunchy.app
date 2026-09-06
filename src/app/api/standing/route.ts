import { z } from "zod";
import { handleAuthed, parseJson } from "@/server/http/route";
import { chooseTitle, standingFor } from "@/server/modules/standing/service";

/**
 * Your own standing, and which title you wear.
 *
 * Choosing is the only write a member can make here. There is no endpoint that
 * awards anything: points come out of rows that already exist, and the service
 * checks that the title being chosen is one this member has actually earned
 * and still holds.
 */

const schema = z.object({
  /** Null takes the title off, which has to stay possible. */
  titleKey: z.string().trim().max(60).nullable(),
});

export async function GET() {
  return handleAuthed(async (viewer) => ({
    standing: await standingFor(viewer.profileId),
  }));
}

export async function POST(request: Request) {
  return handleAuthed(async (viewer) => {
    const { titleKey } = await parseJson(request, schema);
    await chooseTitle(viewer.profileId, titleKey);
    return { ok: true };
  });
}
