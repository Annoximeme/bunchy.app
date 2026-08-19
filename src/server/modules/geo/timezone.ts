import type { AvailabilityWindow } from "@/generated/prisma/enums";

/**
 * Turning "weekday evening" into hours that two people can actually share.
 *
 * Availability is stored symbolically, which is the right way to ask the
 * question, nobody wants to fill in a calendar grid to sign up. But "weekday
 * evening" is a *local* idea, and the matcher was comparing the labels
 * directly. A member in Antwerp and a member in Tokyo both picking
 * WEEKDAY_EVENING scored as a perfect overlap while having no hour in common at
 * all, which is the sort of confident wrong answer that makes people stop
 * trusting a recommendation.
 *
 * So a window becomes a local hour range, the range is shifted into UTC by the
 * member's zone, and the overlap is measured there.
 *
 * **DST is deliberately ignored.** The offset is whatever the zone is at the
 * moment of scoring. Matching on "are these two free at the same time of day,
 * roughly" does not need an hour of precision six months out, and pretending it
 * does would mean recomputing every score twice a year.
 */

/** Local hours each window covers, as [start, end) on a 24-hour clock. */
const WINDOW_HOURS: Record<AvailabilityWindow, [number, number]> = {
  WEEKDAY_MORNING: [6, 12],
  WEEKDAY_AFTERNOON: [12, 18],
  WEEKDAY_EVENING: [18, 23],
  WEEKEND_MORNING: [6, 12],
  WEEKEND_AFTERNOON: [12, 18],
  WEEKEND_EVENING: [18, 23],
  LATE_NIGHT: [23, 30], // Wraps past midnight; normalized when converted.
};

export function isWeekendWindow(window: AvailabilityWindow): boolean {
  return window.startsWith("WEEKEND");
}

/**
 * The zone's current offset from UTC, in hours.
 *
 * Derived from `Intl` rather than a table, so it stays correct as zones change
 * their rules without shipping a new dependency. An unknown zone returns 0,
 * the same answer as having no zone at all, which is the honest fallback.
 */
export function offsetHours(timezone: string | null, at = new Date()): number {
  if (!timezone) return 0;
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "longOffset",
    });
    const part = formatter
      .formatToParts(at)
      .find((p) => p.type === "timeZoneName")?.value;
    // "GMT+09:00", "GMT-03:30", or plain "GMT".
    const match = part?.match(/GMT([+-])(\d{2}):(\d{2})/);
    if (!match) return 0;
    const sign = match[1] === "-" ? -1 : 1;
    return sign * (Number(match[2]) + Number(match[3]) / 60);
  } catch {
    return 0;
  }
}

/** A half-open hour range on a 24-hour UTC clock, possibly wrapping midnight. */
export interface UtcRange {
  start: number;
  end: number;
}

/** The window's local hours, expressed in UTC for the given zone. */
export function windowInUtc(
  window: AvailabilityWindow,
  timezone: string | null,
  at = new Date(),
): UtcRange[] {
  const [localStart, localEnd] = WINDOW_HOURS[window];
  const offset = offsetHours(timezone, at);
  const start = localStart - offset;
  const end = localEnd - offset;
  return splitAtMidnight(start, end);
}

/** Normalizes a possibly out-of-bounds range into 0-24 pieces. */
function splitAtMidnight(start: number, end: number): UtcRange[] {
  const length = end - start;
  const wrapped = ((start % 24) + 24) % 24;
  if (wrapped + length <= 24) return [{ start: wrapped, end: wrapped + length }];
  return [
    { start: wrapped, end: 24 },
    { start: 0, end: wrapped + length - 24 },
  ];
}

function overlapHours(a: UtcRange, b: UtcRange): number {
  return Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start));
}

/**
 * Hours per week two sets of windows genuinely share.
 *
 * Weekday and weekend windows are compared separately, being free on a
 * Tuesday evening and a Saturday evening is not an overlap, and the old
 * label-matching happened to get that right only because the labels differed.
 */
