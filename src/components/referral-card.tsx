"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { Button, Card, ErrorNotice } from "@/components/ui";

/**
 * Invite someone you actually know.
 *
 * What is deliberately absent: no reward for inviting three people, no
 * leaderboard, no "import your contacts", no reminder emails, and no list of
 * who joined. A member sees a count, because the moment a referral pays out the
 * incentive is to send the link to strangers, and a product about finding
 * people you belong with is the last place that should reward volume.
 */
export function ReferralCard() {
  const [state, setState] = useState<{ code: string; joined: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      setState(await api<{ code: string; joined: number }>("/api/account/referral"));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  const link = state ? `${window.location.origin}/signup?ref=${state.code}` : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy, select the link and copy it manually.");
    }
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold tracking-tight">Invite someone</h2>
      <p className="mt-1 text-sm text-muted">
        Bunchy works better when the people you already like are on it. There is
        nothing to win by inviting more of them.
      </p>

      {error && (
        <div className="mt-4">
          <ErrorNotice message={error} />
        </div>
      )}

      {state === null ? (
        <div className="mt-4">
          <Button size="sm" variant="secondary" loading={busy} onClick={load}>
            Get my invite link
          </Button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-[var(--radius-control)] border border-line bg-surface-sunken px-3 py-2 font-mono text-sm">
              {link}
            </code>
            <Button size="sm" onClick={copy}>
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <p className="text-sm text-muted">
            {state.joined === 0
              ? "Nobody has joined through your link yet."
              : `${state.joined} ${state.joined === 1 ? "person has" : "people have"} joined through your link.`}
          </p>
        </div>
      )}
    </Card>
  );
}
