"use client";

import { Link, useLanguage } from "@/components/link";
import { INTL_TAGS } from "@/lib/i18n/config";
import { Tag } from "@/components/ui";
import { Globe, MapPin, Repeat } from "lucide-react";

/**
 * What you have coming, beside everything the product is guessing at.
 *
 * Discover opened on recommendations: eight strangers, then bunches, then
 * things happening. All of it inferred, and none of it something the member had
 * already decided to do. So somebody with three plans this week had to scroll
 * past the product's suggestions to reach their own commitments.
 *
 * This answers the only question a returning member actually has. It is the
 * difference between "what should I look at" and "what am I doing", which is
 * the difference the whole product is arguing for.
 *
 * ## Why it is shaped for a rail
 *
 * It used to be a full-width list with a 96px column of weekdays down the left,
 * sitting above the recommendations. It now lives in Discover's rail, where it
 * stays on screen while somebody reads through eight strangers instead of
 * scrolling away after the first one. A rail is about 320px, so the weekday
 * column had to go: the when is a line above the title rather than a column
 * beside it, and it is yellow, because yellow is what marks the "when" on every
 * activity card in the product and a member should not have to learn a second
 * convention for the same fact.
 *
 * ## Why it is short and finite
 *
 * Seven days, nothing else, and no more rows than a week can hold. It is not a
 * feed and must never become one: an empty week is a real answer and it says so
 * plainly rather than padding itself with suggestions to look busy. What fills
 * an empty week is the discovery sitting next to it.
 */

export interface WeekItem {
  id: string;
  title: string;
  startsAt: Date;
  mode: "ONLINE" | "OFFLINE";
  locationLabel: string | null;
  going: number;
  recurring: boolean;
  bunch: { slug: string; name: string } | null;
}

/**
 * "Thursday", or "Today" and "Tomorrow" where those are clearer.
 *
 * The weekday comes from `Intl` in the reader's language; the two words that
 * replace it are ours and come from the phrasebook. The locale tag is passed
 * in rather than left to the platform, because on the server "the platform"
 * is a container in UTC with no opinion about what language anybody reads.
 */
function dayLabel(
  date: Date,
  now: Date,
  locale: string,
  today: string,
  tomorrow: string,
): string {
  const startOf = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round(
    (startOf(date) - startOf(now)) / (24 * 60 * 60 * 1000),
  );
  if (days === 0) return today;
  if (days === 1) return tomorrow;
  return date.toLocaleDateString(locale, { weekday: "long" });
}

function timeLabel(date: Date, locale: string): string {
  return date.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function YourWeek({
  items,
  now = new Date(),
}: {
  items: WeekItem[];
  now?: Date;
}) {
  const { locale, t } = useLanguage();
  const tag = INTL_TAGS[locale];
  if (items.length === 0) return null;

  return (
    <section className="card-surface p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">{t("week.title")}</h2>
        <Link
          href="/activities"
          className="text-sm font-medium text-accent-ink underline underline-offset-2"
        >
          {t("week.allOfIt")}
        </Link>
      </div>

      <ol className="mt-4 space-y-2.5">
        {items.map((item) => (
          <li key={item.id}>
            {/*
              Sunken rather than raised. These rows sit inside a card already,
              and a second shadow inside the first reads as two cards that
              failed to line up; a warm inset reads as a list.
            */}
            <Link
              href={`/activities/${item.id}`}
              className="group block rounded-[var(--radius-control)] border border-line bg-canvas p-3.5 transition-colors hover:border-accent/40 hover:bg-surface-sunken"
            >
              <p className="text-xs font-semibold tracking-wide text-yellow-ink">
                {dayLabel(
                  item.startsAt,
                  now,
                  tag,
                  t("week.today"),
                  t("week.tomorrow"),
                )}
                <span className="tabular-nums"> · {timeLabel(item.startsAt, tag)}</span>
              </p>

              <p className="mt-1 flex items-center gap-1.5">
                <span className="truncate font-semibold tracking-tight group-hover:underline">
                  {item.title}
                </span>
                {item.recurring && (
                  <Tag tone="suggested" title={t("week.standing")}>
                    <Repeat size={10} aria-hidden />
                    {t("week.everyWeek")}
                  </Tag>
                )}
              </p>

              <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-muted">
                {item.mode === "ONLINE" ? (
                  <Globe size={12} aria-hidden className="shrink-0" />
                ) : (
                  <MapPin size={12} aria-hidden className="shrink-0" />
                )}
                <span className="truncate">
                  {item.mode === "ONLINE"
                    ? t("week.online")
                    : (item.locationLabel ?? t("week.inPerson"))}
                </span>
                <span aria-hidden>·</span>
                <span className="shrink-0">
                  {t("counts.going", { count: item.going })}
                </span>
              </p>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
