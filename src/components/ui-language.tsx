"use client";

import { Button } from "@/components/ui";
import { useTranslate } from "@/components/link";

/**
 * The two pieces of the kit that read the language.
 *
 * Split out of `ui.tsx` because reading the language is a hook, and a module
 * containing a hook has to be a client module. `ui.tsx` re-exports both, so
 * nothing that uses them had to change, and the rest of the kit stays
 * renderable on the server.
 */

/**
 * Compatibility, rendered as a quiet number rather than a trophy.
 *
 * Deliberately understated: this is information to help someone decide, not a
 * score to chase. There is no leaderboard anywhere in the product that this
 * could feed.
 */
export function CompatibilityBadge({ score }: { score: number }) {
  const t = useTranslate();

  return (
    <span
      className="inline-flex items-baseline gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-accent-ink"
      title={t("common.compatibility")}
    >
      <span className="text-sm font-semibold tabular-nums">{score}%</span>
      {/* No `opacity-80` here. Dimming the label pulled it to 3.61:1 on the
          soft coral behind it, the quietness was worth having and was being
          bought by making the word hard to read. The smaller size already
          subordinates it. */}
      <span className="text-[11px] font-medium">match</span>
    </span>
  );
}

export function ErrorNotice({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  const t = useTranslate();

  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-control)] border border-danger/25 bg-danger-soft px-4 py-3"
    >
      <p className="text-sm text-danger">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {t("common.tryAgain")}
        </Button>
      )}
    </div>
  );
}
