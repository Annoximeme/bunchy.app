import { Card } from "@/components/ui";

/**
 * What the bunch could do next.
 *
 * Deliberately not a chemistry score. The number exists — it ranks
 * recommendations, proposes new bunches and tells staff when a group is dying —
 * but showing a group "your chemistry: 41%" turns a set of friendships into a
 * metric people feel judged by, and the reliable way to raise a number like
 * that is to post more, which is the behaviour this product exists not to
 * reward.
 *
 * So members get the observations instead: specific, factual, and every one of
 * them something a person could act on this afternoon. When there is nothing
 * worth saying, this renders nothing at all rather than inventing a nudge.
 */
export function BunchHealth({ observations }: { observations: string[] }) {
  if (observations.length === 0) return null;

  return (
    <Card>
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <span
          aria-hidden
          className="inline-block size-2 shrink-0 rounded-full bg-purple"
        />
        Worth knowing
      </h2>
      <ul className="mt-3 space-y-2">
        {observations.map((line) => (
          <li key={line} className="flex gap-2 text-sm text-ink-soft">
            <span aria-hidden className="text-purple-ink">
              ·
            </span>
            {line}
          </li>
        ))}
      </ul>
    </Card>
  );
}
