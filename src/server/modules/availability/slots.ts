import type { AvailabilityWindow } from "@/generated/prisma/enums";
import { offsetHours } from "@/server/modules/geo/timezone";

/**
 * Turning two people's "usually free" into actual times to vote on.
 *
 * ## Why this exists
 *
 * A plan needs candidate datetimes, and asking somebody to produce three of
 * them from nothing is the point at which most plans stop. Both people have
 * already answered the only question needed to guess well: which parts of a
 * week they are usually free. This proposes times from the overlap so the
 * first thing anybody sees is three real options rather than an empty date
 * picker.
 *
 * ## Why they are proposals and nothing more
 *
 * Nothing here writes, notifies, or commits. It produces a list somebody can
 * delete from, add to and ignore, which is the same rule the rest of the
 * planning code follows: the software may suggest a Thursday, and only a
 * person can decide there is a Thursday.
 *
 * ## The hours, and DST
 *
 * Windows are local ideas ("weekday evening"), so each candidate instant is
 * converted into each member's own local clock before it is tested. The offset
 * is read at the moment of proposing, which is the same simplification
 * `timezone.ts` makes and for the same reason: a plan two weeks out that lands
 * an hour off across a DST boundary is a plan somebody moves by an hour, and
 * projecting zone rules forward to avoid that would be a great deal of
 * machinery for one hour, twice a year.
 */

/** Local hours each window covers, as [start, end) on a 24-hour clock. */
const WINDOW_HOURS: Record<AvailabilityWindow, [number, number]> = {
  WEEKDAY_MORNING: [6, 12],
  WEEKDAY_AFTERNOON: [12, 18],
  WEEKDAY_EVENING: [18, 23],
  WEEKEND_MORNING: [6, 12],
  WEEKEND_AFTERNOON: [12, 18],
  WEEKEND_EVENING: [18, 23],
  // Wraps past midnight, and is the one window that belongs to every day
  // rather than to weekdays or weekends. Somebody who is up at one in the
  // morning is up at one in the morning on a Saturday too.
  LATE_NIGHT: [23, 30],
};

const HOUR_MS = 60 * 60 * 1000;

export interface FreeTime {
  windows: AvailabilityWindow[];
  /** IANA zone. Null is read as UTC, the same honest fallback as elsewhere. */
  timezone: string | null;
}

/** Local wall-clock facts about an instant, in one member's zone. */
function localAt(at: Date, timezone: string | null) {
  const shifted = new Date(at.getTime() + offsetHours(timezone, at) * HOUR_MS);
  return {
    hour: shifted.getUTCHours(),
    /** 0 is Sunday. */
    day: shifted.getUTCDay(),
    /** The local calendar date, for grouping proposals by day. */
    date: shifted.toISOString().slice(0, 10),
  };
}

function isWeekendDay(day: number): boolean {
  return day === 0 || day === 6;
}

/**
 * Whether this member said they are usually free at this moment.
 *
 * Pure, and the only place that reads a window's hours, so the two ways a
 * window can match, on its own day and after midnight on the next one, are
 * written once.
 */
export function isUsuallyFreeAt(free: FreeTime, at: Date): boolean {
  const { hour, day } = localAt(at, free.timezone);

  for (const window of free.windows) {
    const [start, end] = WINDOW_HOURS[window];
    const weekendWindow = window.startsWith("WEEKEND");
    const anyDay = window === "LATE_NIGHT";

    // The ordinary case: the hour falls inside the window on a day of the
    // right kind.
    if (
      hour >= start &&
      hour < Math.min(end, 24) &&
      (anyDay || weekendWindow === isWeekendDay(day))
    ) {
      return true;
    }

    // The window started yesterday and ran past midnight, so the day to test
    // is yesterday's, not this one's.
    if (end > 24 && hour < end - 24) {
      const yesterday = (day + 6) % 7;
      if (anyDay || weekendWindow === isWeekendDay(yesterday)) return true;
    }
  }

  return false;
}

export interface ProposedSlot {
  /** The hour it would start, on the hour. */
  startsAt: Date;
  /** True when it falls on a weekend for the person it is proposed to. */
  weekend: boolean;
}

export interface ProposeOptions {
  now?: Date;
  /** How many to return. Three is what the form shows. */
  count?: number;
  /**
   * How soon a proposal may be.
   *
   * Twelve hours by default, because a plan needs to survive somebody being
   * asleep. A slot two hours from now is not a plan, it is Bunchy Now, and
   * that already exists.
   */
  minimumNoticeHours?: number;
  /** How far ahead to look. */
  horizonDays?: number;
}

/**
 * The next few hours both people are usually free, at most one per day.
 *
 * One per day on purpose. Two people free every weekday evening would
 * otherwise produce four options that are all Tuesday, and a vote between four
 * versions of the same evening answers nothing.
 *
 * Returns an empty list rather than a guess when there is no overlap, or when
 * either of them never answered the availability question. The form treats
 * that as "no suggestions" and lets them type a time, which is the honest
 * outcome: proposing an evening we have no reason to think either of them is
 * free is worse than proposing none.
 */
export function proposeSlots(
  a: FreeTime,
  b: FreeTime,
  options: ProposeOptions = {},
): ProposedSlot[] {
  const {
    now = new Date(),
    count = 3,
    minimumNoticeHours = 12,
    horizonDays = 21,
  } = options;

  if (a.windows.length === 0 || b.windows.length === 0) return [];

  // From the next whole hour after the notice period.
  const first = new Date(
    Math.ceil((now.getTime() + minimumNoticeHours * HOUR_MS) / HOUR_MS) * HOUR_MS,
  );

  const slots: ProposedSlot[] = [];
  const daysTaken = new Set<string>();

  for (let step = 0; step < horizonDays * 24 && slots.length < count; step++) {
    const at = new Date(first.getTime() + step * HOUR_MS);

    // An hour both are free is not yet a slot: the hour after it has to work
    // too, or the proposal is "meet at 22:00 for the last hour of my evening".
    const nextHour = new Date(at.getTime() + HOUR_MS);
    if (!isUsuallyFreeAt(a, at) || !isUsuallyFreeAt(b, at)) continue;
    if (!isUsuallyFreeAt(a, nextHour) || !isUsuallyFreeAt(b, nextHour)) continue;

    // Grouped by the day of whoever is being proposed to first, which is the
    // person reading the form.
    const local = localAt(at, a.timezone);
    if (daysTaken.has(local.date)) continue;
    daysTaken.add(local.date);

    slots.push({ startsAt: at, weekend: isWeekendDay(local.day) });
  }

  return slots;
}
