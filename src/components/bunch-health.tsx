import { Card, cn } from "@/components/ui";
import { getTranslations } from "@/server/i18n";

/**
 * {t("bunch.chemistry")}, as a member sees it.
 *
 * An earlier version of this component showed the observations and deliberately
 * hid the number, on the grounds that scoring a group's friendships invites
 * people to perform for it. §7 asks for the number, so it is here, but the
 * shape of what surrounds it is doing the work that argument was worried about:
 *
 * - **The observations come first and are the point.** The score is a small
 *   figure beside a heading; the actionable sentences get the space. Nobody can
 *   raise the number by reading this card, and nothing here suggests they
 *   should try.
 * - **No member is named or ranked.** Every observation is about the group.
 *   "Three members haven't said anything" is a fact about the bunch's shape;
 *   "Milan has been quiet" would be a report card on a person, and §7 forbids
 *   it explicitly.
 * - **Low confidence is stated, not smoothed.** A bunch four days old shows
 *   "too new to tell" rather than a plausible-looking 60%, because a confident
 *   number derived from four days of nothing is worse than an honest gap.
 * - **There is no trend line and no history.** One reading, and at most a note
 *   that it moved since the last one.
 */

export async function BunchHealth({
  score,
  previousScore,
  confidence,
  observations,
}: {
  score: number | null;
  previousScore?: number | null;
  confidence?: string;
  observations: string[];
}) {
  const t = await getTranslations();
  const hasScore = score !== null && confidence !== "none";
  if (!hasScore && observations.length === 0) return null;

  const change =
    hasScore && previousScore !== null && previousScore !== undefined
      ? score - previousScore
      : null;

  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <span
            aria-hidden
            className="inline-block size-2 shrink-0 rounded-full bg-purple"
          />
          {t("bunch.chemistry")}
        </h2>

        {hasScore ? (
          <p className="flex items-baseline gap-1.5">
            <span className="text-xl font-semibold tabular-nums">{score}%</span>
            {change !== null && change !== 0 && (
              <span
                className={cn(
                  "text-xs font-medium tabular-nums",
                  change > 0 ? "text-positive" : "text-muted",
                )}
              >
                {change > 0 ? "+" : ""}
                {change} since last week
              </span>
            )}
          </p>
        ) : (
          <p className="text-sm text-muted">{t("bunch.tooNew")}</p>
        )}
      </div>

      {hasScore && confidence === "low" && (
        <p className="mt-1 text-xs text-muted">
          {t("bunch.shortHistory")}
        </p>
      )}

      {observations.length > 0 && (
        <ul className="mt-3 space-y-2">
          {observations.map((line) => (
            <li key={line} className="flex gap-2 text-sm text-ink-soft">
              <span aria-hidden className="text-muted">
                ·
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
