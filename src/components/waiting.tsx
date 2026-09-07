import { Link } from "@/components/link";
import { getTranslations } from "@/server/i18n";
import type { WaitingItem, WaitingKind } from "@/server/modules/waiting/service";

/**
 * What other people are waiting on you for.
 *
 * A server component, because every item is a fact from the database and
 * nothing here is interactive: each row is a link to the screen where the
 * thing is actually answered. Rendering it on the client would mean shipping
 * a fetch and a spinner to draw six links.
 *
 * ## Why it says who rather than what
 *
 * "3 things need you" is a badge. "Milan asked to connect" is a person, and
 * the difference decides whether somebody opens it. Every line names either
 * the person waiting or the thing they are waiting about.
 *
 * ## Why an empty list renders nothing at all
 *
 * A card that says "nothing is waiting" is a card that has to be read to
 * discover it is empty, on the screen somebody sees most often. When nobody is
 * waiting, this simply is not there.
 */

const PHRASE: Record<WaitingKind, string> = {
  CONNECTION_REQUEST: "waiting.kinds.connection",
  INTRODUCTION: "waiting.kinds.introduction",
  PLAN_VOTE: "waiting.kinds.plan",
  SEAT_CONFIRMATION: "waiting.kinds.seat",
  JOIN_REQUEST: "waiting.kinds.join",
  MEETUP: "waiting.kinds.meetup",
  OUTCOME: "waiting.kinds.outcome",
};

export async function WaitingOnYou({
  items,
  limit,
}: {
  items: WaitingItem[];
  /** Shows this many and links to the rest. Omit to show all of them. */
  limit?: number;
}) {
  if (items.length === 0) return null;
  const t = await getTranslations();
  const shown = limit ? items.slice(0, limit) : items;

  return (
    <section className="card-surface p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">
          {t("waiting.title")}
        </h2>
        {limit && items.length > shown.length && (
          <Link
            href="/waiting"
            className="text-sm font-medium text-accent-ink underline underline-offset-2"
          >
            {t("waiting.all", { count: items.length })}
          </Link>
        )}
      </div>

      <ul className="mt-4 space-y-2.5">
        {shown.map((item) => (
          <li key={`${item.kind}-${item.subject}-${item.since.toISOString()}`}>
            <Link
              href={item.linkPath}
              className="block rounded-[var(--radius-control)] bg-surface-sunken px-3.5 py-2.5 text-sm transition-colors hover:bg-surface"
            >
              {t(PHRASE[item.kind] as "waiting.kinds.connection", {
                subject: item.subject,
              })}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
