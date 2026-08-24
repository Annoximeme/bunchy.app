import Link from "next/link";
import { AlertTriangle, ArrowRight, Info, Megaphone } from "lucide-react";
import type { AnnouncementSummary } from "@/server/modules/announcements/service";
import type { AnnouncementTier } from "@/generated/prisma/enums";
import { Tag } from "@/components/ui";

/**
 * The record of everything members have been told.
 *
 * Drawn as a dated spine rather than a stack of cards. These are events with an
 * order and, for the ones that matter, a second date attached, published then,
 * takes effect then, and a list of equal boxes flattens exactly the thing
 * somebody comes here to check.
 *
 * The tier is always visible. A member reading this a year later should be able
 * to tell at a glance which of these interrupted everybody and which did not,
 * because that is the difference between "we changed the terms" and "we shipped
 * Radar", and a system that draws them identically is one that will eventually
 * be used to push the second as though it were the first.
 */

const TIER: Record<
  AnnouncementTier,
  {
    label: string;
    icon: typeof Info;
    tone: "accent" | "suggested" | "neutral";
    dot: string;
  }
> = {
  CRITICAL: {
    label: "Important",
    icon: AlertTriangle,
    tone: "accent",
    dot: "bg-accent",
  },
  NOTABLE: {
    label: "New",
    icon: Megaphone,
    tone: "suggested",
    dot: "bg-purple",
  },
  NOTED: {
    label: "Noted",
    icon: Info,
    tone: "neutral",
    dot: "bg-line",
  },
};

function formatDate(value: Date) {
  return value.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * How many calendar days until a change lands.
 *
 * Both dates are flattened to local midnight before subtracting, so the answer
 * counts sleeps rather than hours. A change effective tomorrow at 09:00 reads
 * "tomorrow" whether it is looked at over breakfast or at half past eleven at
 * night; subtracting the raw timestamps would call the second one "today".
 *
 * `Math.round` on the result rather than a plain division: across a daylight
 * saving boundary two local midnights are 23 or 25 hours apart, which divides
 * to 0.96 of a day and would truncate a real day away.
 */
function daysUntil(date: Date, now: Date): number {
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const startOfThen = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
  return Math.round((startOfThen - startOfToday) / DAY_MS);
}

/**
 * The sentence a member actually wants: how long they have.
 *
 * A date on its own makes the reader do arithmetic to answer the only question
 * they came with, which is whether this has already happened to them. Terms §14
 * promises "a fair chance to leave with your data if you disagree", and a fair
 * chance is one you can tell you still have.
 */
export function effectiveNotice(
  effectiveAt: Date,
  now: Date,
): { text: string; pending: boolean } {
  const days = daysUntil(effectiveAt, now);

  if (days < 0) return { text: `Took effect ${formatDate(effectiveAt)}`, pending: false };
  if (days === 0) return { text: "Takes effect today", pending: true };
  if (days === 1) return { text: "Takes effect tomorrow", pending: true };
  return { text: `Takes effect in ${days} days`, pending: true };
}

/**
 * The tier, as a tag.
 *
 * It used to write out its own pill at `px-2.5 py-1` while the "Unread" tag
 * immediately beside it on the same row used `px-2 py-0.5`. Two labels in the
 * same style, touching, at two different heights, which reads as one of them
 * being broken rather than as a distinction.
 */
export function TierChip({ tier }: { tier: AnnouncementTier }) {
  const meta = TIER[tier];
  const Icon = meta.icon;
  return (
    <Tag tone={meta.tone}>
      <Icon size={12} aria-hidden />
      {meta.label}
    </Tag>
  );
}

/**
 * When it was said, and when it lands.
 *
 * The second date is the one the policies are about, Privacy §14 and Terms §14
 * promise notice *before* a change takes effect, and that is only checkable if
 * the date is on the notice rather than buried in the body.
 */
export function WhenLine({
  publishedAt,
  effectiveAt,
  now = new Date(),
}: {
  publishedAt: Date;
  effectiveAt: Date | null;
  now?: Date;
}) {
  const effective = effectiveAt ? effectiveNotice(effectiveAt, now) : null;

  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
      <time dateTime={publishedAt.toISOString()}>{formatDate(publishedAt)}</time>
      {effectiveAt && effective && (
        <>
          <span aria-hidden>·</span>
          <time
            dateTime={effectiveAt.toISOString()}
            // A change still ahead is the one thing on this line worth acting
            // on, so it is the one thing that is not grey.
            className={
              effective.pending
                ? "font-semibold text-accent-ink"
                : "font-medium"
            }
            title={formatDate(effectiveAt)}
          >
            {effective.text}
          </time>
        </>
      )}
    </span>
  );
}

