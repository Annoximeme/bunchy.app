"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";

/**
 * Writing an announcement.
 *
 * The body is a textarea split on blank lines into paragraphs rather than a
 * rich editor, and that is the right trade for now: the blocks are rendered to
 * React elements, so there is no path from this box to markup on a member's
 * page however the text is written.
 *
 * The reason field appears when the tier is Important, because that is the tier
 * that interrupts everybody and the server refuses it without one. Better to
 * ask for the sentence here than to bounce the form.
 */
export function AnnouncementComposer() {
  const [tier, setTier] = useState("NOTABLE");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    setStatus(null);

    try {
      const result = await api<{ slug: string }>("/api/admin/announcements", {
        method: "POST",
        json: {
          slug: String(form.get("slug") ?? "").trim(),
          title: String(form.get("title") ?? "").trim(),
          summary: String(form.get("summary") ?? "").trim(),
          bodyText: String(form.get("bodyText") ?? ""),
          tier,
          linkHref: String(form.get("linkHref") ?? "").trim() || null,
          linkLabel: String(form.get("linkLabel") ?? "").trim() || null,
          effectiveAt: String(form.get("effectiveAt") ?? "").trim() || null,
          reason: String(form.get("reason") ?? "").trim() || undefined,
        },
      });
      setStatus(`Published as ${result.slug}.`);
      event.currentTarget.reset();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" name="title" required />
        <Field label="Slug" name="slug" required hint="Used in the URL." />
      </div>

      <Field
        label="Summary"
        name="summary"
        required
        hint="One or two sentences. What changed, in plain words."
      />

      <label className="block">
        <span className="text-sm font-medium text-ink">Body</span>
        <textarea
          name="bodyText"
          rows={6}
          className="mt-1.5 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2 text-sm"
          placeholder="Blank line between paragraphs."
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="text-sm font-medium text-ink">Tier</span>
          <select
            name="tier"
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            className="mt-1.5 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2 text-sm"
          >
            <option value="NOTED">Noted — archive only</option>
            <option value="NOTABLE">New — findable, no push</option>
            <option value="CRITICAL">Important — interrupts everybody</option>
          </select>
        </label>
        <Field label="Link" name="linkHref" hint="e.g. /privacy" />
        <Field label="Link label" name="linkLabel" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-ink">Takes effect</span>
          <input
            type="date"
            name="effectiveAt"
            className="mt-1.5 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2 text-sm"
          />
          <span className="mt-1 block text-xs text-muted">
            Must be in the future. Members are told before a change lands, not
            after.
          </span>
        </label>

        {tier === "CRITICAL" && (
          <Field
            label="Why this interrupts everybody"
            name="reason"
            required
            hint="Goes in the audit trail next to your name."
          />
        )}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {status && <p className="text-sm text-positive">{status}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-[var(--color-on-accent)] disabled:opacity-60"
      >
        {pending ? "Publishing…" : "Publish"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  required,
  hint,
}: {
  label: string;
  name: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      <input
        type="text"
        name={name}
        required={required}
        className="mt-1.5 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2 text-sm"
      />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}
