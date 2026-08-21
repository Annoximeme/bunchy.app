import {
  ApplicationCommandOptionType,
  Client,
  GatewayIntentBits,
  MessageFlags,
  type ChatInputCommandInteraction,
} from "discord.js";
import { env } from "@/server/env";
import {
  UP_FOR_CHOICES,
  announceable,
  callCommand,
  linkCommand,
  tonightCommand,
  upForCommand,
} from "@/server/modules/discord/commands";
import { setVoicePresence } from "@/server/modules/discord/presence";

/**
 * The Bunchy Discord bot.
 *
 * A gateway process, which is why it is its own container rather than another
 * pass inside `run-jobs.ts`: jobs is a cron that exits, and this holds a
 * websocket open. Folding them together would have meant changing what jobs is.
 *
 * It talks to the database directly, the same way jobs does, rather than
 * through an HTTP API. There is no second consumer to justify the interface,
 * and a shared secret between two containers on the same private network is
 * ceremony rather than security.
 *
 * ## Every reply is ephemeral
 *
 * `MessageFlags.Ephemeral` on all of them. These commands read and write one
 * member's own state, and answering "you are up for gaming" where a channel can
 * see it turns a private status into a broadcast. Bunchy Now shows counts and
 * never names anybody; routing the same fact through Discord must not be the
 * loophole.
 *
 * ## Without a token
 *
 * Logs and exits zero. The same shape as the console email transport: a
 * developer without Discord credentials should get a working checkout, not a
 * crash loop, and a deploy without them should leave one quiet container rather
 * than a restarting one.
 */

const ANNOUNCE_EVERY_MS = 5 * 60 * 1000;

function ephemeral(interaction: ChatInputCommandInteraction, content: string) {
  return interaction.reply({ content, flags: MessageFlags.Ephemeral });
}

async function main() {
  const token = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!token || !guildId) {
    console.info(
      "[bot] DISCORD_BOT_TOKEN or DISCORD_GUILD_ID not set. Not starting.",
    );
    return;
  }

  const client = new Client({
    /*
      The narrowest set that does the job.

      `GuildVoiceStates` is the only privileged-feeling one and it is what makes
      presence possible at all. `MessageContent` is deliberately absent: the bot
      never reads what anybody types, only slash commands addressed to it, and
      asking for message content would be asking to read the whole server in
      order to run four commands.
    */
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
  });

  client.once("clientReady", async () => {
    console.info(`[bot] connected as ${client.user?.tag}`);

    // Registered per guild rather than globally: guild commands appear
    // immediately, where global ones take up to an hour to propagate, and this
    // bot serves exactly one server.
    const guild = await client.guilds.fetch(guildId);
    await guild.commands.set([
      {
        name: "link",
        description: "Connect this Discord account to your Bunchy profile",
        options: [
          {
            name: "code",
            description: "The six-digit code from your Bunchy settings",
            type: ApplicationCommandOptionType.String,
            required: true,
          },
        ],
      },
      { name: "tonight", description: "What is open on Bunchy right now" },
      {
        name: "up-for",
        description: "Say what you are up for, for the next four hours",
        options: [
          {
            name: "what",
            description: "What you fancy",
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: UP_FOR_CHOICES.map((c) => ({ name: c, value: c })),
          },
        ],
      },
      {
        name: "call",
        description: "Post an open call on Bunchy",
        options: [
          {
            name: "what",
            description: "What you fancy doing",
            type: ApplicationCommandOptionType.String,
            required: true,
          },
        ],
      },
    ]);
    console.info("[bot] commands registered");
  });

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const ctx = {
      discordId: interaction.user.id,
      username: interaction.user.username ?? null,
    };

    try {
      switch (interaction.commandName) {
        case "link":
          return void (await ephemeral(
            interaction,
            await linkCommand(ctx, interaction.options.getString("code", true)),
          ));
        case "tonight":
          return void (await ephemeral(interaction, await tonightCommand(ctx)));
        case "up-for":
          return void (await ephemeral(
            interaction,
            await upForCommand(ctx, interaction.options.getString("what", true)),
          ));
        case "call":
          return void (await ephemeral(
            interaction,
            await callCommand(ctx, interaction.options.getString("what", true)),
          ));
      }
    } catch (error) {
      // Never leave an interaction unanswered: Discord shows "the application
      // did not respond", which reads as broken rather than as failed.
      console.error("[bot] interaction failed:", error);
      if (!interaction.replied) {
        await ephemeral(interaction, "Something went wrong. Try again shortly.");
      }
    }
  });

  /*
    Voice presence.

    Only members who linked their account are recorded, because an unlinked
    Discord user is nobody as far as Bunchy is concerned, and guessing from a
    username is exactly the trust failure account linking exists to prevent.
  */
  client.on("voiceStateUpdate", async (before, after) => {
    const discordId = after.member?.id ?? before.member?.id;
    if (!discordId) return;
    try {
      await setVoicePresence(discordId, after.channelId, after.channel?.name ?? null);
    } catch (error) {
      console.error("[bot] presence update failed:", error);
    }
  });

  /*
    Announcements.

    Polled rather than pushed, because the thing that creates a call is the web
    process and this is a different container: a queue between them would be
    real infrastructure for a message every few minutes. `since` advances only
    over what was actually posted, so a failed send is retried rather than lost,
    and a restart does not replay the afternoon.
  */
  let since = new Date();
  const channelId = process.env.DISCORD_ANNOUNCE_CHANNEL_ID;

  if (channelId) {
    setInterval(async () => {
      try {
        const calls = await announceable(since);
        if (calls.length === 0) return;

        const channel = await client.channels.fetch(channelId);
        if (!channel?.isTextBased() || !("send" in channel)) return;

        for (const call of calls) {
          await channel.send(
            `**${call.title}** — ${call.spotsLeft} ${
              call.spotsLeft === 1 ? "spot" : "spots"
            } left. ${call.url}`,
          );
        }
        since = new Date();
      } catch (error) {
        console.error("[bot] announce pass failed:", error);
      }
    }, ANNOUNCE_EVERY_MS);
    console.info("[bot] announcing to", channelId);
  } else {
    console.info("[bot] DISCORD_ANNOUNCE_CHANNEL_ID not set, not announcing");
  }

  await client.login(token);
  // `env()` after login so a misconfigured APP_URL fails loudly at startup
  // rather than inside the first command somebody runs.
  env();
}

main().catch((error) => {
  console.error("[bot] failed to start:", error);
  process.exit(1);
});
