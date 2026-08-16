import type { ReactNode } from "react";
import { Chip, cn } from "@/components/ui";

/**
 * Why a percentage is what it is.
 *
 * "92% compatible" is a number somebody has to take on faith. This breaks it
 * into the dimensions it was actually built from, each with the sentence the
 * scorer wrote when it ran — so a member can disagree with a specific part
 * ("we're not that similar on availability") rather than with a black box.
 *
 * Two decisions worth stating:
 *
 * - **Only signals that ran are shown.** The scorer skips dimensions it has no
 *   evidence for and renormalises over the rest. Drawing "Personality — 0%" for
 *   somebody who has not done the style questions would be reporting missing
 *   data as a bad result.
 * - **The bars are decoration.** Every number is present as text, the list is a
 *   real `<dl>`, and the bars carry `aria-hidden`. Nothing here is conveyed by
 *   length or colour alone.
 */

/** Signal names come from the matching engine; these are what a member calls them. */
const LABELS: Record<string, string> = {
  shared_interests: "Interests",
  complementary_interests: "Things to learn",
  social_goals: "Looking for",
  personality: "Social style",
  availability: "Availability",
  location: "Location",
  age: "Age",
  history: "Shared history",
};

export interface RadarSignal {
  signal: string;
  /** 0-1 as the engine produces it. */
  score: number;
  weight: number;
  reason?: string;
}

export function CompatibilityRadar({
  score,
  signals,
  highlights,
  className,
}: {
  /**
   * Omit when the surrounding page already states the number.
   *
   * The profile page shows the match as a pill above this breakdown, and a
   * second "92% compatible" heading inside the very panel that explains that
   * number reads as a rendering mistake. Required-looking by default because
   * every other caller opens with it.
   */
  score?: number;
  signals: RadarSignal[];
  /** Short phrases for "why you might click". */
  highlights?: string[];
  className?: string;
}) {
  // Heaviest first: the dimensions that actually moved the number belong at the
  // top, not whichever happened to be evaluated first.
  const ordered = [...signals]
    .filter((s) => LABELS[s.signal])
    .sort((a, b) => b.weight - a.weight || b.score - a.score);

  if (ordered.length === 0) return null;

  return (
    <div className={cn("space-y-4", className)}>
      {score !== undefined && (
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums tracking-tight">
            {score}%
          </span>
          <span className="text-sm text-muted">compatible</span>
        </div>
      )}

      <dl className="space-y-2.5">
        {ordered.map((signal) => (
          <Row
            key={signal.signal}
            label={LABELS[signal.signal]!}
            percent={Math.round(signal.score * 100)}
            reason={signal.reason}
          />
        ))}
      </dl>

      {highlights && highlights.length > 0 && (
        <div>
          <h4 className="text-sm font-medium">Why you might click</h4>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {highlights.slice(0, 4).map((highlight) => (
              <li key={highlight}>
                <Chip>{highlight}</Chip>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  percent,
  reason,
}: {
  label: string;
  percent: number;
  reason?: string;
}): ReactNode {
  return (
    <div className="grid grid-cols-[7.5rem_1fr_2.75rem] items-center gap-3">
      <dt className="truncate text-sm text-ink-soft" title={reason}>
        {label}
      </dt>
      {/* Decoration. The number to its right is the actual content. */}
      <div
        aria-hidden
        className="h-2 overflow-hidden rounded-full bg-surface-sunken"
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-500 motion-reduce:transition-none"
          style={{ width: `${Math.max(2, percent)}%` }}
        />
      </div>
      <dd className="text-right text-sm font-medium tabular-nums">{percent}%</dd>
    </div>
  );
}
