import { z } from "zod";
import { handleAuthed, parseJson } from "@/server/http/route";
import { env, pushEnabled } from "@/server/env";
import {
  removePushSubscription,
  savePushSubscription,
} from "@/server/modules/notifications/push";

/**
 * The browser's end of push.
 *
 * GET hands out the public VAPID key, which is what it is for: a browser
 * cannot create a subscription without it, and it is public by construction.
 * It also says whether the feature is configured at all, so the settings
 * screen can offer push or stay quiet rather than showing a switch that will
 * fail.
 */

const subscribeSchema = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(200),
  }),
});

const unsubscribeSchema = z.object({
  endpoint: z.string().url().max(2000),
});

export async function GET() {
  return handleAuthed(async () => ({
    enabled: pushEnabled(),
    publicKey: pushEnabled() ? env().VAPID_PUBLIC_KEY : null,
  }));
}

export async function POST(request: Request) {
  return handleAuthed(async (viewer) => {
    const input = await parseJson(request, subscribeSchema);
    await savePushSubscription({
      profileId: viewer.profileId,
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      // Only so a person can tell one device from another. Truncated because
      // nothing here needs the whole string and some of them are enormous.
      userAgent: request.headers.get("user-agent")?.slice(0, 200) ?? undefined,
    });
    return { ok: true };
  });
}

export async function DELETE(request: Request) {
  return handleAuthed(async (viewer) => {
    const input = await parseJson(request, unsubscribeSchema);
    await removePushSubscription(viewer.profileId, input.endpoint);
    return { ok: true };
  });
}
