"use client";

import { useState, useTransition } from "react";
import { Link, useFormats } from "@/components/link";
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
  linkHref,
  linkLabel,
  effectiveAt,
}: {
  slug: string;
  title: string;
  linkHref: string | null;
  linkLabel: string | null;
  /** ISO string, formatted on the client so it reads in the member's locale. */
  effectiveAt: string | null;
}) {
  const [gone, setGone] = useState(false);
  const [, start] = useTransition();
  const formats = useFormats();

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

  // Through the app's own formatter, not the browser's idea of a date. With
  // `undefined` for the locale this said "September 7, 2026" to everybody: an
  // American date on a Belgian product, in English no matter which of the
  // three languages the rest of the banner was written in.
  const effective = effectiveAt ? formats.longDate(effectiveAt) : null;

  return (
    <div
      // `role="status"` and not `alert`: this is important, but it is not an
      // emergency, and an assertive live region interrupts a screen reader
      // mid-sentence.
      role="status"
      /*
        One line, on a surface of its own.

        This used to be a full-bleed black band carrying a title, a summary, two
        links and a date: 110px on a desktop and 181px on a phone, which is a
        fifth of the screen, above the page title on every screen until it was
        dismissed. It was the loudest thing in the product by a wide margin.

        And in dark mode it was the quietest. Near-black on a near-black page
        meant the one component whose whole job is "you must see this" had less
        contrast against its background than an ordinary card. Loud where it
        should be calm, invisible where it should be clear.

        So: the accent wash, which is a notice colour in both themes, a coral
        edge to catch the eye, and one row. The summary is not lost, it is on
        the page the link goes to, which is where somebody who wants it is
        going anyway.
      */
      // The coral edge belongs to the band, not to the column inside it. On the
      // container it floated in the middle of the strip with pale pink either
      // side of it; on the band it starts where the band starts, which is right
      // where the sidebar ends.
      className="border-b border-l-4 border-line border-l-accent bg-accent-soft"
    >
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-2.5">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight text-ink">
          {title}
        </p>

        {linkHref && (
          <Link
            href={linkHref}
            className="shrink-0 whitespace-nowrap text-sm font-semibold text-accent-ink underline underline-offset-4"
          >
            {linkLabel ?? "Read it"}
          </Link>
        )}

        {/* The date is the first thing to go when there is no room for it: on a
            phone the title and the way in are what matter, and both of them are
            repeated on the page the link opens. */}
        {effective && (
          <span className="hidden shrink-0 whitespace-nowrap text-sm text-muted sm:inline">
            Takes effect {effective}
          </span>
        )}

        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-full p-1.5 text-muted transition-colors hover:bg-accent/15 hover:text-ink"
        >
          <X size={16} aria-hidden />
          <span className="sr-only">Dismiss, and mark as read</span>
        </button>
      </div>
    </div>
  );
}
