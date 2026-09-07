"use client";

import { useState } from "react";
import { useLanguage } from "@/components/link";
import { api, errorMessage } from "@/lib/api";
import { Card, ErrorNotice, Select } from "@/components/ui";
import { INTL_TAGS } from "@/lib/i18n/config";

/**
 * The one email nobody asked for individually, and the switch that decides it.
 *
 * ## Why a day and an hour rather than a toggle
 *
 * "Sunday evening" and "Monday morning" are different products: one is
 * deciding what to do with a weekend, the other is planning a week. A member
 * knows which they are, and a toggle would make that choice for them and get
 * it wrong for half of them.
 *
 * ## Why it says what will not be in it
 *
 * The description is the promise: things people are waiting on, things they
 * already decided to do, and nothing else. That sentence is what makes it
 * possible to turn this on without wondering what it will turn into, and it
 * is enforced in `digest.ts` rather than only written here.
 */
export function WeeklyDigest({
  initialDay,
  initialHour,
}: {
  initialDay: number | null;
  initialHour: number | null;
}) {
  const { locale, t } = useLanguage();
  const [day, setDay] = useState<number | null>(initialDay);
  const [hour, setHour] = useState<number>(initialHour ?? 18);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const weekdays = weekdayNames(INTL_TAGS[locale]);

  async function save(nextDay: number | null, nextHour: number) {
    setSaving(true);
    setError(null);
    const previous = day;
    setDay(nextDay);
    setHour(nextHour);
    try {
      await api("/api/notifications/digest", {
        method: "PATCH",
        json: { day: nextDay, hour: nextDay === null ? null : nextHour },
      });
    } catch (cause) {
      setDay(previous);
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      {error && <ErrorNotice message={error} />}

      <h3 className="text-lg font-semibold tracking-tight">{t("digest.title")}</h3>
      <p className="mt-1 text-sm text-muted">{t("digest.body")}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Select
          aria-label={t("digest.day")}
          value={day === null ? "" : String(day)}
          disabled={saving}
          onChange={(event) =>
            save(event.target.value === "" ? null : Number(event.target.value), hour)
          }
          className="w-auto"
        >
          <option value="">{t("digest.never")}</option>
          {weekdays.map((name, index) => (
            <option key={name} value={index}>
              {name}
            </option>
          ))}
        </Select>

        {day !== null && (
          <Select
            aria-label={t("digest.hour")}
            value={String(hour)}
            disabled={saving}
            onChange={(event) => save(day, Number(event.target.value))}
            className="w-auto"
          >
            {Array.from({ length: 24 }, (_, value) => (
              <option key={value} value={value}>
                {String(value).padStart(2, "0")}:00
              </option>
            ))}
          </Select>
        )}
      </div>

      {day !== null && (
        <p className="mt-2 text-xs text-muted">{t("digest.quiet")}</p>
      )}
    </Card>
  );
}

/**
 * Weekday names from the platform, indexed the way `Date.getUTCDay` counts, so
 * the value stored is the value the job compares against with no translation
 * table in between.
 */
function weekdayNames(tag: string): string[] {
  const format = new Intl.DateTimeFormat(tag, { weekday: "long" });
  // 4 January 1970 was a Sunday.
  return Array.from({ length: 7 }, (_, index) =>
    format.format(new Date(Date.UTC(1970, 0, 4 + index))),
  );
}
