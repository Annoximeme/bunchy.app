import { handleAuthed } from "@/server/http/route";
import { getProfileByUsername } from "@/server/modules/profile/service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ username: string }> },
) {
  return handleAuthed(async (viewer) => {
    const { username } = await context.params;
    return { profile: await getProfileByUsername(username, viewer.profileId) };
  });
}
