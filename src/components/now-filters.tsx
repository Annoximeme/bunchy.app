"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/components/ui";

/**
 * The Bunchy Now filters.
 *
 * Links, not buttons with state. The board is a server-rendered page and the
 * filters are part of its address, which means a filtered view can be shared,
 * bookmarked and reloaded, and means there is no client cache to fall out of
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

  /**
   * Two tiers, one colour.
   *
   * The horizon is the primary filter and wears the accent as a solid fill.
   * Distance and compatibility are refinements on top of it and wear the same
   * accent as a tint, which is what says "selected" without competing with the
   * row above.
   *
   * They used to be selected in teal and purple respectively, which looked fine
   * and meant nothing: globals.css assigns coral to "brand, primary action,
   * active state", teal to success and connection, and purple to something the
   * software worked out rather than something a person wrote. Turning on a 25km
   * filter is none of those last two. Three colours of "on" in a single row is
   * how a palette stops carrying meaning, which that file says out loud two
   * paragraphs above the tokens it was ignoring here.
   */
  const refinement = (on: boolean) =>
    cn(
      "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
      on
        ? "bg-accent-soft text-accent-ink"
        : "border border-line text-muted hover:bg-surface-sunken",
    );

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
            className={refinement(distance === String(km))}
          >
            {km} km
          </Link>
        ))}

        <span className="ml-3 text-muted">Compatibility</span>
        {[70, 85].map((score) => (
          <Link
            key={score}
            href={withParam("minScore", minScore === String(score) ? null : String(score))}
            className={refinement(minScore === String(score))}
          >
            {score === 85 ? "Strong fit" : "Good fit"}
          </Link>
        ))}
      </div>
    </div>
  );
}
