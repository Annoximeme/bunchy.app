"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/api";
import { brand } from "@/lib/brand";
import { Button, Card } from "@/components/ui";

/**
 * Connecting a Discord account, from the member's side.
 *
 * The code is shown here and typed at the bot, rather than the other way
 * round. The session already proves who this is, so the code only carries that
 * proof outward; a code issued in Discord and pasted here would be proving
 * Discord identity to Bunchy, which is a different and harder problem.
 *
 * The code is shown once and not stored anywhere this component can reach it
 * again. Somebody who loses it asks for another, which invalidates the first.
 * That is cheaper than any way of showing it twice.
 */

export function DiscordLinkPanel({
  linked,
}: {
  linked: { username: string | null; linkedAt: Date } | null;
}) {
  const router = useRouter();
  const [code, setCode] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function issue() {
    setPending(true);
    setError(null);
    try {
      const result = await api<{ code: string }>("/api/account/discord", {
        method: "POST",
      });
      setCode(result.code);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  async function unlink() {
    setPending(true);
    setError(null);
    try {
      await api("/api/account/discord", { method: "DELETE" });
      setCode(null);
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  if (linked) {
    return (
      <Card>
        <h2 className="text-lg font-semibold tracking-tight">Discord</h2>
        <p className="mt-1.5 text-sm text-ink-soft">
          Connected{linked.username ? ` as ${linked.username}` : ""}. You can use{" "}
          <code className="rounded bg-surface-sunken px-1.5 py-0.5 text-[13px]">
            /tonight
          </code>
          ,{" "}
          <code className="rounded bg-surface-sunken px-1.5 py-0.5 text-[13px]">
            /up-for
          </code>{" "}
          and{" "}
          <code className="rounded bg-surface-sunken px-1.5 py-0.5 text-[13px]">
            /call
          </code>{" "}
          in the server, and being in a voice channel counts you on Bunchy Now.
        </p>
        {/*
          Said plainly rather than buried in the privacy policy. Somebody
          connecting an account should be told what it starts doing, in the
          place where they connect it.
        */}
        <p className="mt-3 text-sm text-muted">
          While connected, joining a voice channel marks you as around for a
          couple of hours. It is a count on Bunchy Now and never your name, the
          channel is not recorded, and hiding yourself from that board hides
          this too.
        </p>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        <div className="mt-5">
          <Button variant="secondary" size="sm" loading={pending} onClick={unlink}>
            Disconnect
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold tracking-tight">Discord</h2>
      <p className="mt-1.5 text-sm text-ink-soft">
        Connect your account to use {brand.name} from the{" "}
        <a
          href={brand.discordUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent-ink underline underline-offset-2"
        >
          Discord server
        </a>
        . Optional, and nothing changes here if you never do.
      </p>

      {code ? (
        <div className="mt-5 rounded-[var(--radius-control)] bg-surface-sunken p-5 text-center">
          <p className="text-sm text-muted">Type this at the bot within five minutes</p>
          <p className="mt-2 font-mono text-3xl font-bold tracking-[0.3em] tabular-nums">
            {code}
          </p>
          <p className="mt-3 text-sm text-ink-soft">
            <code className="rounded bg-surface px-1.5 py-0.5">/link {code}</code>
          </p>
          <p className="mt-3 text-xs text-muted">
            Shown once. Ask for another if you lose it, which cancels this one.
          </p>
        </div>
      ) : null}

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-5">
        <Button size="sm" loading={pending} onClick={issue}>
          {code ? "Get a new code" : "Get a code"}
        </Button>
      </div>
    </Card>
  );
}
