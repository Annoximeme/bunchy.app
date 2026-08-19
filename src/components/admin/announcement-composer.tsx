"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/api";

/**
 * Writing an announcement.
 *
 * The body is a textarea rather than a rich editor, and it stays one. The
 * blocks it produces are rendered to React elements, so there is no path from
 * this box to markup on a member's page however the text is written, and that
 * property is worth more here than formatting buttons: these are the messages
 * that arrive with the operator's authority behind them.
 *
 * What it does understand is four line prefixes, parsed on the server into the
 * same closed union as before. Until now the parser only made paragraphs, so a
 * notice listing three things that changed had to be written as prose.
 *
 * ## Three buttons, not one
 *
 * Save, schedule and publish are separate gestures because they have different
 * consequences and there is no undo on the third. A notice reaches every member
 * and, for the Important tier, their inbox. The composer had one button, which
 * meant the only way to work on a notice was to publish a draft of it.
 */

export interface ComposerInitial {
  slug: string;
  title: string;
  summary: string;
  bodyText: string;
  tier: string;
  linkHref: string | null;
  linkLabel: string | null;
  effectiveAt: Date | null;
  publicVisible: boolean;
  state: "draft" | "scheduled" | "published";
}

/** `datetime-local` and `date` want local wall-clock strings, not ISO. */
function toDateValue(date: Date | null): string {
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const EMPTY: ComposerInitial = {
  slug: "",
  title: "",
  summary: "",
  bodyText: "",
  tier: "NOTABLE",
  linkHref: null,
  linkLabel: null,
  effectiveAt: null,
  publicVisible: true,
  state: "draft",
};

export function AnnouncementComposer({
  initial,
}: {
  /** An existing announcement to correct, or nothing for a new one. */
  initial?: ComposerInitial;
}) {
  const start = initial ?? EMPTY;
  const router = useRouter();

  const [slug, setSlug] = useState(start.slug);
  const [title, setTitle] = useState(start.title);
  const [summary, setSummary] = useState(start.summary);
  const [bodyText, setBodyText] = useState(start.bodyText);
  const [tier, setTier] = useState(start.tier);
  const [linkHref, setLinkHref] = useState(start.linkHref ?? "");
  const [linkLabel, setLinkLabel] = useState(start.linkLabel ?? "");
  const [effectiveAt, setEffectiveAt] = useState(toDateValue(start.effectiveAt));
  const [publishAt, setPublishAt] = useState("");
  const [publicVisible, setPublicVisible] = useState(start.publicVisible);
  const [reason, setReason] = useState("");

  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const editing = initial !== undefined;

  async function submit(action: "publish" | "draft", schedule: boolean) {
    setPending(action + String(schedule));
    setError(null);
    setStatus(null);

    try {
      const result = await api<{ slug: string }>("/api/admin/announcements", {
        method: "POST",
        json: {
          slug: slug.trim(),
          title: title.trim(),
          summary: summary.trim(),
          bodyText,
          tier,
          linkHref: linkHref.trim() || null,
          linkLabel: linkLabel.trim() || null,
          effectiveAt: effectiveAt.trim() || null,
          action,
          publishAt: schedule ? publishAt.trim() || null : null,
          publicVisible,
          reason: reason.trim() || undefined,
        },
      });

      setStatus(
        action === "draft"
          ? `Saved as ${result.slug}. Nobody has been told.`
          : schedule
            ? `Scheduled as ${result.slug}.`
            : `Published as ${result.slug}.`,
      );
      // The list below this form, the state chips and the email counts are all
      // rendered on the server, so a refresh is what makes them agree with what
      // just happened.
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(null);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit("publish", false);
      }}
      className="space-y-4"
    >
      {editing && (
        <p className="rounded-[var(--radius-control)] bg-surface-sunken px-3.5 py-2.5 text-sm text-ink-soft">
          Editing <strong>{start.slug}</strong>, currently {start.state}.{" "}
          {start.state === "published"
            ? "Saving again republishes it and moves its date to now, so members who had read it see it as unread. Correct a typo freely; a change of meaning deserves a new announcement."
            : "Nobody has been told about this yet."}{" "}
          <a href="/admin/announcements" className="underline underline-offset-2">
            Start a new one instead
          </a>
          .
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" value={title} onChange={setTitle} required />
        <Field
          label="Slug"
          value={slug}
          onChange={setSlug}
          required
          hint="Used in the URL. Reusing one edits that announcement."
        />
      </div>

      <Field
        label="Summary"
        value={summary}
        onChange={setSummary}
        required
        hint="One or two sentences. What changed, in plain words. This is what the email leads with."
      />

      <label className="block">
        <span className="text-sm font-medium text-ink">Body</span>
        <textarea
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
          rows={10}
          className="mt-1.5 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2 font-mono text-sm"
          placeholder={"Blank line between paragraphs.\n\n## A heading\n> A quote, for the wording being changed\n- A list item"}
        />
        <span className="mt-1 block text-xs text-muted">
          <code>## </code> heading, <code>&gt; </code> quote, <code>- </code>{" "}
          list item, blank line between paragraphs. Not markdown: nothing else is
          interpreted, and none of it ever becomes HTML.
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="text-sm font-medium text-ink">Tier</span>
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            className="mt-1.5 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2 text-sm"
          >
            <option value="NOTED">Noted: archive only</option>
            <option value="NOTABLE">New: findable, no push</option>
            <option value="CRITICAL">Important: banner and email</option>
          </select>
        </label>
        <Field label="Link" value={linkHref} onChange={setLinkHref} hint="e.g. /privacy" />
        <Field label="Link label" value={linkLabel} onChange={setLinkLabel} />
      </div>

      {tier === "CRITICAL" && (
        <div className="rounded-[var(--radius-control)] border border-accent/30 bg-accent-soft/40 p-4">
          <p className="text-sm font-semibold text-ink">
            This is the only tier that reaches people who are not here.
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            A banner on every page until dismissed, and one email to every member
            with a verified address. Reserved for rights, data and availability.
            The email goes out on the next hourly pass and cannot be recalled.
          </p>
          <div className="mt-3">
            <Field
              label="Why this interrupts everybody"
              value={reason}
              onChange={setReason}
              required
              hint="Goes in the audit trail next to your name."
            />
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-ink">Takes effect</span>
          <input
            type="date"
            value={effectiveAt}
            onChange={(e) => setEffectiveAt(e.target.value)}
            className="mt-1.5 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2 text-sm"
          />
          <span className="mt-1 block text-xs text-muted">
            Must be after it publishes. Members are told before a change lands,
            not after. Within three days of this date, anybody who has not read
            it gets one reminder.
          </span>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-ink">Publish at</span>
          <input
            type="datetime-local"
            value={publishAt}
            onChange={(e) => setPublishAt(e.target.value)}
            className="mt-1.5 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2 text-sm"
          />
          <span className="mt-1 block text-xs text-muted">
            Only used by Schedule. Leave it empty to publish now.
          </span>
        </label>
      </div>

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={publicVisible}
          onChange={(e) => setPublicVisible(e.target.checked)}
          className="mt-1 size-4"
        />
        <span className="text-sm">
          <span className="font-medium text-ink">Show on the public changelog</span>
          <span className="mt-0.5 block text-xs text-muted">
            On by default. A policy change is what somebody deciding whether to
            join needs to be able to read first. Turn it off for something that
            only means anything to people already here.
          </span>
        </span>
      </label>

      {error && <p className="text-sm text-danger">{error}</p>}
      {status && <p className="text-sm text-positive">{status}</p>}

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <button
          type="submit"
          disabled={pending !== null}
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-[var(--color-on-accent)] disabled:opacity-60"
        >
          {pending === "publishfalse" ? "Publishing…" : "Publish now"}
        </button>

        <button
          type="button"
          onClick={() => void submit("publish", true)}
          disabled={pending !== null || publishAt.trim() === ""}
          className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ink-soft disabled:opacity-50"
          title={
            publishAt.trim() === "" ? "Set a publish date first." : undefined
          }
        >
          {pending === "publishtrue" ? "Scheduling…" : "Schedule"}
        </button>

        <button
          type="button"
          onClick={() => void submit("draft", false)}
          disabled={pending !== null}
          className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:border-ink-soft disabled:opacity-50"
        >
          {pending === "draftfalse" ? "Saving…" : "Save draft"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  hint,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="mt-1.5 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2 text-sm"
      />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}
