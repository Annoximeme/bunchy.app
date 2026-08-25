import { z } from "zod";
import { handleAuthed, parseJson } from "@/server/http/route";
import {
  getPreferences,
  setPreference,
} from "@/server/modules/notifications/service";
import { NOTIFICATION_TYPE_INFO } from "@/lib/notifications";
import type { NotificationType } from "@/generated/prisma/enums";

/**
 * Derived from the registry rather than copied out of it.
 *
 * The hand-written list this replaces was two types short of the settings
 * screen, which draws its switches from `NOTIFICATION_TYPE_INFO`. So the
 * screen rendered a switch for "How did it go?" and one for "We answered your
 * feedback", and saving either got a 422 back: the member flipped it, watched
 * it flip back, and had no way to know why. Adding a notification type and
 * forgetting this array is not a mistake anybody should be able to make.
 */
const TYPES = NOTIFICATION_TYPE_INFO.map((info) => info.type) as [
  NotificationType,
  ...NotificationType[],
];

const schema = z.object({
  type: z.enum(TYPES),
  inApp: z.boolean(),
  email: z.boolean(),
  push: z.boolean(),
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
      push: input.push,
    });
    return { ok: true };
  });
}
