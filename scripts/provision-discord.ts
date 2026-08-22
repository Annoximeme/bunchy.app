/**
 * Build the Discord server out: categories, channels, roles and who may do what.
 *
 *   docker compose exec app node ...        # not this, it needs tsx and the repo
 *   ./scripts/provision-discord.sh          # dry run, prints the plan
 *   ./scripts/provision-discord.sh --apply  # actually does it
 *
 * ## Dry run by default
 *
 * This writes to a live community server that other people are in. A script
 * that mutates one on the strength of being run at all is a script that
 * renames somebody's channels because a shell recalled the wrong line. So it
 * prints what it would do and changes nothing unless asked twice.
 *
 * ## Idempotent, and additive
 *
 * Everything is matched by name. A channel that already exists is left where it
 * is, a role that already exists has its permissions corrected, and nothing is
 * ever deleted. Running it again after adding a channel by hand does not fight
 * you for it. The one thing it will change on an existing object is
 * permissions, because that is the part that is wrong right now and the part
 * nobody notices is wrong.
 *
 * ## Why this shape of server
 *
 * An empty channel is worse than no channel, and an empty category is worse
 * than an empty channel, because it is a heading with nothing under it. Four of
 * the six categories here had nothing in them at all, which is the thing that
 * makes a new server read as abandoned.
 *
 * So this is deliberately not thirty channels. It is eighteen, and every one of
 * them is somewhere a specific thing happens that would otherwise happen in
 * #general. Room to grow is left as room, not pre-built as empty channels.
 */

const API = "https://discord.com/api/v10";

/**
 * Read a variable or stop.
 *
 * A function rather than a guard at the top, so the value is a plain string
 * everywhere below. Narrowing from an `if` at module scope does not reliably
 * survive into a function body, and the alternative is a non-null assertion at
 * every use, which is the same claim made less visibly.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`${name} is required.`);
    process.exit(1);
  }
  return value;
}

const TOKEN = required("DISCORD_BOT_TOKEN");
const GUILD = required("DISCORD_GUILD_ID");
const APPLY = process.argv.includes("--apply");

// --- permission bits, named -------------------------------------------------

const P = {
  CREATE_INSTANT_INVITE: 1n << 0n,
  KICK_MEMBERS: 1n << 1n,
  BAN_MEMBERS: 1n << 2n,
  MANAGE_CHANNELS: 1n << 4n,
  ADD_REACTIONS: 1n << 6n,
  VIEW_AUDIT_LOG: 1n << 7n,
  STREAM: 1n << 9n,
  VIEW_CHANNEL: 1n << 10n,
  SEND_MESSAGES: 1n << 11n,
  MANAGE_MESSAGES: 1n << 13n,
  EMBED_LINKS: 1n << 14n,
  ATTACH_FILES: 1n << 15n,
  READ_MESSAGE_HISTORY: 1n << 16n,
  MENTION_EVERYONE: 1n << 17n,
  USE_EXTERNAL_EMOJIS: 1n << 18n,
  CONNECT: 1n << 20n,
  SPEAK: 1n << 21n,
  MUTE_MEMBERS: 1n << 22n,
  DEAFEN_MEMBERS: 1n << 23n,
  MOVE_MEMBERS: 1n << 24n,
  USE_VAD: 1n << 25n,
  CHANGE_NICKNAME: 1n << 26n,
  MANAGE_NICKNAMES: 1n << 27n,
  MANAGE_ROLES: 1n << 28n,
  USE_APPLICATION_COMMANDS: 1n << 31n,
  MANAGE_EVENTS: 1n << 33n,
  MANAGE_THREADS: 1n << 34n,
  CREATE_PUBLIC_THREADS: 1n << 35n,
  CREATE_PRIVATE_THREADS: 1n << 36n,
  USE_EXTERNAL_STICKERS: 1n << 37n,
  SEND_MESSAGES_IN_THREADS: 1n << 38n,
  USE_EMBEDDED_ACTIVITIES: 1n << 39n,
  MODERATE_MEMBERS: 1n << 40n,
  CREATE_GUILD_EXPRESSIONS: 1n << 44n,
  CREATE_EVENTS: 1n << 45n,
  SEND_VOICE_MESSAGES: 1n << 47n,
  SEND_POLLS: 1n << 49n,
} as const;

const bits = (...names: Array<keyof typeof P>) =>
  names.reduce((acc, n) => acc | P[n], 0n);

// --- what the server should look like ---------------------------------------

interface ChannelSpec {
  name: string;
  /** 0 text, 2 voice. Nothing here needs a forum or a stage yet. */
  type: 0 | 2;
  topic?: string;
  /** Nobody but staff and the bot may post. Reading stays open to everyone. */
  readOnly?: boolean;
  /** Hidden from everyone except staff and the bot. */
  staffOnly?: boolean;
}

