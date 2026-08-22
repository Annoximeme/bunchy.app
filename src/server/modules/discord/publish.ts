import { AppError } from "@/server/errors";
import { recordModerationEvent } from "@/server/modules/admin/audit";
import type { StaffViewer } from "@/server/modules/admin/guard";
import { rulesEmbed } from "@/server/modules/discord/messages";
import { botSettings, rememberRulesMessage } from "@/server/modules/discord/settings";

/**
 * Publishing the rules from the staff area rather than from Discord.
 *
 * `/rules` in the server does the same thing, and did it first. The reason this
 * exists as well is that the staff page is where the rules channel is chosen,
 * and a page that lets you choose a channel but then tells you to go somewhere
 * else to use it leaves the job half done at the exact moment somebody is
 * trying to finish it.
 *
 * ## Why this speaks REST while the bot speaks discord.js
 *
 * The bot holds a gateway connection; the web process does not, and opening one
 * per request to post a single message would be absurd. Only the transport
 * differs. The embed itself comes from `messages.ts`, so there is one rules post
 * with one wording, not two that drift apart.
 *
 * ## Edit, never repost
 *
 * A rules channel holding three versions of the rules is worse than one holding
 * none, because the reader has to work out which is current and will pick
 * wrong. So a remembered message is edited in place. If that edit fails, the
 * message was deleted by hand or belongs to a previous channel, and posting a
 * fresh one is the right recovery rather than an error.
 */

const API = "https://discord.com/api/v10";

export interface PublishResult {
  /** Plain enough to render as-is. The page has no more context to add. */
  message: string;
  messageId: string;
}

async function discord(path: string, init: RequestInit) {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    throw new AppError(
      "conflict",
      "No bot token is set on the web server, so it cannot post to Discord.",
    );
  }

  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bot ${token}`,
      "content-type": "application/json",
      ...init.headers,
    },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
}

export async function publishRules(actor: StaffViewer): Promise<PublishResult> {
  const settings = await botSettings();
  if (!settings.rulesChannelId) {
    throw new AppError(
      "conflict",
      "Choose a rules channel first, then publish.",
    );
  }

  const body = JSON.stringify({ embeds: [rulesEmbed()] });
  let edited = false;
  let messageId: string | null = null;

  if (settings.rulesMessageId) {
    const patch = await discord(
      `/channels/${settings.rulesChannelId}/messages/${settings.rulesMessageId}`,
      { method: "PATCH", body },
    );
    if (patch.ok) {
      edited = true;
      messageId = settings.rulesMessageId;
    }
    // A failure here is the deleted-by-hand case. Fall through and post.
  }

  if (!messageId) {
    const post = await discord(`/channels/${settings.rulesChannelId}/messages`, {
      method: "POST",
      body,
    });

    if (!post.ok) {
      throw new AppError(
        "conflict",
        post.status === 403
          ? "The bot cannot post in that channel. Check its permissions there."
          : `Discord refused the message with ${post.status}.`,
      );
    }

    const message = (await post.json()) as { id: string };
    messageId = message.id;
    await rememberRulesMessage(messageId);
  }

  // Audited because it writes in public under the product's name, which is the
  // same reason an announcement is audited.
  await recordModerationEvent({
    actor,
    action: "ANNOUNCEMENT_PUBLISHED",
    targetType: "SITE",
    targetId: "default",
    reason: edited ? "Discord rules edited in place" : "Discord rules posted",
    metadata: { channelId: settings.rulesChannelId, messageId },
  });

  return {
    message: edited
      ? "Rules updated in place, in the same message as before."
      : "Rules posted.",
    messageId,
  };
}
