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
}

export function DiscordControls({
  settings,
  channels,
}: {
  settings: Settings;
  channels: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save(patch: Partial<Settings>, key: string) {
    setPending(key);
    setError(null);
    setSaved(false);
    try {
      await api("/api/admin/discord", { method: "PATCH", json: patch });
      setSaved(true);
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
          disabled={pending !== null || channels.length === 0}
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
          {channels.length === 0
            ? "The list fills in once the bot is in the server."
            : "Takes effect within five minutes. No deploy needed."}
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

      {saved && (
        <p className="text-sm text-positive" role="status">
          Saved. The bot picks it up on its next pass.
        </p>
      )}

      {pending && <Button size="sm" loading disabled>Saving</Button>}
    </div>
  );
}