interface CategorySpec {
  name: string;
  staffOnly?: boolean;
  channels: ChannelSpec[];
}

/**
 * The six categories that already existed, in the order somebody meets them:
 * find your feet, find people, talk, do something, tell us how it is going,
 * and the room members never see.
 */
const STRUCTURE: CategorySpec[] = [
  {
    name: "👋 START HERE",
    channels: [
      {
        name: "welcome",
        type: 0,
        readOnly: true,
        topic: "The bot says hello here when somebody new arrives. Nobody is told when you leave.",
      },
      {
        name: "rules",
        type: 0,
        readOnly: true,
        topic: "Six blocks, fourteen rules, the same ones Bunchy itself runs on. bunchy.app/safety",
      },
      {
        name: "announcements",
        type: 0,
        readOnly: true,
        topic: "Things worth interrupting you for, and nothing else.",
      },
      {
        name: "introductions",
        type: 0,
        topic: "Who you are and what you are into. No format, no pressure, no obligation to reply to everyone.",
      },
    ],
  },
  {
    name: "🔎 DISCOVER",
    channels: [
      {
        name: "looking-for",
        type: 0,
        topic: "Somebody to do a specific thing with. Say the thing, say roughly when, and let people answer.",
      },
      {
        name: "find-a-bunch",
        type: 0,
        topic: "Looking to join a bunch, or to start one. A bunch is a handful of people, not a server.",
      },
      {
        name: "where-you-are",
        type: 0,
        topic: "Roughly where you are and what timezone you keep, so the people near you can find you. A city is plenty. Never an address.",
      },
    ],
  },
  {
    name: "💬 COMMUNITY",
    channels: [
      { name: "general", type: 0, topic: "The main room. Anything, within the rules." },
      {
        name: "how-it-went",
        type: 0,
        topic: "Tell us how the thing actually went. The good ones and the awkward ones both, because only one of those gets posted anywhere else.",
      },
    ],
  },
  {
    name: "🎮 DO SOMETHING",
    channels: [
      {
        name: "open-calls",
        type: 0,
        topic: "Plans posted from Bunchy land here. React with ✋ to join one. Post your own from anywhere with /call.",
      },
      {
        name: "online-play",
        type: 0,
        topic: "Games, sessions and whatever is on tonight. Online counts, and early on it is most of it.",
      },
      {
        name: "Lounge",
        type: 2,
        topic: "Open voice. Joining marks you as around on Bunchy for two hours, as a count and never a name.",
      },
      { name: "Game Room", type: 2, topic: "Voice for whatever is being played." },
      { name: "Co-working", type: 2, topic: "Cameras off, mics optional. Company while you get on with something." },
    ],
  },
  {
    name: "💡 BUNCHY LABS",
    channels: [
      {
        name: "feedback",
        type: 0,
        topic: "What is annoying, what is missing, what is broken. One person builds this, so it is read by him.",
      },
      {
        name: "whats-new",
        type: 0,
        readOnly: true,
        topic: "What changed and when. Mirrors bunchy.app/whats-new",
      },
    ],
  },
  {
    name: "🛡️ STAFF",
    staffOnly: true,
    channels: [
      { name: "staff-room", type: 0, topic: "Moderator talk. Nothing from the report queue leaves this category." },
      { name: "escalations", type: 0, topic: "Anything that needs an admin, the police, or both. See the guidelines in the staff area." },
    ],
  },
];

