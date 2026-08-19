"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/api";

/**
 * Taking an announcement back off the board.
 *
 * `withdrawAnnouncement` has existed since the module was written and nothing
 * ever called it, so the only way to unpublish something was to edit the row by
 * hand. That is the wrong tool for the one action most likely to be needed in a
 * hurry: the reason to withdraw is usually that the notice was wrong, and
 * "wrong notice about your rights, currently on a banner in front of every
 * member" is not a situation to be solving with SQL.
 *
 * It asks for a reason before it acts, in a second step rather than a
 * `confirm()`. The reason goes to the audit trail, and typing one is also the
 * pause: an accidental click lands on a text box rather than on an unpublish.
 */
export function AnnouncementWithdraw({ slug }: { slug: string }) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function withdraw() {
    setPending(true);
    setError(null);
    try {
      await api("/api/admin/announcements", {
        method: "DELETE",
        json: { slug, reason: reason.trim() || undefined },
      });
      setAsking(false);
      setReason("");
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        className="text-sm font-medium text-muted underline underline-offset-2 transition-colors hover:text-danger"
      >
        Withdraw
      </button>
    );
  }

  return (
    <div className="mt-3 w-full rounded-[var(--radius-control)] border border-line bg-surface-sunken p-3">
      <label className="block">
        <span className="text-sm font-medium text-ink">
          Why is this coming down?
        </span>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          autoFocus
          className="mt-1.5 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2 text-sm"
          placeholder="For the audit trail."
        />
      </label>
      <p className="mt-2 text-xs text-muted">
        It stops appearing on What&rsquo;s new and the changelog. The row and
        every audit entry stay, and so does the record of who was emailed.
      </p>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      <div className="mt-3 flex gap-3">
        <button
          type="button"
          onClick={() => void withdraw()}
          disabled={pending}
          className="rounded-full bg-danger px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
        >
          {pending ? "Withdrawing…" : "Withdraw it"}
        </button>
        <button
          type="button"
          onClick={() => setAsking(false)}
          className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink-soft"
        >
          Keep it up
        </button>
      </div>
    </div>
  );
}
