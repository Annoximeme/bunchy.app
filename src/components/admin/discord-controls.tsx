"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/api";
import { Button, Select } from "@/components/ui";

/**
 * The controls, rather than instructions for editing a file on a server.
 *
 * Choosing where to announce and switching announcements off are wanted at the
 * moment the channel is wrong or the noise is unwelcome, which is exactly when
 * SSHing in to edit `.env` and redeploying is the least likely thing anybody
 * does. So these live in the database and the bot re-reads them every pass,
 * which means a change here takes effect within five minutes.
 */

export interface Settings {
  announceChannelId: string | null;
  announceChannelName: string | null;
  announcementsEnabled: boolean;
  announceSeries: boolean;
  welcomeChannelId: string | null;
  welcomeChannelName: string | null;
  rulesChannelId: string | null;
  rulesChannelName: string | null;
  rulesMessageId: string | null;
}

export function DiscordControls({
  settings,
  channels,
  channelError,
}: {
  settings: Settings;
  channels: Array<{ id: string; name: string }>;
  /** Why the list is empty, when the reason is known and is not "no channels". */
  channelError?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const noChannels = channels.length === 0;

  /*
    One sentence for each reason the list can be empty, because they need
    different things done about them and the old copy asserted the first one
    whatever the cause. It said the bot was not in the server while the bot was
    in the server, which sends you off to re-invite a bot that is already there.
  */
  const emptyReason = channelError
    ? channelError
    : "The bot is not in the server yet, or it cannot see any text channel there.";

  async function save(patch: Partial<Settings>, key: string) {
    setPending(key);
    setError(null);
    setSaved(null);
    try {
      await api("/api/admin/discord", { method: "PATCH", json: patch });
      setSaved("Saved. The bot picks it up on its next pass.");
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(null);
    }
  }

  async function publish() {
    setPending("publish");
    setError(null);
    setSaved(null);
    try {
      const result = await api<{ message: string }>("/api/admin/discord", {
        method: "POST",
      });
      setSaved(result.message);
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-5 p-5">
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <label className="block max-w-md">
        <span className="text-sm font-medium text-ink">Announce open calls in</span>
        <Select
          className="mt-1.5"
          value={settings.announceChannelId ?? ""}
          disabled={pending !== null || noChannels}
          onChange={(event) => {
            const id = event.target.value || null;
            save(
              {
                announceChannelId: id,
                announceChannelName:
                  channels.find((c) => c.id === id)?.name ?? null,
              },
              "channel",
            );
          }}
        >
          <option value="">Nowhere. Commands still work.</option>
          {channels.map((channel) => (
            <option key={channel.id} value={channel.id}>
              #{channel.name}
            </option>
          ))}
        </Select>
        <span className="mt-1 block text-xs text-muted">
          {noChannels ? emptyReason : "Takes effect within five minutes. No deploy needed."}
        </span>
      </label>

      <label className="flex max-w-md items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 size-4"
          checked={settings.announcementsEnabled}
          disabled={pending !== null}
          onChange={(e) => save({ announcementsEnabled: e.target.checked }, "on")}
        />
        <span className="text-sm">
          <span className="font-medium text-ink">Announcements on</span>
          <span className="mt-0.5 block text-xs text-muted">
            Switching this off keeps the channel, so turning it back on does not
            mean choosing again.
          </span>
        </span>
      </label>

      <label className="flex max-w-md items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 size-4"
          checked={settings.announceSeries}
          disabled={pending !== null}
          onChange={(e) => save({ announceSeries: e.target.checked }, "series")}
        />
        <span className="text-sm">
          <span className="font-medium text-ink">
            Announce standing arrangements too
          </span>
          <span className="mt-0.5 block text-xs text-muted">
            An occurrence of a weekly thing gets one message on the day, rather
            than only one-off calls being posted.
          </span>
        </span>
      </label>

      {/*
        Welcome and rules. Both are "which channel", so they use the same
        control as announcements rather than inventing a second way to pick one.
      */}
      <label className="block max-w-md">
        <span className="text-sm font-medium text-ink">Greet new members in</span>
        <Select
          className="mt-1.5"
          value={settings.welcomeChannelId ?? ""}
          disabled={pending !== null || noChannels}
          onChange={(event) => {
            const id = event.target.value || null;
            save(
              {
                welcomeChannelId: id,
                welcomeChannelName: channels.find((c) => c.id === id)?.name ?? null,
              },
              "welcome",
            );
          }}
        >
          <option value="">Nowhere. Nobody is greeted.</option>
          {channels.map((channel) => (
            <option key={channel.id} value={channel.id}>
              #{channel.name}
            </option>
          ))}
        </Select>
        <span className="mt-1 block text-xs text-muted">
          {noChannels
            ? emptyReason
            : "Needs the Server Members intent switched on in the developer portal. Without it Discord never tells the bot somebody arrived."}
        </span>
      </label>

      <label className="block max-w-md">
        <span className="text-sm font-medium text-ink">Rules live in</span>
        <Select
          className="mt-1.5"
          value={settings.rulesChannelId ?? ""}
          disabled={pending !== null || noChannels}
          onChange={(event) => {
            const id = event.target.value || null;
            save(
              {
                rulesChannelId: id,
                rulesChannelName: channels.find((c) => c.id === id)?.name ?? null,
                // A new channel means the remembered message is in the old one,
                // so forget it and let the next publish post a fresh one.
                rulesMessageId: null,
              },
              "rules",
            );
          }}
        >
          <option value="">Not set</option>
          {channels.map((channel) => (
            <option key={channel.id} value={channel.id}>
              #{channel.name}
            </option>
          ))}
        </Select>
        <span className="mt-1 block text-xs text-muted">
          {noChannels
            ? emptyReason
            : settings.rulesMessageId
              ? "Already posted. Publishing again edits that same message rather than adding a second copy, so the channel never holds two versions."
              : "Nothing posted yet. Publishing writes one message and remembers it."}
        </span>
      </label>

      {/*
        The button, rather than an instruction to go and type /rules in Discord.
        This is the page where the channel gets chosen, and sending somebody
        elsewhere to use the thing they just set up leaves the job half done.
      */}
      <div className="max-w-md">
        <Button
          size="sm"
          variant="secondary"
          disabled={pending !== null || !settings.rulesChannelId}
          loading={pending === "publish"}
          onClick={publish}
        >
          {settings.rulesMessageId ? "Update the rules post" : "Post the rules"}
        </Button>
        {!settings.rulesChannelId && (
          <p className="mt-1 text-xs text-muted">Choose a channel first.</p>
        )}
      </div>

      {saved && (
        <p className="text-sm text-positive" role="status">
          {saved}
        </p>
      )}
    </div>
  );
}
