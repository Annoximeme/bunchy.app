"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/components/ui";

/**
 * The Bunchy Now filters.
 *
 * Links, not buttons with state. The board is a server-rendered page and the
 * filters are part of its address, which means a filtered view can be shared,
 * bookmarked and reloaded — and means there is no client cache to fall out of
 * step with what the server actually returned.
 */
export function NowFilters({
  horizons,
  active,
}: {
  horizons: Array<{ value: string; label: string }>;
  active: string;
}) {
  const pathname = usePathname();
  const params = useSearchParams();

  function withParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value === null) next.delete(key);
    else next.set(key, value);
    const query = next.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  const distance = params.get("withinKm");
  const minScore = params.get("minScore");

  return (
    <div className="mb-8 space-y-3">
      <div className="flex flex-wrap gap-2">
        {horizons.map((horizon) => (
          <Link
            key={horizon.value}
            href={withParam("horizon", horizon.value === "all" ? null : horizon.value)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              active === horizon.value
                ? "bg-accent text-[var(--color-on-accent)]"
                : "border border-line text-ink-soft hover:bg-surface-sunken",
            )}
          >
            {horizon.label}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">Within</span>
        {[5, 25, 100].map((km) => (
          <Link
            key={km}
            href={withParam("withinKm", distance === String(km) ? null : String(km))}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              distance === String(km)
                ? "bg-teal-soft text-teal"
                : "border border-line text-muted hover:bg-surface-sunken",
            )}
          >
            {km} km
          </Link>
        ))}

        <span className="ml-3 text-muted">Compatibility</span>
        {[70, 85].map((score) => (
          <Link
            key={score}
            href={withParam("minScore", minScore === String(score) ? null : String(score))}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              minScore === String(score)
                ? "bg-purple-soft text-purple-ink"
                : "border border-line text-muted hover:bg-surface-sunken",
            )}
          >
            {score}%+
          </Link>
        ))}
      </div>
    </div>
  );
}
