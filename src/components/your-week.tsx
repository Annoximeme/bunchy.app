import { Link } from "@/components/link";
import { Tag } from "@/components/ui";
import { CalendarDays, Globe, MapPin, Repeat } from "lucide-react";

/**
 * What you have coming, above everything the product is guessing at.
 *
 * Discover opened on recommendations: eight strangers, then bunches, then
 * things happening. All of it inferred, and none of it something the member had
 * already decided to do. So somebody with three plans this week had to scroll
 * past the product's suggestions to reach their own commitments.
 *
 * This sits above all of it and answers the only question a returning member
 * actually has. It is the difference between "what should I look at" and "what
 * am I doing", which is the difference the whole product is arguing for.
 *
 * ## Why it is short and finite
 *
 * Seven days, nothing else, and no more rows than a week can hold. It is not a
 * feed and must never become one: an empty week is a real answer and it says so
 * plainly rather than padding itself with suggestions to look busy. What fills
 * an empty week is the discovery that already sits underneath.
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

/** "Thursday", or "Today" and "Tomorrow" where those are clearer. */
function dayLabel(date: Date, now: Date): string {
  const startOf = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round(
    (startOf(date) - startOf(now)) / (24 * 60 * 60 * 1000),
  );
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return date.toLocaleDateString("en-GB", { weekday: "long" });
}

function timeLabel(date: Date): string {
  return date.toLocaleTimeString("en-GB", {
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
  if (items.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-bold tracking-tight">Your week</h2>
        <Link
          href="/activities"
          className="text-sm font-medium text-accent-ink underline underline-offset-2"
        >
          All of it
        </Link>
      </div>

      <ol className="space-y-2.5">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={`/activities/${item.id}`}
              className="flex items-center gap-4 rounded-squircle bg-surface p-5 shadow-pebble transition-shadow hover:shadow-[var(--shadow-pebble-lift)]"
            >
              {/*
                The day is the anchor, not the title. Somebody scanning this is
                answering "when", and the column of weekdays is what makes that
                answerable without reading a word of the rest.
              */}
              <div className="w-24 shrink-0">
                <p className="font-bold tracking-tight">
                  {dayLabel(item.startsAt, now)}
                </p>
                <p className="text-sm tabular-nums text-muted">
                  {timeLabel(item.startsAt)}
                </p>
              </div>

              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate font-semibold">
                  {item.title}
                  {item.recurring && (
                    <Tag tone="suggested" title="Part of a standing arrangement">
                      <Repeat size={10} aria-hidden />
                      Every week
                    </Tag>
                  )}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    {item.mode === "ONLINE" ? (
                      <Globe size={13} aria-hidden />
                    ) : (
                      <MapPin size={13} aria-hidden />
                    )}
                    {item.mode === "ONLINE"
                      ? "Online"
                      : (item.locationLabel ?? "In person")}
                  </span>
                  <span>{item.going} going</span>
                  {item.bunch && <span className="truncate">{item.bunch.name}</span>}
                </p>
              </div>

              <CalendarDays
                size={18}
                aria-hidden
                className="hidden shrink-0 text-muted sm:block"
              />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
