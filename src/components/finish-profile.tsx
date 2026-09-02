"use client";

import { Link, useTranslate } from "@/components/link";

/**
 * What somebody left for later, asked for once they have a reason to answer.
 *
 * The counterpart to the skip on the last two onboarding steps. Skipping is
 * only honest if the question genuinely comes back, and it has to come back
 * somewhere the member has already seen what the answer is for: asking "when
 * are you free?" before anybody has been introduced is asking in a vacuum, and
 * asking it above a list of things happening this week is not.
 *
 * A line and not a card, for the reason the rest of Discover's asks are lines:
 * an ask that takes as much room as a recommendation reads as being as
 * important as one. It disappears the moment the answers exist, and nothing
 * about it nags. A member who never answers gets slightly worse suggestions
 * and no reproach for it.
 *
 * It carries no margin of its own. Discover stacks the three asks in one strip
 * and spaces them from there, and a component that renders nothing most of the
 * time cannot be trusted to own the gap above the thing after it.
 */
export function FinishProfile({
  outstanding,
}: {
  outstanding: Array<"goals" | "availability">;
}) {
  const t = useTranslate();
  if (outstanding.length === 0) return null;

  const goals = outstanding.includes("goals");
  const availability = outstanding.includes("availability");

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[var(--radius-control)] border border-line bg-surface-sunken px-4 py-3 text-sm">
      <span className="text-ink-soft">
        {goals && availability
          ? t("finishProfile.both")
          : goals
            ? t("finishProfile.goalsOnly")
            : t("finishProfile.availabilityOnly")}
      </span>
      {goals && (
        <Link
          href="/onboarding/goals"
          className="font-semibold text-accent-ink underline underline-offset-2"
        >
          {t("finishProfile.goalsLink")}
        </Link>
      )}
      {availability && (
        <Link
          href="/onboarding/availability"
          className="font-semibold text-accent-ink underline underline-offset-2"
        >
          {t("finishProfile.availabilityLink")}
        </Link>
      )}
    </div>
  );
}
