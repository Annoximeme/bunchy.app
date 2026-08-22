import { z } from "zod";
import { handle, parseJson } from "@/server/http/route";
import { requireAdmin } from "@/server/modules/admin/guard";
import { updateBotSettings } from "@/server/modules/discord/settings";

const schema = z.object({
  announceChannelId: z.string().trim().max(40).nullable().optional(),
  announceChannelName: z.string().trim().max(120).nullable().optional(),
  announcementsEnabled: z.boolean().optional(),
  announceSeries: z.boolean().optional(),
});

/**
 * Changing what the bot does, without a deploy.
 *
 * Admin only, like the site gate and announcements, and for the same reason:
 * it changes what the product says in public rather than acting on one member.
 */
export async function PATCH(request: Request) {
  return handle(async () => {
    const actor = await requireAdmin();
    const input = await parseJson(request, schema);
    return { ok: true, settings: await updateBotSettings(actor, input) };
  });
}
