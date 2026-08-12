import { z } from "zod";
import { handleAuthed, parseJson } from "@/server/http/route";
import {
  getPreferences,
  setPreference,
} from "@/server/modules/notifications/service";

const TYPES = [
  "CONNECTION_REQUEST",
  "CONNECTION_ACCEPTED",
  "DIRECT_MESSAGE",
  "BUNCH_INVITE",
  "BUNCH_JOIN_REQUEST",
  "BUNCH_MESSAGE_REPLY",
  "BUNCH_MENTION",
  "BUNCH_RECOMMENDATION",
  "ACTIVITY_INVITE",
  "ACTIVITY_REMINDER",
  "ACTIVITY_CHANGED",
] as const;

const schema = z.object({
  type: z.enum(TYPES),
  inApp: z.boolean(),
  email: z.boolean(),
});

export async function GET() {
  return handleAuthed(async (viewer) => ({
    preferences: await getPreferences(viewer.profileId),
  }));
}

export async function PATCH(request: Request) {
  return handleAuthed(async (viewer) => {
    const input = await parseJson(request, schema);
    await setPreference(viewer.profileId, input.type, {
      inApp: input.inApp,
      email: input.email,
    });
    return { ok: true };
  });
}
