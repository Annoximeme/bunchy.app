import type { ActivityView } from "@/server/modules/activities/service";

/**
 * An activity as an iCalendar event.
 *
 * "Actually doing things together" is the product's whole thesis, and a plan
 * that never reaches someone's calendar is a plan they will be reminded of by
 * nothing. This is the cheapest possible bridge to the place people already
 * keep their evenings.
 *
 * Written by hand rather than pulled from a library: the format is a few
 * hundred bytes, the escaping rules are four characters long, and a dependency
 * that renders text is a dependency that can be compromised into rendering
 * other text.
 */

/** RFC 5545 §3.3.5. Always UTC, so no VTIMEZONE block is needed. */
function icsDate(iso: string): string {
  return `${new Date(iso).toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
}

/**
 * RFC 5545 §3.3.11. Backslash first — escaping it after the others would
 * escape the backslashes they just introduced.
 */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * RFC 5545 §3.1: lines are folded at 75 octets, continued with a leading
 * space. Counted in bytes rather than characters, because a description with an
 * emoji in it is longer than it looks and an over-long line is the kind of
 * thing one calendar client tolerates and the next one rejects.
 */
function fold(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;

  const parts: string[] = [];
  let start = 0;
  while (start < bytes.length) {
    // 74 for continuation lines, which carry a leading space.
    const limit = start === 0 ? 75 : 74;
    let end = Math.min(start + limit, bytes.length);

    // Never split a multi-byte character: back off until the next byte is not a
    // continuation byte (10xxxxxx).
    while (end < bytes.length && (bytes[end]! & 0xc0) === 0x80) end -= 1;

    parts.push(
      (start === 0 ? "" : " ") + bytes.subarray(start, end).toString("utf8"),
    );
    start = end;
  }
  return parts.join("\r\n");
}

/** Two hours, when an activity has no stated end. Long enough to be useful. */
const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000;

export function toICalendar(
  activity: ActivityView,
  options: { origin: string; now?: Date },
): string {
  const now = options.now ?? new Date();
  const endsAt =
    activity.endsAt ??
    new Date(
      new Date(activity.startsAt).getTime() + DEFAULT_DURATION_MS,
    ).toISOString();

  // Online activities point at wherever they happen — but `onlineUrl` is null
  // for anyone who has not joined, so this never leaks a meeting link into a
  // calendar file. Offline ones carry the venue label, which is venue-level by
  // construction and never an address.
  const location =
    activity.mode === "ONLINE"
      ? (activity.onlineUrl ?? "Online")
      : (activity.locationLabel ?? activity.cityLabel ?? "");

  const url = `${options.origin}/activities/${activity.id}`;

  const description = [
    activity.description,
    "",
    `Organised by ${activity.organizer.displayName} on Bunchy.`,
    url,
  ].join("\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Bunchy//Activities//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    // Stable, so re-downloading updates the existing entry rather than adding a
    // second copy of the same evening.
    `UID:activity-${activity.id}@bunchy.app`,
    `DTSTAMP:${icsDate(now.toISOString())}`,
    `DTSTART:${icsDate(activity.startsAt)}`,
    `DTEND:${icsDate(endsAt)}`,
    `SUMMARY:${escapeText(activity.title)}`,
    `DESCRIPTION:${escapeText(description)}`,
    ...(location ? [`LOCATION:${escapeText(location)}`] : []),
    `URL:${escapeText(url)}`,
    `STATUS:${activity.status === "CANCELLED" ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  // CRLF is required, not stylistic — some clients reject bare LF outright.
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** A filename that survives a download folder: no spaces, no punctuation. */
export function calendarFilename(activity: ActivityView): string {
  const slug =
    activity.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "activity";
  return `bunchy-${slug}.ics`;
}
