import { handleAuthed, parseJson } from "@/server/http/route";
import { privacySchema } from "@/server/modules/profile/schemas";
import { getOwnProfile, savePrivacy } from "@/server/modules/profile/service";

export async function GET() {
  return handleAuthed(async (viewer) => ({
    profile: await getOwnProfile(viewer.profileId),
  }));
}

/** Privacy controls. Everything else goes through the onboarding endpoints. */
export async function PATCH(request: Request) {
  return handleAuthed(async (viewer) => {
    const input = await parseJson(request, privacySchema);
    await savePrivacy(viewer.profileId, input);
    return { ok: true };
  });
}
