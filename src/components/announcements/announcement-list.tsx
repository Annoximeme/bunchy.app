import Link from "next/link";
import { AlertTriangle, ArrowRight, Info, Megaphone } from "lucide-react";
import type { AnnouncementSummary } from "@/server/modules/announcements/service";
import type { AnnouncementTier } from "@/generated/prisma/enums";

/**
 * The record of everything members have been told.
 *
 * Drawn as a dated spine rather than a stack of cards. These are events with an
 * order and, for the ones that matter, a second date attached — published then,
 * takes effect then — and a list of equal boxes flattens exactly the thing
 * somebody comes here to check.
 *
 * The tier is always visible. A member reading this a year later should be able
 * to tell at a glance which of these interrupted everybody and which did not,
 * because that is the difference between "we changed the terms" and "we shipped
 * Radar" — and a system that draws them identically is one that will eventually
 * be used to push the second as though it were the first.
 */

const TIER: Record<
  AnnouncementTier,
  { label: string; icon: typeof Info; chip: string; dot: string }
> = {
  CRITICAL: {
    label: "Important",
    icon: AlertTriangle,
    chip: "bg-accent-soft text-accent-ink",
    dot: "bg-accent",
  },
  NOTABLE: {
    label: "New",
    icon: Megaphone,
    chip: "bg-purple-soft text-purple-ink",
    dot: "bg-purple",
  },
  NOTED: {
    label: "Noted",
    icon: Info,
    chip: "bg-surface-sunken text-muted",
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

export function TierChip({ tier }: { tier: AnnouncementTier }) {
  const meta = TIER[tier];
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${meta.chip}`}
    >
      <Icon size={12} aria-hidden />
      {meta.label}
    </span>
  );
}

/**
 * When it was said, and when it lands.
 *
 * The second date is the one the policies are about — Privacy §14 and Terms §14
 * promise notice *before* a change takes effect, and that is only checkable if
 * the date is on the notice rather than buried in the body.
 */
export function WhenLine({
  publishedAt,
  effectiveAt,
}: {
  publishedAt: Date;
  effectiveAt: Date | null;
}) {
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
      <time dateTime={publishedAt.toISOString()}>{formatDate(publishedAt)}</time>
      {effectiveAt && (
        <>
          <span aria-hidden>·</span>
          <span>
            Takes effect{" "}
            <time dateTime={effectiveAt.toISOString()} className="font-medium">
              {formatDate(effectiveAt)}
            </time>
          </span>
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
            record reads as a sequence of events rather than as a pile — and the
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
    <article
      className={`group rounded-[var(--radius-card)] border bg-surface p-6 transition-colors duration-200 ${
        item.read ? "border-line" : "border-accent/30"
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <TierChip tier={item.tier} />
        {!item.read && (
          <span className="rounded-full bg-mint-soft px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-mint-ink">
            Unread
          </span>
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
