"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { Button, ErrorNotice, Select, Textarea } from "@/components/ui";

/**
 * Report and block.
 *
 * Kept plain and always reachable. Someone using these is usually having a bad
 * time already; the interaction should be short, honest about what happens next,
 * and never ask them to justify themselves.
 */

const REASONS = [
  { value: "HARASSMENT", label: "Harassment or bullying" },
  { value: "SPAM", label: "Spam or advertising" },
  { value: "HATE_SPEECH", label: "Hate speech" },
  { value: "SEXUAL_CONTENT", label: "Unwanted sexual content" },
  { value: "SCAM_OR_FRAUD", label: "Scam or fraud" },
  { value: "IMPERSONATION", label: "Impersonation" },
  { value: "SELF_HARM", label: "Someone may be at risk" },
  { value: "OTHER", label: "Something else" },
] as const;

export function ReportButton({
  targetType,
  targetId,
  label = "Report",
}: {
  targetType: "PROFILE" | "BUNCH_MESSAGE" | "DIRECT_MESSAGE" | "BUNCH" | "ACTIVITY";
  targetId: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(REASONS[0].value);
  const [details, setDetails] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setPending(true);
    setError(null);
    try {
      await api("/api/moderation", {
        method: "POST",
        json: { action: "report", targetType, targetId, reason, details: details || undefined },
      });
      setDone(true);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <p className="text-sm text-positive">
        Thanks. A moderator will look at this. We&rsquo;ll act on what we find,
        not on how many reports something gets.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-muted transition-colors hover:text-danger"
      >
        {label}
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-[var(--radius-control)] border border-line bg-surface-sunken p-4">
      {error && <ErrorNotice message={error} />}

      <div>
        <label htmlFor="report-reason" className="block text-sm font-medium">
          What&rsquo;s wrong?
        </label>
        <Select
          id="report-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mt-1.5"
        >
          {REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label htmlFor="report-details" className="block text-sm font-medium">
          Anything else? <span className="font-normal text-muted">Optional</span>
        </label>
        <Textarea
          id="report-details"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          maxLength={2000}
          className="mt-1.5"
          placeholder="Only if it helps explain what happened."
        />
      </div>

      <div className="flex gap-2">
        <Button size="sm" loading={pending} onClick={submit}>
          Send report
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function BlockButton({
  profileId,
  displayName,
  isBlocked,
}: {
  profileId: string;
  displayName: string;
  isBlocked: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "block" | "unblock") {
    setPending(true);
    setError(null);
    try {
      await api("/api/moderation", { method: "POST", json: { action, profileId } });
      setConfirming(false);
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  if (isBlocked) {
    return (
      <div className="space-y-2">
        {error && <ErrorNotice message={error} />}
        <Button size="sm" variant="secondary" loading={pending} onClick={() => act("unblock")}>
          Unblock {displayName}
        </Button>
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="space-y-2">
        {error && <ErrorNotice message={error} />}
        <p className="text-sm text-ink-soft">
          Block {displayName}? You won&rsquo;t see each other anywhere on Bunchy,
          and any connection between you is removed.
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="danger" loading={pending} onClick={() => act("block")}>
            Block
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="text-sm text-muted transition-colors hover:text-danger"
    >
      Block
    </button>
  );
}
