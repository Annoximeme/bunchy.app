import { db } from "@/server/db/client";

/**
 * What somebody has actually arranged, and whether people came.
 *
 * ## The signal, and the one deliberately not built
 *
 * The obvious trust signal is personal reliability: "said yes to four things,
 * turned up to four". It is not built and should not be, because
 * `ActivityOutcome.attended` is somebody's own answer about themselves.
 * Publishing a number derived from self-report as evidence to other people is
 * both weak and trivially gameable, and a trust signal that can be typed into
 * existence is worse than none: it looks like proof.
 *
 * Hosting is different, and that is the whole reason this file exists rather
 * than a `reliability.ts`. The evidence is other people's answers about
 * evenings this person arranged. A host cannot report turnout at their own
 * event into being, and the thing being measured, "did anybody actually come",
 * is exactly what somebody deciding whether to join a stranger's plan wants to
 * know.
 *
 * ## Why it is a sentence rather than a badge
 *
 * No level, no score, no tier, no leaderboard. Two counts and the plain
 * sentence they support. The brief this came from asks for recognition based on
 * genuine contribution, and warns in the same breath against XP systems; the
 * difference between the two is whether the number is a fact about what
 * happened or a currency. Counting is fine. Ranking people by the count is what
 * turns it into a popularity contest, so nothing here sorts anybody.
 *
 * A host with nothing behind them gets no sentence at all rather than a zero.
 * "0 evenings hosted" is a mark against somebody for being new, which is the
 * opposite of the intent.
 */

export interface HostStats {
  /** Evenings they arranged that have been and gone, cancellations excluded. */
  hosted: number;
  /** How many of those somebody other than the host said they turned up to. */
  attended: number;
}

/** Below this there is nothing worth saying, so nothing is said. */
export const MIN_HOSTED_TO_SHOW = 3;

export async function hostStats(
  profileId: string,
  now = new Date(),
): Promise<HostStats> {
  const past = {
    organizerId: profileId,
    status: { not: "CANCELLED" as const },
    startsAt: { lt: now },
  };

  const [hosted, attended] = await Promise.all([
    db.activity.count({ where: past }),
    db.activity.count({
      where: {
        ...past,
        // Somebody *other than the host*. Without this a host answering their
        // own prompt would be counted as turnout at their own event, which is
        // the self-report problem this module exists to avoid.
        outcomes: {
          some: { attended: true, profileId: { not: profileId } },
        },
      },
    }),
  ]);

  return { hosted, attended };
}

/**
 * The sentence, or nothing.
 *
 * Returns null rather than an empty string so a caller cannot accidentally
 * render an empty element, and so "there is nothing to say" is a value the type
 * system makes them handle.
 */
export function hostLine(stats: HostStats): string | null {
  if (stats.hosted < MIN_HOSTED_TO_SHOW) return null;

  const evenings = `${stats.hosted} evenings`;
  if (stats.attended === 0) return `Has arranged ${evenings}.`;
  if (stats.attended === stats.hosted) {
    return `Has arranged ${evenings}, and people turned up to all of them.`;
  }
  return `Has arranged ${evenings}, and people turned up to ${stats.attended}.`;
}
