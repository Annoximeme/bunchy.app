import { db } from "@/server/db/client";
import { recordModerationEvent } from "@/server/modules/admin/audit";
import type { StaffViewer } from "@/server/modules/admin/guard";

/**
 * The bot's runtime settings, and the one row that holds them.
 *
 * ## Migrating off the environment variable
 *
 * `DISCORD_ANNOUNCE_CHANNEL_ID` still works and is used as the initial value
 * the first time this row is created. That is deliberate rather than tidy: a
 * running deployment already has the variable set, and a change that silently
 * turned announcements off until somebody visited an admin page would be a
 * regression dressed as a feature. Once the row exists, the row wins.
 */

const ID = "default";

export interface BotSettingsView {
  announceChannelId: string | null;
  announceChannelName: string | null;
  announcementsEnabled: boolean;
  announceSeries: boolean;
}

export async function botSettings(): Promise<BotSettingsView> {
  const existing = await db.botSettings.findUnique({ where: { id: ID } });
  if (existing) return existing;

  // Seeded from the environment on first read, so an existing deployment keeps
  // announcing to wherever it already was.
  return db.botSettings.create({
    data: {
      id: ID,
      announceChannelId: process.env.DISCORD_ANNOUNCE_CHANNEL_ID || null,
    },
  });
}

/** Where the bot should post, or nowhere. Audited like every staff action. */
export async function updateBotSettings(
  actor: StaffViewer,
  input: Partial<BotSettingsView>,
): Promise<BotSettingsView> {
  await botSettings();

  const updated = await db.botSettings.update({
    where: { id: ID },
    data: input,
  });

  // In the audit trail because it changes what the product says in public. A
  // channel change is not as loud as an announcement, but it decides where
  // every future one lands.
  await recordModerationEvent({
    actor,
    action: "ANNOUNCEMENT_PUBLISHED",
    targetType: "SITE",
    targetId: ID,
    reason: "Discord bot settings changed",
    metadata: {
      announceChannelId: updated.announceChannelId,
      announceChannelName: updated.announceChannelName,
      announcementsEnabled: updated.announcementsEnabled,
      announceSeries: updated.announceSeries,
    },
  });

  return updated;
}

/** What the bot asks on each pass: where to post, if anywhere. */
export async function announceTarget(): Promise<string | null> {
  const settings = await botSettings();
  if (!settings.announcementsEnabled) return null;
  return settings.announceChannelId;
}
