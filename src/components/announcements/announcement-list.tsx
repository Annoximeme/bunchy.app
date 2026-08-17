import Link from "next/link";
import { AlertTriangle, Info, Megaphone } from "lucide-react";
import type { AnnouncementSummary } from "@/server/modules/announcements/service";
import type { AnnouncementTier } from "@/generated/prisma/enums";

/**
 * The archive, and the strip that sits on top of the Buzz board.
 *
 * The tier is shown, not hidden. A member reading this later should be able to
 * tell at a glance which of these interrupted everybody and which did not,
 * because that is the difference between "we changed the terms" and "we shipped
 * Radar" — and a system that draws them identically is one that will eventually
 * be used to push the second as though it were the first.
 */

const TIER: Record<
  AnnouncementTier,
  { label: string; icon: typeof Info; className: string }
> = {
  CRITICAL: {
    label: "Important",
    icon: AlertTriangle,
    className: "bg-accent-soft text-accent-ink",
  },
  NOTABLE: {
    label: "New",
    icon: Megaphone,
    className: "bg-purple-soft text-purple-ink",
  },
  NOTED: {
    label: "Noted",
    icon: Info,
    className: "bg-surface-sunken text-muted",
  },
};

function formatDate(value: Date) {
  return value.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function AnnouncementList({
  announcements,
}: {
  announcements: AnnouncementSummary[];
}) {
  return (
    <ol className="mt-8 space-y-4">
      {announcements.map((item) => {
        const tier = TIER[item.tier];
        const Icon = tier.icon;

        return (
          <li
            key={item.slug}
            className="rounded-[var(--radius-card)] border border-line bg-surface p-6"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${tier.className}`}
              >
                <Icon size={12} aria-hidden />
                {tier.label}
              </span>
              <time
                dateTime={item.publishedAt.toISOString()}
                className="text-sm text-muted"
              >
                {formatDate(item.publishedAt)}
              </time>
              {!item.read && (
                <span className="rounded-full bg-mint-soft px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-mint-ink">
                  Unread
                </span>
              )}
            </div>

            <h2 className="mt-3 text-lg font-bold tracking-tight">
              {item.title}
            </h2>
            <p className="mt-2 max-w-[62ch] leading-relaxed text-ink-soft">
              {item.summary}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              {item.linkHref && (
                <Link
                  href={item.linkHref}
                  className="font-semibold text-accent-ink underline underline-offset-2"
                >
                  {item.linkLabel ?? "Read it"}
                </Link>
              )}
              {item.effectiveAt && (
                // The date the promise is about. Kept next to the link to the
                // document rather than buried in the body, because "before it
                // takes effect" is only useful if you can see when that is.
                <span className="text-muted">
                  Takes effect {formatDate(item.effectiveAt)}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