/**
 * `@everyone`, corrected.
 *
 * Two removals matter. `MENTION_EVERYONE` let any member ping the entire
 * server, which is the permission most reliably abused on a public Discord and
 * needs one bad afternoon to prove it. Opt-in ping roles below do the same job
 * for the people who actually want to be pinged. `CREATE_EVENTS` and
 * `CREATE_GUILD_EXPRESSIONS` let anybody schedule a server event that notifies
 * people, or add emoji, neither of which a stranger needs on day one.
 *
 * Everything else stays. Members can still invite friends, talk, post images,
 * react, join voice, run commands and open threads.
 */
const EVERYONE_PERMISSIONS = bits(
  "CREATE_INSTANT_INVITE",
  "ADD_REACTIONS",
  "STREAM",
  "VIEW_CHANNEL",
  "SEND_MESSAGES",
  "EMBED_LINKS",
  "ATTACH_FILES",
  "READ_MESSAGE_HISTORY",
  "USE_EXTERNAL_EMOJIS",
  "USE_EXTERNAL_STICKERS",
  "CONNECT",
  "SPEAK",
  "USE_VAD",
  "CHANGE_NICKNAME",
  "USE_APPLICATION_COMMANDS",
  "CREATE_PUBLIC_THREADS",
  "SEND_MESSAGES_IN_THREADS",
  "USE_EMBEDDED_ACTIVITIES",
  "SEND_VOICE_MESSAGES",
  "SEND_POLLS",
);

interface RoleSpec {
  name: string;
  permissions: bigint;
  colour: number;
  hoist?: boolean;
  mentionable?: boolean;
  why: string;
}

/**
 * Deliberately no `BAN_MEMBERS` on staff.
 *
 * It mirrors the product: on Bunchy a moderator may suspend and an admin bans,
 * and the guidelines say so in as many words. A Discord where the same people
 * hold a harder version of the same power is a second, contradictory policy
 * wearing the same name.
 */
const ROLES: RoleSpec[] = [
  {
    name: "Bunchy Staff",
    permissions: bits(
      "VIEW_AUDIT_LOG",
      "KICK_MEMBERS",
      "MODERATE_MEMBERS",
      "MANAGE_MESSAGES",
      "MANAGE_THREADS",
      "MANAGE_NICKNAMES",
      "MUTE_MEMBERS",
      "DEAFEN_MEMBERS",
      "MOVE_MEMBERS",
      "MENTION_EVERYONE",
      "MANAGE_EVENTS",
    ),
    colour: 0xff5c6c,
    hoist: true,
    mentionable: true,
    why: "Had no permissions at all, so a moderator could not remove a message or time anybody out.",
  },
  {
    name: "Linked",
    permissions: 0n,
    colour: 0x0e7a69,
    hoist: false,
    mentionable: false,
    why: "Has connected a Bunchy account with /link. No extra power, it just tells you who you can plan with.",
  },
  {
    name: "Game Night",
    permissions: 0n,
    colour: 0x7c6cff,
    mentionable: true,
    why: "Opt-in ping role, so a game can be called without pinging people who do not play.",
  },
  {
    name: "Online Sessions",
    permissions: 0n,
    colour: 0x2f9e8f,
    mentionable: true,
    why: "Opt-in ping role for the online half, which is most of it early on.",
  },
  {
    name: "Meetups",
    permissions: 0n,
    colour: 0xd98b3a,
    mentionable: true,
    why: "Opt-in ping role for meeting in person, which not everybody is near enough to do.",
  },
];

// --- talking to Discord -----------------------------------------------------

/** Only the fields this script reads. Discord sends a great deal more. */
interface DiscordRole {
  id: string;
  name: string;
  position: number;
  permissions: string;
  color: number;
  hoist: boolean;
  mentionable: boolean;
  managed: boolean;
}

interface DiscordChannel {
  id: string;
  name: string;
  type: number;
  parent_id: string | null;
  topic?: string | null;
  permission_overwrites?: Overwrite[];
}

