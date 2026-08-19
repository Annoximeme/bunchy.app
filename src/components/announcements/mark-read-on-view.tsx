"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

/**
 * Records that this announcement was read, once, after it is on screen.
 *
 * The obvious implementation is to call `markRead` in the page itself, and it
 * is wrong twice. A server component is a render, not an event: React is free
 * to render it more than once, and a write in that path is a write with no
 * defined number of times it happens. And the unread badge in the nav is
 * computed in the layout *above* this page, so a write during the page's render
 * lands too late to change it, the member reads the notice and watches the
 * badge keep insisting there is something unread.
 *
 * Doing it here fixes both: one effect, guarded against Strict Mode's double
 * invoke, and a `refresh()` afterwards so the layout recounts.
 */
export function MarkReadOnView({ slug }: { slug: string }) {
  const router = useRouter();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    let cancelled = false;
    void (async () => {
      try {
        await api(`/api/announcements/${slug}/read`, { method: "POST" });
        // Recount the badge and retire the banner. Silent on failure: not
        // having recorded a read is a reason to show it again, which is what
        // happens anyway.
        if (!cancelled) router.refresh();
      } catch {
        done.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug, router]);

  return null;
}
