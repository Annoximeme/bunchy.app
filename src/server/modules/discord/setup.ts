import { db } from "@/server/db/client";

/**
 * Everything the setup page needs to tell somebody the truth about the bot.
 *
 * ## Why this talks to Discord rather than reading config
 *
 * A setup screen that only reports whether an environment variable is set is a
 * screen that says "configured" while the token is revoked, the bot was kicked
 * from the server, or the channel id points at a channel in a different guild.
 * All three of those look identical from inside the process, and all three are
 * what actually goes wrong.
 *
 * So each check calls Discord and reports what came back. It is slower and it
 * is the only version worth having.
 *
 * ## The token never leaves this module
 *
 * Every function returns derived facts: whether it worked, the bot's name, the
 * application id, a channel list. The token itself is never returned, never
 * logged and never rendered. The application id is public by design, which is
 * what makes the invite link derivable without asking for a second secret.
 */

const API = "https://discord.com/api/v10";

/**
 * Four permissions, and each one is used.
 *
 * View Channel and Send Messages to announce at all. Add Reactions so the bot
 * can pre-add the join emoji, which is what makes answering a call one tap
 * rather than two. Read Message History so a reaction on an announcement posted
 * before the last restart still works, because otherwise the join button
 * quietly stops working after every deploy.
 *
 * Not Administrator, which most guides suggest and which would give a bot that
 * posts one message every few minutes the power to delete the server.
 */
export const REQUIRED_PERMISSIONS =
  (1 << 10) | (1 << 11) | (1 << 6) | (1 << 16);

export interface TokenCheck {
  configured: boolean;
  ok: boolean;
  /** The bot's own username, straight from Discord. */
  botName?: string;
  applicationId?: string;
  error?: string;
}

async function call(path: string, token: string) {
  return fetch(`${API}${path}`, {
    headers: { Authorization: `Bot ${token}` },
    // The setup page is interactive. A hung request should fail rather than
    // hold the render open.
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
}

/**
 * Is the token real, and whose is it.
 *
 * The application id comes from the token's own first segment, which is the id
 * base64url-encoded. Discord documents this and it saves asking for a second
 * value that somebody would copy wrongly. It is checked against the API
 * response rather than trusted, because a malformed token would otherwise
 * produce a confident and wrong invite link.
 */
export async function checkToken(): Promise<TokenCheck> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return { configured: false, ok: false };

  try {
    const response = await call("/users/@me", token);
    if (!response.ok) {
      return {
        configured: true,
        ok: false,
        error:
          response.status === 401
            ? "Discord rejected the token. It may have been regenerated."
            : `Discord answered ${response.status}.`,
      };
    }

    const me = (await response.json()) as { id: string; username: string };
    return {
      configured: true,
      ok: true,
      botName: me.username,
      applicationId: me.id,
    };
  } catch (error) {
    return {
      configured: true,
      ok: false,
      error:
        error instanceof Error && error.name === "TimeoutError"
          ? "Discord did not answer within eight seconds."
          : "Could not reach Discord from the server.",
    };
  }
}

export interface GuildCheck {
  configured: boolean;
  ok: boolean;
  guildName?: string;
  /** Text channels the bot can see, for choosing where to announce. */
  channels?: Array<{ id: string; name: string }>;
  error?: string;
}

/**
 * Is the bot actually in the server, and what can it see.
 *
 * The channel list is the useful part. Choosing an announce channel otherwise
 * means turning on developer mode, right-clicking and copying an id, and there
 * is no feedback at all if the wrong one is pasted. Listing them turns that
 * into reading a name.
 *
 * Only text channels, and only the ones the bot can see, because a channel it
 * cannot see is a channel it cannot post in and offering it would be offering
 * a silent failure.
 */
export async function checkGuild(): Promise<GuildCheck> {
  const token = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!token || !guildId) return { configured: false, ok: false };

  try {
    const guild = await call(`/guilds/${guildId}`, token);
    if (!guild.ok) {
      return {
        configured: true,
        ok: false,
        error:
          guild.status === 403 || guild.status === 404
            ? "The bot is not in that server, or the server id is wrong."
            : `Discord answered ${guild.status}.`,
      };
    }

    const info = (await guild.json()) as { name: string };
    const channelsResponse = await call(`/guilds/${guildId}/channels`, token);
    const raw = channelsResponse.ok
      ? ((await channelsResponse.json()) as Array<{
          id: string;
          name: string;
          type: number;
        }>)
      : [];

    return {
      configured: true,
      ok: true,
      guildName: info.name,
      // Type 0 is a plain text channel. Announcements, forums, voice and
      // categories are all excluded: the bot posts plain messages.
      channels: raw
        .filter((c) => c.type === 0)
        .map((c) => ({ id: c.id, name: c.name })),
    };
  } catch {
    return {
      configured: true,
      ok: false,
      error: "Could not reach Discord from the server.",
    };
  }
}

export interface ChannelCheck {
  configured: boolean;
  ok: boolean;
  channelName?: string;
  error?: string;
}

/** Does the announce channel exist, and is it in the right server. */
export async function checkAnnounceChannel(): Promise<ChannelCheck> {
  const token = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_ANNOUNCE_CHANNEL_ID;
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!token || !channelId) return { configured: false, ok: false };

  try {
    const response = await call(`/channels/${channelId}`, token);
    if (!response.ok) {
      return {
        configured: true,
        ok: false,
        error: "The bot cannot see that channel, or the id is wrong.",
      };
    }
    const channel = (await response.json()) as {
      name: string;
      guild_id?: string;
    };

    // A channel in a different guild answers 200 and would look fine. This is
    // the check that catches an id pasted from the wrong server.
    if (guildId && channel.guild_id && channel.guild_id !== guildId) {
      return {
        configured: true,
        ok: false,
        error: "That channel is in a different server from DISCORD_GUILD_ID.",
      };
    }

    return { configured: true, ok: true, channelName: channel.name };
  } catch {
    return {
      configured: true,
      ok: false,
      error: "Could not reach Discord from the server.",
    };
  }
}

/**
 * The invite URL, with exactly the permissions the bot uses.
 *
 * See `REQUIRED_PERMISSIONS` for what they are and why each is there. Voice
 * presence needs no permission at all beyond seeing the channel, because it
 * reads voice state through the gateway intent rather than the REST API.
 */
export function inviteUrl(applicationId: string): string {
  const params = new URLSearchParams({
    client_id: applicationId,
    permissions: String(REQUIRED_PERMISSIONS),
    scope: "bot applications.commands",
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

/** How many members have connected an account, for the last step. */
export async function linkedMemberCount(): Promise<number> {
  return db.discordLink.count();
}