interface Overwrite {
  id: string;
  type: 0 | 1;
  allow?: string;
  deny?: string;
}


let writes = 0;

/** Things that could not be done, reported together at the end. */
const problems: string[] = [];

/**
 * Do one piece of work, and let the rest continue if it fails.
 *
 * A provisioning run is a list of mostly independent changes. Aborting all of
 * them because one was refused leaves exactly the half-built server this script
 * is supposed to avoid, and the most likely refusal is the least important
 * change: Discord will not let a bot grant a permission it does not hold
 * itself, which is a sane rule and has nothing to do with whether the channels
 * can be created.
 */
async function attempt(description: string, work: () => Promise<unknown>) {
  try {
    await work();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`    could not: ${message.slice(0, 160)}`);
    problems.push(`${description}: ${message.slice(0, 200)}`);
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bot ${TOKEN}`,
      "content-type": "application/json",
      "x-audit-log-reason": "Bunchy server provisioning",
      ...init.headers,
    },
  });

  // One retry on a rate limit, which is the only failure worth handling
  // automatically: everything else wants a person to read it.
  if (response.status === 429) {
    const body = (await response.json()) as { retry_after?: number };
    const wait = Math.ceil((body.retry_after ?? 1) * 1000) + 250;
    console.log(`    (rate limited, waiting ${wait}ms)`);
    await new Promise((r) => setTimeout(r, wait));
    return call<T>(path, init);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${init.method ?? "GET"} ${path} answered ${response.status}: ${text.slice(0, 300)}`);
  }

  if (init.method && init.method !== "GET") {
    writes += 1;
    // Gentle on purpose. Provisioning is a one-off; being slow costs nothing
    // and being rate limited halfway through leaves a half-built server.
    await new Promise((r) => setTimeout(r, 350));
  }

  return (response.status === 204 ? null : await response.json()) as T;
}

function act(description: string) {
  console.log(`  ${APPLY ? "->" : "would"} ${description}`);
}

