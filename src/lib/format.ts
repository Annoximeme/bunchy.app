import { INTL_TAGS, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Translate } from "@/lib/i18n/translate";

/**
 * Display formatting.
 *
 * All of these take an explicit `now` where it matters so they can be tested,
 * and none of them ever render a countdown or an "only 2 hours left", urgency
 * framing is a pressure tactic, and this product does not use one.
 *
 * ## Why they are built rather than called
 *
 * A date has two halves and they come from different places. The numbers, the
 * weekday, the month, the 24-hour clock, belong to `Intl`, which knows more
 * about how Dutch writes a date than we ever will. The words around them,
 * "just now", "Today", are ours and live in the phrasebook.
 *
 * So there is no `relativeTime(date)` any more: there is a set of formatters
 * built for one language and used for as long as that language is on screen.
 * `useFormats()` in a client component, `getFormats()` in a server one. The
 * alternative was passing a locale and a translator into every call, which is
 * two extra arguments at nineteen call sites and one of them forgotten.
 *
 * The locale is passed explicitly rather than left to the platform, because on
 * the server the platform is a container running in UTC with no opinion about
 * who is reading.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export interface Formats {
  /** "just now", "5m ago", "3d ago", "12 Mar". */
  relativeTime(value: string | Date, now?: Date): string;
  /** "Tonight · 20:00", "Saturday · 14:00", "12 Mar · 19:30". */
  activityWhen(value: string | Date, now?: Date): string;
  /** The clock time alone, for a message bubble. */
  messageTime(value: string | Date): string;
  /** "Today", "Yesterday", "Thursday 12 Mar", for a day divider. */
  dayLabel(value: string | Date, now?: Date): string;
  /** "7 September 2026", for a date that is spelled out in a sentence. */
  longDate(value: string | Date): string;
  /** "20:00" for later today, "Sat 14:00" for another day. */
  untilTime(value: string | Date, now?: Date): string;
}

export function createFormats(
  locale: Locale,
  t: Translate<Dictionary>,
): Formats {
  const tag = INTL_TAGS[locale];
  const asDate = (value: string | Date) =>
    typeof value === "string" ? new Date(value) : value;
  // `hour12: false` as well as a 24-hour locale, because the locale is a
  // default and this is a rule: the app's own copy says "20:00", and a clock
  // that disagreed with the sentence next to it would be worse than either.
  const clock = (date: Date) =>
    date.toLocaleTimeString(tag, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  const shortDate = (date: Date) =>
    date.toLocaleDateString(tag, { day: "numeric", month: "short" });

  return {
    relativeTime(value, now = new Date()) {
      const date = asDate(value);
      const diff = now.getTime() - date.getTime();

      if (diff < MINUTE) return t("time.justNow");
      if (diff < HOUR)
        return t("time.minutesAgo", { count: Math.floor(diff / MINUTE) });
      if (diff < DAY) return t("time.hoursAgo", { count: Math.floor(diff / HOUR) });
      if (diff < 7 * DAY) return t("time.daysAgo", { count: Math.floor(diff / DAY) });

      return shortDate(date);
    },

    activityWhen(value, now = new Date()) {
      const date = asDate(value);
      const time = clock(date);

      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      const days = Math.floor((date.getTime() - startOfToday.getTime()) / DAY);

      if (days < 0) return `${shortDate(date)} · ${time}`;
      if (days === 0) return `${t("time.today")} · ${time}`;
      if (days === 1) return `${t("time.tomorrow")} · ${time}`;
      if (days < 7) {
        return `${date.toLocaleDateString(tag, { weekday: "long" })} · ${time}`;
      }

      return `${shortDate(date)} · ${time}`;
    },

    messageTime(value) {
      return clock(asDate(value));
    },

    longDate(value) {
      return asDate(value).toLocaleDateString(tag, {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    },

    /*
      When a status runs out, said the way a person would.

      The clock alone if it is still today, the weekday in front of it if it is
      not, which is the shape "until 23:00" and "until Sat 14:00" need. It is
      here rather than inline in the component because the component was
      calling `toLocaleString` with no locale at all: an English reader on an
      American browser was told a status lasted "until Fri 02:43 AM", two cards
      below an activity at "20:00", and a Dutch reader got an English weekday.
    */
    untilTime(value, now = new Date()) {
      const date = asDate(value);
      const time = clock(date);
      if (date.toDateString() === now.toDateString()) return time;
      return `${date.toLocaleDateString(tag, { weekday: "short" })} ${time}`;
    },

    dayLabel(value, now = new Date()) {
      const date = asDate(value);
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      const days = Math.floor((date.getTime() - startOfToday.getTime()) / DAY);

      if (days === 0) return t("time.today");
      if (days === -1) return t("time.yesterday");
      return date.toLocaleDateString(tag, {
        weekday: "long",
        day: "numeric",
        month: "short",
      });
    },
  };
}
