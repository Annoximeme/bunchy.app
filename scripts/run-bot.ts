import {
  ApplicationCommandOptionType,
  Client,
  GatewayIntentBits,
  MessageFlags,
  Partials,
  type ChatInputCommandInteraction,
  type Guild,
} from "discord.js";
import { env } from "@/server/env";
import {
  UP_FOR_CHOICES,
  announceable,
  announceableSeries,
  aroundCommand,
  callCommand,
  joinByReaction,
  linkCommand,
  markAnnounced,
  tonightCommand,
  unlinkCommand,
  upForCommand,
  weekCommand,
} from "@/server/modules/discord/commands";
import { setVoicePresence } from "@/server/modules/discord/presence";
import { profileForDiscordId } from "@/server/modules/discord/link";
import { dueDirectMessages } from "@/server/modules/discord/dm";
import { announceTarget, botSettings } from "@/server/modules/discord/settings";

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
/*
  Tighter than the announce pass, because a reminder has a deadline. The window
  is thirty minutes and a five-minute poll would deliver some of them with four
  minutes to spare.
*/
const DM_EVERY_MS = 2 * 60 * 1000;

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
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
      // Reactions on the bot's own announcements, so somebody can answer a
      // call without leaving Discord. Still not MessageContent: this says who
      // reacted to which message, never what anybody wrote.
      GatewayIntentBits.GuildMessageReactions,
    ],
    // Reactions arrive for messages the bot did not see posted, which is every
    // message after a restart. Without this they are dropped silently and the
    // join button stops working an hour after each deploy.
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
  });

  client.once("clientReady", async () => {
    console.info(`[bot] connected as ${client.user?.tag}`);

    /*
      Registered per guild rather than globally: guild commands appear
      immediately, where global ones take up to an hour to propagate, and this
      bot serves exactly one server.

      Wrapped, because the first thing that happens to a new bot is that this
      throws. A token can be perfectly valid while the bot has not been invited
      anywhere yet, and Discord answers "Unknown Guild" to the fetch. Unhandled,
      that became an 'error' event on the client and killed a process that had
      just successfully connected, which is a confusing way to be told to press
      the invite link.
    */
    try {
      const guild = await client.guilds.fetch(guildId);
      await registerCommands(guild);
      console.info("[bot] commands registered");
    } catch (error) {
      const code = (error as { code?: number }).code;
      if (code === 10004) {
        console.info(
          "[bot] connected, but not a member of that server yet. Invite it, then restart this container. See /admin/discord for the link.",
        );
      } else {
        console.error("[bot] could not register commands:", error);
      }
    }
  });

  async function registerCommands(guild: Guild) {
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
      { name: "week", description: "What you have coming up on Bunchy" },
      { name: "around", description: "How many people are around right now" },
      { name: "unlink", description: "Disconnect this Discord account from Bunchy" },
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
  }

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
        case "week":
          return void (await ephemeral(interaction, await weekCommand(ctx)));
        case "around":
          return void (await ephemeral(interaction, await aroundCommand(ctx)));
        case "unlink":
          return void (await ephemeral(interaction, await unlinkCommand(ctx)));
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
    Answering a call by reacting to it.

    The announcement carries the activity id, so the handler needs no state of
    its own and survives a restart: whatever is in the channel stays joinable.
    The mapping lives in one place, `ANNOUNCED`, which is filled as messages are
    posted and re-read from the message itself when the process has forgotten.

    The reply is a DM rather than a channel message. Somebody who joined does
    not need it announced to the room, and a bot replying in the channel to
    every reaction is how a useful feature becomes noise.
  */
  const JOIN_EMOJI = "✋";
  const ANNOUNCED = new Map<string, string>();

  client.on("messageReactionAdd", async (reaction, user) => {
    if (user.bot) return;
    if (reaction.emoji.name !== JOIN_EMOJI) return;

    try {
      // A partial reaction has to be fetched before anything on it is readable.
      if (reaction.partial) await reaction.fetch();
      if (reaction.message.partial) await reaction.message.fetch();

      const activityId =
        ANNOUNCED.get(reaction.message.id) ??
        // Recovered from the message the bot itself wrote, so a restart does
        // not orphan every announcement already in the channel.
        reaction.message.content?.match(/\/activities\/([a-z0-9]+)/)?.[1];

      if (!activityId) return;

      const reply = await joinByReaction(
        { discordId: user.id, username: user.username ?? null },
        activityId,
      );
      await user.send(reply).catch(() => {
        // Closed DMs are common and are not an error. The reaction stands as
        // the acknowledgement.
      });
    } catch (error) {
      console.error("[bot] reaction join failed:", error);
    }
  });

  /*
    Voice presence.

    Only members who linked their account are recorded, because an unlinked
    Discord user is nobody as far as Bunchy is concerned, and guessing from a
    username is exactly the trust failure account linking exists to prevent.
  */
  const NUDGED = new Set<string>();

  client.on("voiceStateUpdate", async (before, after) => {
    const discordId = after.member?.id ?? before.member?.id;
    if (!discordId) return;
    try {
      await setVoicePresence(discordId, after.channelId, after.channel?.name ?? null);
    } catch (error) {
      console.error("[bot] presence update failed:", error);
    }

    /*
      A channel that is already busy is the easiest thing in the product to
      fill, and nobody ever thinks to post it.

      When a second person joins, whoever is linked gets one DM offering to
      turn it into an open call. It converts something already happening into
      something joinable, which is the whole shape of the product, and it costs
      the people in the channel nothing if they ignore it.

      Once per channel per process. Somebody who declined does not get asked
      again every time a fourth person walks in, and a bot that nags is worse
      than one that never offered.
    */
    const channel = after.channel;
    if (!channel || channel.members.size < 2) return;
    if (NUDGED.has(channel.id)) return;
    NUDGED.add(channel.id);

    try {
      const profile = await profileForDiscordId(discordId);
      // Only somebody who has linked. An unlinked account cannot create a call
      // and being DMed about one would be noise from a stranger.
      if (!profile) return;

      const user = await client.users.fetch(discordId);
      await user
        .send(
          `There are ${channel.members.size} of you in ${channel.name}. Want others to be able to join? ` +
            `Post it with \`/call\` and it shows up on Bunchy and in the channel. It closes on its own.`,
        )
        .catch(() => {
          // Closed DMs are common and are not an error.
        });
    } catch (error) {
      console.error("[bot] voice nudge failed:", error);
    }
  });

  // Cleared when a channel empties, so tomorrow's session can be offered again.
  client.on("voiceStateUpdate", (before) => {
    const channel = before.channel;
    if (channel && channel.members.size === 0) NUDGED.delete(channel.id);
  });

  /*
    Announcements.

    Polled rather than pushed, because the thing that creates a call is the web
    process and this is a different container: a queue between them would be
    real infrastructure for a message every few minutes. `since` advances only
    over what was actually posted, so a failed send is retried rather than lost,
    and a restart does not replay the afternoon.
  */
  /*
    Announcements.

    Polled rather than pushed, because the thing that creates a call is the web
    process and this is a different container: a queue between them would be
    real infrastructure for a message every few minutes.

    Exactly-once now comes from a column on the activity rather than a
    timestamp in this process, so a restart replays nothing and an occurrence
    that sits in "on today" for hours is still posted only once. The marker is
    written after a successful send, so a failed post is retried.

    The target and the series switch are read every pass, so changing either on
    the admin page lands within five minutes.
  */
  setInterval(async () => {
    try {
      const channelId = await announceTarget();
      if (!channelId) return;

      const channel = await client.channels.fetch(channelId);
      if (!channel?.isTextBased() || !("send" in channel)) return;

      const settings = await botSettings();

      const calls = await announceable();
      for (const call of calls) {
        const message = await channel.send(
          `**${call.title}**, ${call.spotsLeft} ${
            call.spotsLeft === 1 ? "spot" : "spots"
          } left. React ${JOIN_EMOJI} to join, or ${call.url}`,
        );
        ANNOUNCED.set(message.id, call.id);
        await message.react(JOIN_EMOJI).catch(() => {});
        await markAnnounced(call.id);
      }

      if (!settings.announceSeries) return;

      const occurrences = await announceableSeries();
      for (const occurrence of occurrences) {
        const when = occurrence.startsAt.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        });
        // Worded as a standing thing rather than as a request. Nobody is
        // asking; it is on.
        const message = await channel.send(
          `**${occurrence.title}** is on tonight at ${when}, ${occurrence.going} going. React ${JOIN_EMOJI} to come, or ${occurrence.url}`,
        );
        ANNOUNCED.set(message.id, occurrence.id);
        await message.react(JOIN_EMOJI).catch(() => {});
        await markAnnounced(occurrence.id);
      }
    } catch (error) {
      console.error("[bot] announce pass failed:", error);
    }
  }, ANNOUNCE_EVERY_MS);

  /*
    Direct messages: reminders for things somebody joined, and the outcome
    question for something they went to.

    Every one is tied to an action the member took. Nothing fires because
    somebody has been quiet or because there is something new to look at, which
    are the messages /about promises do not exist, and a private channel is
    where it would be easiest to break that promise quietly.

    A closed DM is not an error and is not retried differently: the mark is
    written either way, because somebody who has closed their DMs has already
    said what they want.
  */
  setInterval(async () => {
    try {
      for (const message of await dueDirectMessages()) {
        const user = await client.users.fetch(message.discordId).catch(() => null);
        if (user) await user.send(message.content).catch(() => {});
        await message.mark();
      }
    } catch (error) {
      console.error("[bot] direct message pass failed:", error);
    }
  }, DM_EVERY_MS);

  await client.login(token);
  // `env()` after login so a misconfigured APP_URL fails loudly at startup
  // rather than inside the first command somebody runs.
  env();
}

main().catch((error) => {
  console.error("[bot] failed to start:", error);
  process.exit(1);
});
