import { z } from "zod";
import { handle, parseJson } from "@/server/http/route";
import { requireAdmin } from "@/server/modules/admin/guard";
import { updateBotSettings } from "@/server/modules/discord/settings";
import { publishRules } from "@/server/modules/discord/publish";

const schema = z.object({
  announceChannelId: z.string().trim().max(40).nullable().optional(),
  announceChannelName: z.string().trim().max(120).nullable().optional(),
  announcementsEnabled: z.boolean().optional(),
  announceSeries: z.boolean().optional(),
  welcomeChannelId: z.string().trim().max(40).nullable().optional(),
  welcomeChannelName: z.string().trim().max(120).nullable().optional(),
  rulesChannelId: z.string().trim().max(40).nullable().optional(),
  rulesChannelName: z.string().trim().max(120).nullable().optional(),
  rulesMessageId: z.string().trim().max(40).nullable().optional(),
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

/**
 * Publish the rules post.
 *
 * A POST rather than another PATCH field because it is an action with an effect
 * in the world, not a setting. Running it twice is safe: it edits the message it
 * already posted rather than adding a second one.
 */
export async function POST() {
  return handle(async () => {
    const actor = await requireAdmin();
    return { ok: true, ...(await publishRules(actor)) };
  });
}
