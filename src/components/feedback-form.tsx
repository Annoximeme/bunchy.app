"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button, Field, Select, Textarea } from "@/components/ui";
import { FormError, useFormSubmit } from "@/components/form-state";
import { KINDS, KIND_LABEL } from "@/lib/feedback";
import type { FeedbackKind } from "@/generated/prisma/enums";
import { useAppPath } from "@/components/link";

/**
 * The form.
 *
 * Two fields and one button. Every extra field on a feedback form is a reason
 * not to bother, and the things a tracker wants (severity, area, reproduction
 * steps) are things the person answering can ask for if it turns out to matter.
 *
 * The page somebody came from is attached, and it is *shown* rather than
 * collected quietly. It is genuinely useful for "this is broken" and it would
 * be a small betrayal to gather it invisibly on a page whose whole argument is
 * that the product does not do that.
 */
export function FeedbackForm() {
  const router = useRouter();
  const pathname = useAppPath();

  const [kind, setKind] = useState<FeedbackKind>("IDEA");
  const [message, setMessage] = useState("");
  const [includePath, setIncludePath] = useState(true);
  const [sent, setSent] = useState(false);

  // Where they were before opening this page, when the browser will say. On a
  // cold load it is this page, which is useless but harmless.
  const cameFrom =
    typeof document !== "undefined" && document.referrer.startsWith(window.location.origin)
      ? new URL(document.referrer).pathname
      : pathname;

  const form = useFormSubmit(async () => {
    await api("/api/feedback", {
      method: "POST",
      json: { kind, message, pagePath: includePath ? cameFrom : null },
    });
    setMessage("");
    setSent(true);
    router.refresh();
  });

  return (
    <form onSubmit={form.onSubmit} className="space-y-4">
      <FormError state={form} />

      <Field label="What kind of thing is it?" htmlFor="feedback-kind" error={form.fields.kind}>
        <Select
          id="feedback-kind"
          value={kind}
          disabled={form.pending}
          onChange={(e) => setKind(e.target.value as FeedbackKind)}
        >
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="What happened, or what should be different?"
        htmlFor="feedback-message"
        error={form.fields.message}
        hint="Plain words are fine. If something broke, what you were trying to do is more useful than what the screen said."
      >
        <Textarea
          id="feedback-message"
          rows={6}
          required
          value={message}
          disabled={form.pending}
          onChange={(e) => {
            setMessage(e.target.value);
            setSent(false);
          }}
          placeholder="I tried to..."
        />
      </Field>

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 size-4"
          checked={includePath}
          disabled={form.pending}
          onChange={(e) => setIncludePath(e.target.checked)}
        />
        <span className="text-sm">
          <span className="font-medium text-ink">
            Include the page you came from
          </span>
          <span className="mt-0.5 block text-xs text-muted">
            <code className="font-mono">{cameFrom}</code>. Nothing else is
            attached: no browser details, no session, no query string.
          </span>
        </span>
      </label>

      <div className="flex items-center gap-3">
        <Button type="submit" loading={form.pending} disabled={message.trim().length < 10}>
          Send it
        </Button>
        {sent && (
          <p role="status" className="text-sm text-positive">
            Sent. It will show below, and you will hear back.
          </p>
        )}
      </div>
    </form>
  );
}
