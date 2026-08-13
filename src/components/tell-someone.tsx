"use client";

import { useState } from "react";

/**
 * "Tell someone where you're going."
 *
 * Deliberately not a feature that sends anything. Bunchy has no way to reach a
 * person who is not a member — and even with email working, a message from an
 * unfamiliar domain is the one a friend ignores. The person you actually tell
 * things to is already in a chat window, so this hands you the text and gets out
 * of the way.
 *
 * It also means no new data: we never learn who your trusted contact is, which
 * is a better answer than storing them carefully.
 */
export function TellSomeone({
  title,
  whenLabel,
  whereLabel,
  url,
}: {
  title: string;
  whenLabel: string;
  whereLabel: string | null;
  url: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  const message = [
    `I'm going to "${title}" ${whenLabel}${whereLabel ? ` at ${whereLabel}` : ""}.`,
    `Details: ${url}`,
  ].join("\n");

  async function share() {
    // The native sheet where it exists — on a phone that is the difference
    // between one tap and switching apps.
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text: message });
        return;
      } catch {
        // Dismissing the sheet lands here too, so fall through to copying
        // rather than reporting a failure that did not happen.
      }
    }

    try {
      await navigator.clipboard.writeText(message);
      setState("copied");
      setTimeout(() => setState("idle"), 2500);
    } catch {
      setState("failed");
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={share}
        className="rounded-[var(--radius-control)] border border-line px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-sunken"
      >
        Tell someone
      </button>
      {state === "copied" && (
        <span className="text-xs text-positive">Copied — paste it to a friend</span>
      )}
      {state === "failed" && (
        <span className="text-xs text-muted">Couldn&apos;t copy — long-press to select</span>
      )}
    </span>
  );
}
