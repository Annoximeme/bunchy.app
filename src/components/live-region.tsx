"use client";

import { useEffect, useRef, useState } from "react";
import { useAppPath } from "@/components/link";

/**
 * Things that change without the page changing.
 *
 * Most of this product updates in place: a filter narrows a list, a join
 * button becomes a leave button, a request is sent. To a sighted person the
 * screen visibly answers. To somebody on a screen reader, nothing at all
 * happens, because the focused element did not change and no announcement was
 * made. A polite live region is the announcement.
 *
 * `role="status"` and `aria-live="polite"` together, rather than either alone,
 * because the pairing is what the older screen readers actually honour. The
 * region is always mounted, only its text changes: a region that appears at
 * the same moment as its message is frequently not announced at all, since
 * assistive technology only watches regions it already knows about.
 */
export function Announce({ message }: { message: string }) {
  // A span rather than a paragraph so this can be dropped inside any element,
  // including the ones that are themselves paragraphs. `sr-only` takes it out
  // of the flow anyway, so nothing depends on which it is.
  return (
    <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {message}
    </span>
  );
}

/**
 * The announcement a single-page app owes on every navigation.
 *
 * A full page load tells a screen reader where it landed, because the document
 * is replaced and the new title is read. Client-side routing replaces the
 * middle of the page and says nothing, so somebody who activates a link in the
 * sidebar hears silence and has no way to know the main region changed at all.
 * Next.js does not ship this; every route in the product needs it, so it sits
 * in the signed-in shell rather than on any one page.
 *
 * The title is read after paint rather than on the pathname change, because at
 * the moment the path changes the new page's `generateMetadata` has not yet
 * been applied to `document.title` and the old page's title would be read out
 * as the new one.
 */
export function RouteAnnouncer() {
  const pathname = useAppPath();
  const [message, setMessage] = useState("");
  // The first render is a real page load, which the browser has already
  // announced. Announcing it again is a duplicate, not a courtesy.
  const landed = useRef(false);

  useEffect(() => {
    if (!landed.current) {
      landed.current = true;
      return;
    }
    const timer = setTimeout(() => {
      const title = document.title.trim();
      if (title) setMessage(`${title}, navigated`);
    }, 120);
    return () => clearTimeout(timer);
  }, [pathname]);

  return <Announce message={message} />;
}
