import type { Metadata } from "next";
import Link from "next/link";
import { Check, Circle, TriangleAlert } from "lucide-react";
import { requireAdmin } from "@/server/modules/admin/guard";
import { brand } from "@/lib/brand";
import { AdminHeader, Panel } from "@/components/admin/primitives";
import {
  REQUIRED_PERMISSIONS,
  checkGuild,
  checkToken,
  inviteUrl,
  linkedMemberCount,
} from "@/server/modules/discord/setup";
import { botSettings } from "@/server/modules/discord/settings";
import { DiscordControls } from "@/components/admin/discord-controls";

export const metadata: Metadata = { title: "Discord bot" };
export const dynamic = "force-dynamic";

/**
 * Setting the bot up, and finding out what is actually wrong when it is not.
 *
 * Admin only, like the site gate and announcements, because it displays the
 * server's channel list and the state of a credential.
 *
 * ## Why it makes live calls rather than reading config
 *
 * A setup page that reports whether an environment variable is set will say
 * "configured" while the token is revoked, the bot has been kicked, or the
 * channel id belongs to a different server. Those three are indistinguishable
 * from inside the process and they are what actually goes wrong, so every check
 * here asks Discord and reports the answer.
 *
 * ## Why the steps stay visible once they pass
 *
 * A wizard that hides completed steps is useless the second time, and the
 * second time is when somebody is debugging. Every step stays, with its state
 * next to it.
 */

type State = "ok" | "bad" | "todo";

function Status({ state, children }: { state: State; children: React.ReactNode }) {
  const icon =
    state === "ok" ? (
      <Check size={16} className="text-teal" aria-hidden />
    ) : state === "bad" ? (
      <TriangleAlert size={16} className="text-danger" aria-hidden />
    ) : (
      <Circle size={16} className="text-muted" aria-hidden />
    );

  return (
    <p className="flex items-start gap-2 text-sm">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className={state === "bad" ? "text-danger" : "text-ink-soft"}>
        {children}
      </span>
      <span className="sr-only">
        {state === "ok" ? "Done" : state === "bad" ? "Problem" : "Not done yet"}
      </span>
    </p>
  );
}

