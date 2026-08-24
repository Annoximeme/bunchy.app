"use client";

import { useEffect } from "react";
import { Button, LinkButton } from "@/components/ui";

/**
 * The signed-in app's own error boundary.
 *
 * Without one, a page that threw fell all the way out to the root boundary,
 * which renders on a bare document: no navigation, no footer, nothing to press
 * except the browser's back button. One failing query on Messages and the
 * product appeared to have vanished.
 *
 * This one is nested inside the app layout, so the nav stays where it was and
 * the failure reads as one broken page rather than a broken site. That is the
 * honest description as well as the reassuring one, everything else still
 * works, and the member can prove it in one click.
 *
 * `reset` re-renders the segment, which is genuinely worth offering here: most
 * of what fails in this product is a database call, and most of those fail
 * once.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled app error:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <div className="card-surface p-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          This page didn&rsquo;t load
        </h1>
        <p className="mt-2 text-ink-soft">
          Something broke on our end. Nothing you did caused it, nothing was
          lost, and the rest of Bunchy is still working.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <LinkButton href="/discover" variant="secondary">
            Go to Discover
          </LinkButton>
        </div>
        {/*
          The digest is the only thing that connects what the member saw to a
          line in the server log. Shown quietly, and only when there is one, so
          that a bug report can say which failure it was without asking anybody
          to read a stack trace.
        */}
        {error.digest && (
          <p className="mt-6 font-mono text-xs text-muted">
            Reference {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