/** Groups the record by the month it happened in. */
function byMonth(items: AnnouncementSummary[]) {
  const groups = new Map<string, AnnouncementSummary[]>();
  for (const item of items) {
    const key = item.publishedAt.toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
    });
    const bucket = groups.get(key);
    if (bucket) bucket.push(item);
    else groups.set(key, [item]);
  }
  return [...groups.entries()];
}

export function AnnouncementList({
  announcements,
  /** The board shows a couple as a pointer; the archive shows the spine. */
  compact = false,
}: {
  announcements: AnnouncementSummary[];
  compact?: boolean;
}) {
  if (compact) {
    return (
      <ol className="space-y-4">
        {announcements.map((item) => (
          <li key={item.slug}>
            <Row item={item} />
          </li>
        ))}
      </ol>
    );
  }

  return (
    <div className="mt-10 space-y-12">
      {byMonth(announcements).map(([month, items]) => (
        <section key={month}>
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
            {month}
          </h2>
          {/*
            The spine. A single line down the left with a dot per entry, so the
            record reads as a sequence of events rather than as a pile, and the
            dot carries the tier's colour, which is the fastest way to see that
            two of these interrupted everybody and one did not.
          */}
          <ol className="relative mt-5 border-l border-line pl-7">
            {items.map((item) => (
              <li key={item.slug} className="relative pb-8 last:pb-0">
                <span
                  aria-hidden
                  className={`absolute -left-[2.1rem] top-1.5 size-2.5 rounded-full ring-4 ring-canvas ${TIER[item.tier].dot}`}
                />
                <Row item={item} />
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

function Row({ item }: { item: AnnouncementSummary }) {
  return (
    // Not `card-surface`, and this is the one card in the product with a good
    // reason. The border colour carries state here: an unread notice is edged
    // in coral and a read one in the ordinary hairline, which a utility with a
    // fixed border cannot say. The other three properties are the utility's,
    // written out, including the shadow, which this card was missing and every
    // other card in the app has.
    <article
      className={`group rounded-[var(--radius-card)] border bg-surface p-6 shadow-[var(--shadow-card)] transition-colors duration-200 ${
        item.read ? "border-line" : "border-accent/30"
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <TierChip tier={item.tier} />
        {!item.read && (
          <Tag tone="teal">Unread</Tag>
        )}
        <WhenLine
          publishedAt={item.publishedAt}
          effectiveAt={item.effectiveAt}
        />
      </div>

      <h3 className="mt-3 text-lg font-bold tracking-tight">
        <Link
          href={`/whats-new/${item.slug}`}
          className="transition-colors hover:text-accent-ink"
        >
          {item.title}
        </Link>
      </h3>
      <p className="mt-2 max-w-[62ch] leading-relaxed text-ink-soft">
        {item.summary}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <Link
          href={`/whats-new/${item.slug}`}
          className="inline-flex items-center gap-1.5 font-semibold text-accent-ink underline underline-offset-2"
        >
          Read the notice
          <ArrowRight
            size={14}
            aria-hidden
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </Link>
        {item.linkHref && (
          <Link
            href={item.linkHref}
            className="text-muted underline underline-offset-2 transition-colors hover:text-ink"
          >
            {item.linkLabel ?? "The document"}
          </Link>
        )}
      </div>
    </article>
  );
}