async function main() {
  console.log(APPLY ? "APPLYING changes\n" : "DRY RUN, nothing will be changed. Pass --apply to do it.\n");

  const me = await call<{ id: string; username: string }>("/users/@me");
  const guild = await call<{ name: string }>(`/guilds/${GUILD}`);
  const member = await call<{ roles: string[] }>(`/guilds/${GUILD}/members/${me.id}`);
  let roles = await call<DiscordRole[]>(`/guilds/${GUILD}/roles`);
  const channels = await call<DiscordChannel[]>(`/guilds/${GUILD}/channels`);

  console.log(`Server: ${guild.name}`);
  console.log(`Bot:    ${me.username}\n`);

  // The bot can only edit roles below its own highest one. Checked up front,
  // because finding out halfway through leaves the server half-configured.
  const myTop = roles
    .filter((r) => member.roles.includes(r.id))
    .reduce((max, r) => Math.max(max, r.position), 0);

  const blocked = ROLES.map((spec) => roles.find((r) => r.name === spec.name)).filter(
    (r): r is DiscordRole => Boolean(r) && r!.position >= myTop,
  );

  if (blocked.length > 0) {
    console.error("The bot's role is not above these, so it cannot edit them:");
    for (const r of blocked) console.error(`  ${r.name} (position ${r.position}), bot is at ${myTop}`);
    console.error("\nDrag the Bunchy role above them in Server Settings, Roles, then run this again.");
    process.exit(1);
  }

  // --- roles ---------------------------------------------------------------

  console.log("ROLES");
  for (const spec of ROLES) {
    const existing = roles.find((r) => r.name === spec.name);
    const payload = {
      name: spec.name,
      permissions: String(spec.permissions),
      color: spec.colour,
      hoist: spec.hoist ?? false,
      mentionable: spec.mentionable ?? false,
    };

    if (!existing) {
      act(`create role ${spec.name}  (${spec.why})`);
      if (APPLY) {
        await attempt(`create role ${spec.name}`, async () => {
          const created = await call<DiscordRole>(`/guilds/${GUILD}/roles`, {
            method: "POST",
            body: JSON.stringify(payload),
          });
          roles.push(created);
        });
      }
      continue;
    }

    const same =
      existing.permissions === payload.permissions &&
      existing.color === payload.color &&
      existing.hoist === payload.hoist &&
      existing.mentionable === payload.mentionable;

    if (same) {
      console.log(`  ok    ${spec.name}`);
    } else {
      act(`update role ${spec.name}: permissions ${existing.permissions} -> ${payload.permissions}`);
      if (APPLY) {
        await attempt(`update role ${spec.name}`, () =>
          call<DiscordRole>(`/guilds/${GUILD}/roles/${existing.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          }),
        );
      }
    }
  }

  // @everyone is a role whose id is the guild id. Position 0 always, so the
  // hierarchy check above never applies to it.
  const everyone = roles.find((r) => r.id === GUILD);
  if (everyone && everyone.permissions !== String(EVERYONE_PERMISSIONS)) {
    act(
      `update @everyone: ${everyone.permissions} -> ${EVERYONE_PERMISSIONS}  (drops MENTION_EVERYONE, CREATE_EVENTS, CREATE_GUILD_EXPRESSIONS)`,
    );
    if (APPLY) {
      await attempt("update @everyone", () =>
        call<DiscordRole>(`/guilds/${GUILD}/roles/${GUILD}`, {
          method: "PATCH",
          body: JSON.stringify({ permissions: String(EVERYONE_PERMISSIONS) }),
        }),
      );
    }
  } else if (everyone) {
    console.log("  ok    @everyone");
  }

  if (APPLY) roles = await call<DiscordRole[]>(`/guilds/${GUILD}/roles`);

  const staffRole = roles.find((r) => r.name === "Bunchy Staff");
  // The bot's own role. Managed, so Discord created it with the application
  // and it is the one an invite link's `permissions` writes to.
  const botRole = roles.find((r) => member.roles.includes(r.id) && r.managed);

  // --- categories and channels ---------------------------------------------

  console.log("\nCHANNELS");
  for (const [index, category] of STRUCTURE.entries()) {
    let parent = channels.find((c) => c.type === 4 && c.name === category.name);

    if (!parent) {
      act(`create category ${category.name}`);
      if (APPLY) {
        await attempt(`create category ${category.name}`, async () => {
          parent = await call<DiscordChannel>(`/guilds/${GUILD}/channels`, {
            method: "POST",
            body: JSON.stringify({ name: category.name, type: 4, position: index }),
          });
          channels.push(parent);
        });
      }
    } else {
      console.log(`  ok    category ${category.name}`);
    }

    /*
      A private category has to let the bot in explicitly.

      The staff category denied VIEW_CHANNEL to @everyone, and the bot has no
      role that overrides it, so it could not see the category it was being
      asked to create channels inside. Discord answers that with a flat 403 and
      no hint about which of the several possible permissions is missing.

      Channels inherit this from the category, so fixing it here fixes it for
      everything created underneath.
    */
    if (category.staffOnly && parent) {
      const wanted: Overwrite[] = [
        { id: GUILD, type: 0, deny: String(bits("VIEW_CHANNEL", "CONNECT")) },
      ];
      if (staffRole) {
        wanted.push({
          id: staffRole.id,
          type: 0,
          allow: String(bits("VIEW_CHANNEL", "CONNECT", "SEND_MESSAGES", "READ_MESSAGE_HISTORY")),
        });
      }
      if (botRole) {
        wanted.push({
          id: botRole.id,
          type: 0,
          allow: String(bits("VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS", "READ_MESSAGE_HISTORY")),
        });
      }

      const current = parent.permission_overwrites ?? [];
      const missing = wanted.filter(
        (w) => !current.some((c) => c.id === w.id && c.allow === (w.allow ?? "0") && c.deny === (w.deny ?? "0")),
      );

      if (missing.length === 0) {
        console.log(`  ok    ${category.name} permissions`);
      } else {
        act(`open ${category.name} to staff and the bot, keep it shut to everyone else`);
        if (APPLY) {
          const parentId = parent.id;
          await attempt(`set permissions on ${category.name}`, async () => {
            const updated = await call<DiscordChannel>(`/channels/${parentId}`, {
              method: "PATCH",
              body: JSON.stringify({ permission_overwrites: wanted }),
            });
            if (parent) parent.permission_overwrites = updated.permission_overwrites;
          });
        }
      }
    }

    for (const spec of category.channels) {
      const existing = channels.find(
        (c) => c.type === spec.type && c.name.toLowerCase() === spec.name.toLowerCase(),
      );

      const overwrites: Overwrite[] = [];
      const staffOnly = category.staffOnly || spec.staffOnly;

      if (staffOnly) {
        overwrites.push({ id: GUILD, type: 0, deny: String(P.VIEW_CHANNEL) });
        if (staffRole) overwrites.push({ id: staffRole.id, type: 0, allow: String(P.VIEW_CHANNEL) });
        if (botRole) overwrites.push({ id: botRole.id, type: 0, allow: String(P.VIEW_CHANNEL) });
      } else if (spec.readOnly) {
        overwrites.push({
          id: GUILD,
          type: 0,
          deny: String(bits("SEND_MESSAGES", "CREATE_PUBLIC_THREADS", "SEND_MESSAGES_IN_THREADS")),
          allow: String(bits("VIEW_CHANNEL", "READ_MESSAGE_HISTORY", "ADD_REACTIONS")),
        });
        if (staffRole) overwrites.push({ id: staffRole.id, type: 0, allow: String(P.SEND_MESSAGES) });
        if (botRole) {
          overwrites.push({
            id: botRole.id,
            type: 0,
            allow: String(bits("SEND_MESSAGES", "EMBED_LINKS", "ADD_REACTIONS", "READ_MESSAGE_HISTORY")),
          });
        }
      }

      if (!existing) {
        act(
          `create ${spec.type === 2 ? "voice" : "text"} #${spec.name} in ${category.name}` +
            (staffOnly ? "  [staff only]" : spec.readOnly ? "  [read only]" : ""),
        );
        if (APPLY && parent) {
          const parentId = parent.id;
          await attempt(`create #${spec.name}`, async () => {
            const created = await call<DiscordChannel>(`/guilds/${GUILD}/channels`, {
              method: "POST",
              body: JSON.stringify({
                name: spec.name,
                type: spec.type,
                parent_id: parentId,
                topic: spec.type === 0 ? spec.topic : undefined,
                permission_overwrites: overwrites.length ? overwrites : undefined,
              }),
            });
            channels.push(created);
          });
        }
        continue;
      }

      // Exists. Correct the things most likely to be wrong, and leave its
      // position alone: somebody may have arranged it deliberately.
      const patch: Record<string, unknown> = {};
      if (parent && existing.parent_id !== parent.id) patch.parent_id = parent.id;
      if (spec.type === 0 && spec.topic && existing.topic !== spec.topic) patch.topic = spec.topic;
      if (overwrites.length > 0) patch.permission_overwrites = overwrites;

      if (Object.keys(patch).length === 0) {
        console.log(`  ok    #${spec.name}`);
      } else {
        act(`update #${spec.name}: ${Object.keys(patch).join(", ")}`);
        if (APPLY) {
          await attempt(`update #${spec.name}`, () =>
            call<DiscordChannel>(`/channels/${existing.id}`, {
              method: "PATCH",
              body: JSON.stringify(patch),
            }),
          );
        }
      }
    }
  }

  if (!APPLY) {
    console.log("\nNothing changed. Re-run with --apply to make it so.");
    return;
  }

  console.log(`\nDone. ${writes} writes.`);

  if (problems.length > 0) {
    console.log(`\n${problems.length} thing(s) could not be done:`);
    for (const p of problems) console.log(`  ! ${p}`);
    console.log(
      "\nA 403 on a role usually means the bot was asked to grant a permission\n" +
        "it does not hold itself, which Discord refuses. That one has to be set by\n" +
        "hand in Server Settings, Roles.",
    );
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error("\nFailed:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
