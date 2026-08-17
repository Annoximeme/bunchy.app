"use client";

import { useState, useTransition } from "react";
import { Check, Plus } from "lucide-react";
import { api } from "@/lib/api";

/**
 * "I'm in" — the only number this section reports about itself.
 *
 * It is a count of members pressing a real button, and it is hidden until there
 * are enough of them to mean anything (the server applies the same floor the
 * availability clusters use). That is why there is no "2.4k interested" badge
 * anywhere on this board: Bunchy has not launched, so the only honest version
 * of that number is the one nobody has generated yet.
 *
 * Optimistic, because the whole gesture is meant to feel like putting your hand
 * up. It reverts on failure rather than pretending, and the count moves with it
 * — including across the floor, which is why the server sends the count back
 * instead of the client incrementing what it has.
 */
export function BuzzSignalButton({
  slug,
  initialIsIn,
  initialCount,
}: {
  slug: string;
  initialIsIn: boolean;
  initialCount: number | null;
}) {
  const [isIn, setIsIn] = useState(initialIsIn);
  const [count, setCount] = useState(initialCount);
  const [pending, start] = useTransition();

  function toggle() {
    const wasIn = isIn;
    const hadCount = count;
    setIsIn(!wasIn);

    start(async () => {
      try {
        const result = await api<{ viewerIsIn: boolean; interested: number | null }>(
          `/api/buzz/${slug}/signal`,
          { method: "POST" },
        );
        setIsIn(result.viewerIsIn);
        setCount(result.interested);
      } catch {
        setIsIn(wasIn);
        setCount(hadCount);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={isIn}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors duration-150 disabled:opacity-60 ${
        isIn
          ? "border-mint-ink/40 bg-mint-soft text-mint-ink"
          : "border-line bg-surface text-ink-soft hover:border-accent/40 hover:text-ink"
      }`}
    >
      {isIn ? <Check size={15} aria-hidden /> : <Plus size={15} aria-hidden />}
      {isIn ? "You're in" : "I'm in"}
      {count !== null && (
        <span className="tabular-nums text-muted">{count}</span>
      )}
    </button>
  );
}
