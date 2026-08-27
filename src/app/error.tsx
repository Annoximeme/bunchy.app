"use client";

import { useEffect } from "react";
import { Button, LinkButton } from "@/components/ui";

/**
 * Top-level error boundary.
 *
 * Says what happened in plain language and offers the two things that actually
 * help, retry, or go somewhere that works. No stack traces, no error codes
 * nobody can act on.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled UI error:", error);
  }, [error]);

  return (
    <div data-page="error" className="flex min-h-dvh items-center justify-center px-5">
      <div className="card-surface max-w-md p-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          That didn&rsquo;t load
        </h1>
        <p className="mt-2 text-ink-soft">
          Something broke on our end. Nothing you did caused it, and nothing was
          lost.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <LinkButton href="/discover" variant="secondary">
            Go to Discover
          </LinkButton>
        </div>
      </div>
    </div>
  );
}
