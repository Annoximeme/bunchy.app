"use client";

import { useState, useTransition } from "react";
import { Link } from "@/components/link";
import { X } from "lucide-react";
import { api } from "@/lib/api";

/**
 * The one thing on this product that interrupts you.
 *
 * It appears for CRITICAL announcements only, a change to your rights, your
 * data, or whether the site is up, and it exists because Privacy §14 and Terms
 * §14 promise members are told in the product *before* a change takes effect.
 * A page nobody visits cannot keep that promise; this can.
 *
 * Dismissing it is the same act as reading it, which is why the close button
 * writes a read row rather than hiding it locally. Somebody who clears this on
 * their phone should not meet it again on their laptop, and the record of who
 * has seen what is the thing that makes "we told you" checkable.
 *
 * One at a time, oldest first, chosen on the server. A stack of banners is a
 * wall, and a wall gets dismissed unread.
 */
export function AnnouncementBanner({
  slug,
  title,
  summary,
  linkHref,
  linkLabel,
  effectiveAt,
}: {
  slug: string;
  title: string;
  summary: string;
  linkHref: string | null;
  linkLabel: string | null;
  /** ISO string, formatted on the client so it reads in the member's locale. */
  effectiveAt: string | null;
}) {
  const [gone, setGone] = useState(false);
  const [, start] = useTransition();

  if (gone) return null;

  function dismiss() {
    setGone(true);
    start(async () => {
      try {
        await api(`/api/announcements/${slug}/read`, { method: "POST" });
      } catch {
        // Put it back rather than pretending it was seen. The read record is
        // the evidence that notice was given, so a failed write must not look
        // like a successful one.
        setGone(false);
      }
    });
  }

  const effective = effectiveAt
    ? new Date(effectiveAt).toLocaleDateString(undefined, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div
      // `role="status"` and not `alert`: this is important, but it is not an
      // emergency, and an assertive live region interrupts a screen reader
      // mid-sentence.
      role="status"
      className="border-b border-line bg-band-deep px-5 py-4 text-white"
    >
      <div className="mx-auto flex max-w-5xl items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold tracking-tight">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-white/70">{summary}</p>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
            {linkHref && (
              <Link
                href={linkHref}
                className="font-semibold text-coral-primary underline underline-offset-4"
              >
                {linkLabel ?? "Read it"}
              </Link>
            )}
            <Link
              href="/whats-new"
              className="text-white/60 underline underline-offset-4 hover:text-white"
            >
              All announcements
            </Link>
            {effective && (
              <span className="text-white/60">Takes effect {effective}</span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-full p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X size={16} aria-hidden />
          <span className="sr-only">Dismiss, and mark as read</span>
        </button>
      </div>
    </div>
  );
}