export function sharedHours(
  a: { windows: AvailabilityWindow[]; timezone: string | null },
  b: { windows: AvailabilityWindow[]; timezone: string | null },
  at = new Date(),
): number {
  let total = 0;

  for (const dayType of [false, true]) {
    const aRanges = a.windows
      .filter((w) => isWeekendWindow(w) === dayType)
      .flatMap((w) => windowInUtc(w, a.timezone, at));
    const bRanges = b.windows
      .filter((w) => isWeekendWindow(w) === dayType)
      .flatMap((w) => windowInUtc(w, b.timezone, at));

    // Days per week the overlap can repeat on.
    const days = dayType ? 2 : 5;
    for (const left of aRanges) {
      for (const right of bRanges) {
        total += overlapHours(left, right) * days;
      }
    }
  }

  return total;
}

export interface WindowOverlap {
  subject: AvailabilityWindow;
  candidate: AvailabilityWindow;
  hours: number;
}

/**
 * Which windows actually overlap, not which labels match.
 *
 * The distinction matters as soon as zones differ. A member in Brussels free on
 * weekday evenings and a member in Tokyo free late at night share real hours
 * (16:00-21:00 UTC against 14:00-21:00 UTC) while sharing no label, and two
 * people who both picked "weekday evening" in those cities share a label and no
 * hours at all. Describing an overlap by its labels gets both cases wrong.
 */
export function overlappingWindows(
  a: { windows: AvailabilityWindow[]; timezone: string | null },
  b: { windows: AvailabilityWindow[]; timezone: string | null },
  at = new Date(),
): WindowOverlap[] {
  const out: WindowOverlap[] = [];

  for (const subject of a.windows) {
    for (const candidate of b.windows) {
      if (isWeekendWindow(subject) !== isWeekendWindow(candidate)) continue;

      const days = isWeekendWindow(subject) ? 2 : 5;
      let hours = 0;
      for (const left of windowInUtc(subject, a.timezone, at)) {
        for (const right of windowInUtc(candidate, b.timezone, at)) {
          hours += overlapHours(left, right) * days;
        }
      }
      if (hours > 0) out.push({ subject, candidate, hours });
    }
  }

  return out.sort((x, y) => y.hours - x.hours);
}

/**
 * A plausible timezone for a country, used to backfill members who joined
 * before the field existed.
 *
 * Only countries with a single zone appear here. Guessing for the United States
 * or Australia would be worse than leaving it null, because a wrong zone is
 * confidently wrong where a null one simply falls back to UTC and stays
 * obviously unknown.
 */
const SINGLE_ZONE_COUNTRIES: Record<string, string> = {
  BE: "Europe/Brussels", NL: "Europe/Amsterdam", FR: "Europe/Paris",
  DE: "Europe/Berlin", GB: "Europe/London", IE: "Europe/Dublin",
  ES: "Europe/Madrid", IT: "Europe/Rome", AT: "Europe/Vienna",
  CH: "Europe/Zurich", SE: "Europe/Stockholm", NO: "Europe/Oslo",
  DK: "Europe/Copenhagen", FI: "Europe/Helsinki", PL: "Europe/Warsaw",
  CZ: "Europe/Prague", PT: "Europe/Lisbon", GR: "Europe/Athens",
  JP: "Asia/Tokyo", KR: "Asia/Seoul", SG: "Asia/Singapore",
  IN: "Asia/Kolkata", NZ: "Pacific/Auckland", ZA: "Africa/Johannesburg",
};

export function timezoneForCountry(countryCode: string | null): string | null {
  if (!countryCode) return null;
  return SINGLE_ZONE_COUNTRIES[countryCode.toUpperCase()] ?? null;
}

/** Whether a string is a timezone this runtime recognises. */
export function isValidTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}
