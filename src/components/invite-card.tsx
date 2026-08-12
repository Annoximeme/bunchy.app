"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { Button, Card, ErrorNotice } from "@/components/ui";

/**
 * Inviting someone you actually know.
 *
 * Note what is absent: no reward for inviting three people, no leaderboard, no
 * "import your contacts", no reminder emails to people who didn't sign up. The
 * moment a referral pays out, the incentive is to send the link to strangers —
 * and a product about finding people you belong with is the last place that
 * should reward volume.
 *
 * The count is shown; the names are not. Who joined through your link is
 * information about *them*.
 */
export function InviteCard({ appUrl }: { appUrl: string }) {
  const [link, setLink] = useState<string | null>(null);
  const [joined, setJoined] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reveal() {
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ code: string; joined: number }>(
        "/api/account/invite",
        { method: "POST" },
      );
      setLink(`${appUrl}/signup?ref=${result.code}`);
      setJoined(result.joined);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused; the link is on screen and selectable.
      setError("Couldn't copy automatically — select the link and copy it.");
    }
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold tracking-tight">Invite someone</h2>
      <p className="mt-1 text-sm text-muted">
        Bunchy works better when someone you already like is on it. There&rsquo;s
        nothing to win by inviting more people — this is just a link.
      </p>

      {error && (
        <div className="mt-4">
          <ErrorNotice message={error} />
        </div>
      )}

      {link === null ? (
        <div className="mt-4">
          <Button size="sm" loading={busy} onClick={reveal}>
            Get my invite link
          </Button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 overflow-x-auto rounded-[var(--radius-control)] border border-line bg-surface-sunken px-3 py-2 text-sm">
              {link}
            </code>
            <Button size="sm" variant="secondary" onClick={copy}>
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <p className="text-sm text-muted">
            {joined === 0
              ? "Nobody has joined through it yet."
              : joined === 1
                ? "One person has joined through it."
                : `${joined} people have joined through it.`}
          </p>
        </div>
      )}
    </Card>
  );
}