function Step({
  n,
  title,
  state,
  children,
}: {
  n: number;
  title: string;
  state: State;
  children: React.ReactNode;
}) {
  return (
    <li className="border-b border-line p-5 last:border-b-0">
      <div className="flex items-baseline gap-3">
        <span
          className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            state === "ok"
              ? "bg-teal-soft text-teal"
              : state === "bad"
                ? "bg-danger-soft text-danger"
                : "bg-surface-sunken text-muted"
          }`}
        >
          {state === "ok" ? "✓" : n}
        </span>
        <h3 className="font-semibold text-ink">{title}</h3>
      </div>
      <div className="mt-2.5 space-y-2 pl-9 text-sm text-ink-soft">{children}</div>
    </li>
  );
}

const Code = ({ children }: { children: React.ReactNode }) => (
  <code className="rounded bg-surface-sunken px-1.5 py-0.5 font-mono text-[13px]">
    {children}
  </code>
);

export default async function DiscordSetupPage() {
  await requireAdmin();

  // In parallel: three round trips to Discord, and this page is behind an
  // admin guard rather than in front of a member.
  const [token, guild, linked, settings] = await Promise.all([
    checkToken(),
    checkGuild(),
    linkedMemberCount(),
    botSettings(),
  ]);

  // Everything up and running, so the setup steps are folded away by default.
  // A wizard that stays open forever is a page that never stops looking
  // unfinished.
  const ready = token.ok && guild.ok;

  const invite = token.applicationId ? inviteUrl(token.applicationId) : null;

  return (
    <>
      <AdminHeader
        title="Discord bot"
        subtitle="Set it up, and see what is actually wrong when it is not working."
      />

      <Panel
        title="Where it stands"
        note="Checked against Discord just now, not read from configuration. A revoked token and a kicked bot both look fine from inside the app."
      >
        <div className="space-y-2 p-5">
          <Status state={token.configured ? (token.ok ? "ok" : "bad") : "todo"}>
            {!token.configured
              ? "No bot token set. The bot container starts, logs that, and exits."
              : token.ok
                ? `Token works. Connected as ${token.botName}.`
                : `Token set but rejected. ${token.error}`}
          </Status>

          <Status
            state={
              !guild.configured
                ? "todo"
                : !guild.ok || guild.channelError
                  ? "bad"
                  : "ok"
            }
          >
            {!guild.configured
              ? "No server id set."
              : guild.ok
                ? guild.channelError
                  ? `In ${guild.guildName}, but the channel list did not come back. ${guild.channelError}`
                  : `In ${guild.guildName}, and can see ${guild.channels?.length ?? 0} text channels.`
                : (guild.error ?? "Cannot reach the server.")}
          </Status>

          <Status
            state={
              settings.announceChannelId && settings.announcementsEnabled
                ? "ok"
                : "todo"
            }
          >
            {!settings.announceChannelId
              ? "Announcing nowhere. Commands still work; nothing is posted."
              : !settings.announcementsEnabled
                ? `Announcements are switched off. The channel is still #${settings.announceChannelName ?? settings.announceChannelId}.`
                : `Announcing to #${settings.announceChannelName ?? settings.announceChannelId}.`}
          </Status>

          <Status state={settings.welcomeChannelId ? "ok" : "todo"}>
            {settings.welcomeChannelId
              ? `Greeting new members in #${settings.welcomeChannelName ?? settings.welcomeChannelId}.`
              : "Nobody is greeted. New members arrive to nothing."}
          </Status>

          <Status
            state={
              settings.rulesChannelId
                ? settings.rulesMessageId
                  ? "ok"
                  : "todo"
                : "todo"
            }
          >
            {!settings.rulesChannelId
              ? "No rules channel chosen."
              : settings.rulesMessageId
                ? `Rules posted in #${settings.rulesChannelName ?? settings.rulesChannelId}.`
                : `Rules channel is #${settings.rulesChannelName ?? settings.rulesChannelId}, but nothing has been posted there yet.`}
          </Status>

          <Status state={linked > 0 ? "ok" : "todo"}>
            {linked === 0
              ? "Nobody has connected an account yet. Members do that from their profile."
              : `${linked} ${linked === 1 ? "member has" : "members have"} connected an account.`}
          </Status>
        </div>
      </Panel>

      <Panel
        title="Controls"
        note="Changed here rather than in a file on the server. The bot re-reads these every pass, so a change lands within five minutes."
        className="mt-6"
      >
        <DiscordControls
          settings={settings}
          channels={guild.channels ?? []}
          channelError={guild.channelError}
        />
      </Panel>

      <Panel title={ready ? "Setup, for reference" : "Setting it up"} className="mt-6">
        <ol className={`text-sm ${ready ? "opacity-70" : ""}`}>
          <Step n={1} title="Create the application" state={token.ok ? "ok" : "todo"}>
            <p>
              Go to{" "}
              <a
                href="https://discord.com/developers/applications"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-ink underline underline-offset-2"
              >
                discord.com/developers/applications
              </a>
              , press New Application and name it {brand.name}. Open the{" "}
              <strong>Bot</strong> tab and press Reset Token to reveal one. It is
              shown once.
            </p>
          </Step>

          <Step n={2} title="Turn on the one intent it needs" state={token.ok ? "ok" : "todo"}>
            <p>
              Still on the Bot tab, under Privileged Gateway Intents, turn{" "}
              <strong>Server Members Intent</strong> <strong>on</strong>. Leave{" "}
              <strong>Presence Intent</strong> and{" "}
              <strong>Message Content Intent</strong> off.
            </p>
            <p>
              Server Members is what tells the bot somebody joined, so the
              welcome message is impossible without it. Discord refuses the
              connection outright rather than degrading when a declared
              privileged intent is not enabled, so if the first line of this
              page says the token works, it is already on.
            </p>
            <p>
              The other three, <Code>Guilds</Code>, <Code>GuildVoiceStates</Code>{" "}
              and <Code>GuildMessageReactions</Code>, are not privileged.
              Message content is deliberately not among them: the reaction
              intent says who reacted to which message and never what anybody
              wrote, and asking for message content would mean asking to read
              the whole server in order to run a handful of commands.
            </p>
          </Step>

          <Step
            n={3}
            title="Put the token in the environment"
            state={token.configured ? (token.ok ? "ok" : "bad") : "todo"}
          >
            <p>
              Add it to <Code>.env</Code> on the server, then redeploy. The value
              is never shown on this page, and this page never sends it to your
              browser.
            </p>
            <pre className="overflow-x-auto rounded-[var(--radius-control)] bg-surface-sunken p-3 font-mono text-[13px] leading-relaxed">
              {`DISCORD_BOT_TOKEN=your-token-here
DISCORD_GUILD_ID=your-server-id`}
            </pre>
            <p>
              For the server id, turn on Developer Mode in Discord under Settings,
              Advanced, then right-click the server and Copy Server ID.
            </p>
          </Step>

          <Step n={4} title="Invite it to the server" state={guild.ok ? "ok" : "todo"}>
            {invite ? (
              <>
                <p>
                  This link is built from the application id inside your token,
                  so it is the right one for this bot and asks for exactly the
                  permissions it uses and no others.
                </p>
                <p>
                  <a
                    href={invite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex rounded-full bg-accent px-4 py-2 text-sm font-bold text-[var(--color-on-accent)]"
                  >
                    Invite {token.botName ?? "the bot"} to your server
                  </a>
                </p>
                <p className="text-muted">
                  Permissions <Code>{REQUIRED_PERMISSIONS}</Code>: View Channels,
                  Send Messages, Add Reactions and Read Message History. The last
                  two are what make answering a call one tap: the bot pre-adds
                  the join emoji, and reads reactions on announcements posted
                  before its last restart. Not Administrator, which most guides
                  suggest and which would give a bot that posts one message every
                  few minutes the power to delete the server. Voice presence
                  needs no permission at all beyond seeing the channel, because
                  it reads voice state through the gateway rather than the API.
                </p>
                <p className="text-muted">
                  Re-opening this link on a server the bot is already in updates
                  its permissions rather than adding it twice, which is what to
                  do if the join reaction is not working.
                </p>
              </>
            ) : (
              <p className="text-muted">
                The invite link appears here once the token is set and working. It
                is derived from the application id inside the token, so there is
                no second value to copy.
              </p>
            )}
          </Step>

          {/*
            Step five used to be "paste a channel id into .env and redeploy".
            That is the Controls panel above now, so this step is a pointer
            rather than a set of instructions to a thing that no longer works
            that way.
          */}
          <Step
            n={5}
            title="Choose the channels"
            state={
              settings.announceChannelId &&
              settings.welcomeChannelId &&
              settings.rulesChannelId
                ? "ok"
                : "todo"
            }
          >
            <p>
              Three of them, all in the Controls panel at the top of this page:
              where open calls are announced, where new members are greeted, and
              where the rules live. Each takes effect within five minutes and
              none needs a deploy.
            </p>
            <p>
              The rules are posted from that panel too. Publishing a second time
              edits the message already there rather than adding another copy.
            </p>
          </Step>

          <Step n={6} title="Connect your own account" state={linked > 0 ? "ok" : "todo"}>
            <p>
              Members get a six-digit code from their{" "}
              <Link
                href="/profile"
                className="text-accent-ink underline underline-offset-2"
              >
                profile
              </Link>{" "}
              and type <Code>/link 123456</Code> at the bot. The code lasts five
              minutes and is single use.
            </p>
            <p>
              The code goes outward rather than inward on purpose: the session
              already proves who somebody is, so it only has to carry that proof
              to Discord. A code issued by the bot and pasted into Bunchy would be
              proving Discord identity to us, which needs OAuth and would let
              anybody who can post in the server hand a code to somebody else.
            </p>
          </Step>
        </ol>
      </Panel>

      <Panel title="What it does once it is running" className="mt-6">
        <div className="space-y-3 p-5 text-sm text-ink-soft">
          <p>
            <strong className="text-ink">Commands.</strong> <Code>/link</Code>,{" "}
            <Code>/tonight</Code>, <Code>/up-for</Code>, <Code>/call</Code>,{" "}
            <Code>/week</Code>, <Code>/around</Code>, <Code>/rules</Code> and{" "}
            <Code>/unlink</Code>. Every reply is ephemeral, so only the person who ran it sees the
            answer. Bunchy Now shows counts and never names anybody, and routing
            the same fact through Discord must not become the loophole.
          </p>
          <p>
            <strong className="text-ink">Announcements.</strong> Every five
            minutes it posts open calls made since the last pass, and only ones
            with spare capacity. Nothing from a private bunch, because that is a
            group&rsquo;s own business and Discord is a different room with
            different people in it. A restart does not replay the afternoon.
          </p>
          <p>
            <strong className="text-ink">Welcome.</strong> Somebody joining the
            server gets one message in the welcome channel: what the place is
            for, a pointer at the rules, and one thing to do. Nobody is told
            when a member arrives or leaves, and there is no direct message,
            because a greeting that arrives in private from a bot is the kind of
            thing people mute the server over.
          </p>
          <p>
            <strong className="text-ink">Rules.</strong> One message, edited in
            place whenever they change. A rules channel holding three versions is
            worse than one holding none, because the reader has to work out which
            is current and will pick wrong.
          </p>
          <p>
            <strong className="text-ink">Direct messages.</strong> Only two, and
            each follows something the member did: a reminder half an hour before
            a thing they joined, and the question about how it went afterwards.
            Nothing fires because somebody has been quiet or because there is
            something new to look at.
          </p>
          <p>
            <strong className="text-ink">Voice presence.</strong> A linked member
            joining a voice channel is marked as around for two hours, and leaving
            clears it. It shows as a count on Bunchy Now and never a name, the
            channel is not recorded, there is no history, and anybody hidden from
            that board is hidden from this too. Unlinked accounts are ignored
            entirely.
          </p>
        </div>
      </Panel>

      <Panel title="When it stops working" className="mt-6">
        <div className="space-y-3 p-5 text-sm text-ink-soft">
          <p>
            <strong className="text-ink">The container exits straight away.</strong>{" "}
            That is correct with no token. It uses{" "}
            <Code>restart: on-failure</Code> rather than{" "}
            <Code>unless-stopped</Code>, so a clean exit is left alone instead of
            looping.
          </p>
          <p>
            <strong className="text-ink">Commands do not appear.</strong> They are
            registered per server on connect, which is immediate, but only once
            the bot has actually connected. Check the first line above.
          </p>
          <p>
            <strong className="text-ink">
              Somebody says a command does nothing.
            </strong>{" "}
            Almost always an unlinked account. Everything except{" "}
            <Code>/link</Code> needs one.
          </p>
          <p>
            <strong className="text-ink">
              The channel pickers are empty and greyed out.
            </strong>{" "}
            They are filled from a live call to Discord made by the web process,
            not by the bot, so the two can disagree. The line at the top of this
            page says which one failed and why.
          </p>
          <p>
            <strong className="text-ink">Logs.</strong>{" "}
            <Code>docker compose logs bot</Code> on the server. Every line is
            prefixed <Code>[bot]</Code>.
          </p>
        </div>
      </Panel>
    </>
  );
}
