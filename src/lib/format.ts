/**
 * Display formatting.
 *
 * All of these take an explicit `now` where it matters so they can be tested,
 * and none of them ever render a countdown or an "only 2 hours left" — urgency
 * framing is a pressure tactic, and this product does not use one.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function relativeTime(value: string | Date, now: Date = new Date()): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const diff = now.getTime() - date.getTime();

  if (diff < MINUTE) return "just now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d ago`;

  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** "Tonight · 20:00", "Saturday · 14:00", "12 Mar · 19:30". */
export function activityWhen(
  value: string | Date,
  now: Date = new Date(),
): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const time = date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const days = Math.floor((date.getTime() - startOfToday.getTime()) / DAY);

  if (days < 0) return `${date.toLocaleDateString(undefined, { day: "numeric", month: "short" })} · ${time}`;
  if (days === 0) return `Today · ${time}`;
  if (days === 1) return `Tomorrow · ${time}`;
  if (days < 7) {
    return `${date.toLocaleDateString(undefined, { weekday: "long" })} · ${time}`;
  }

  return `${date.toLocaleDateString(undefined, { day: "numeric", month: "short" })} · ${time}`;
}

export function messageTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function dayLabel(value: string | Date, now: Date = new Date()): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const days = Math.floor((date.getTime() - startOfToday.getTime()) / DAY);

  if (days === 0) return "Today";
  if (days === -1) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}
