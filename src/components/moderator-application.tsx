"use client";


import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button, Field, Textarea } from "@/components/ui";
import { FormError, useFormSubmit } from "@/components/form-state";

/**
 * The application form.
 *
 * Three questions and a checkbox. A longer form would filter for people willing
 * to fill in a longer form, which is not the trait being selected for.
 *
 * The checkbox is the one field that genuinely matters: it is the moment
 * somebody agrees to see reported harassment and private messages, and the
 * server refuses the application without it.
 */
export function ModeratorApplicationForm() {
  const router = useRouter();
  const form = useFormSubmit(async (event) => {
    const data = new FormData(event.currentTarget);
    await api("/api/moderators/apply", {
      method: "POST",
      json: {
        hoursPerWeek: Number(data.get("hoursPerWeek")),
        motivation: String(data.get("motivation") ?? ""),
        experience: String(data.get("experience") ?? "") || undefined,
        acknowledgedExposure: data.get("acknowledged") === "on",
      },
    });
    router.refresh();
  });

  return (
    <form onSubmit={form.onSubmit} className="mt-6 space-y-5 not-prose">
      <FormError state={form} />

      <Field
        label="Roughly how many hours a week can you give?"
        htmlFor="hoursPerWeek"
        error={form.fields.hoursPerWeek}
        hint="An honest small number is better than an optimistic large one. Nobody is held to it."
      >
        <select
          id="hoursPerWeek"
          name="hoursPerWeek"
          defaultValue="2"
          className="w-full rounded-[var(--radius-control)] border border-line bg-surface px-3.5 py-2.5 text-sm text-ink focus:border-ink-soft focus:outline-none"
        >
          {[1, 2, 3, 5, 8, 10].map((h) => (
            <option key={h} value={h}>
              {h} {h === 1 ? "hour" : "hours"} a week
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Why do you want to do this?"
        htmlFor="motivation"
        error={form.fields.motivation}
        hint="A couple of sentences is plenty."
      >
        <Textarea id="motivation" name="motivation" required rows={4} maxLength={2000} />
      </Field>

      <Field
        label="Have you moderated anything before?"
        htmlFor="experience"
        error={form.fields.experience}
        hint="Optional. A Discord server counts. So does “no”."
      >
        <Textarea id="experience" name="experience" rows={3} maxLength={2000} />
      </Field>

      <label className="flex items-start gap-3 rounded-[var(--radius-control)] border border-line p-4 text-sm">
        <input
          type="checkbox"
          name="acknowledged"
          required
          className="mt-0.5 size-4 accent-[var(--color-accent)]"
        />
        <span className="text-ink-soft">
          I understand the queue contains reported harassment, scam attempts and
          private messages, and that I can stop at any time by writing one line
          to support.
        </span>
      </label>

      <Button type="submit" loading={form.pending}>
        Send application
      </Button>
    </form>
  );
}
