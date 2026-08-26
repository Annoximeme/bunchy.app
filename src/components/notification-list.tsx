"use client";

import { Link, useFormats } from "@/components/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { Button, ErrorNotice, cn } from "@/components/ui";

/**
 * The notification list.
 *
 * Read state is changed by the member, never by the page. Opening this screen
 * does not silently mark everything read, following a notification marks that
 * one, and there is an explicit "mark all read". A screen that clears itself on
 * sight is convenient for the unread badge and useless to someone who opened it
 * to remember what they still had to answer.
 */

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  linkPath: string | null;
  readAt: string | null;
  createdAt: string;
}

export function NotificationList({
  initial,
}: {
  initial: NotificationItem[];
}) {
  const { dayLabel, relativeTime } = useFormats();
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unread = items.filter((n) => n.readAt === null).length;

  async function markOne(id: string) {
    setItems((prev) =>
      prev.map((n) =>
        n.id === id && n.readAt === null
          ? { ...n, readAt: new Date().toISOString() }
          : n,
      ),
    );
    try {
      await api(`/api/notifications/${id}`, { method: "PATCH" });
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  async function markAll() {
    setPending(true);
    setError(null);
    try {
      await api("/api/notifications", { method: "PATCH" });
      const now = new Date().toISOString();
      setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? now })));
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  // Day separators derived before render rather than by mutating a variable
  // inside the map, which would be reassignment during render.
  const rows = items.map((item, index) => {
    const day = dayLabel(item.createdAt);
    const previous = items[index - 1];
    return {
      item,
      day,
      showDay: !previous || dayLabel(previous.createdAt) !== day,
    };
  });

  return (
    <div className="space-y-4">
      {error && <ErrorNotice message={error} />}

      {unread > 0 && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted">
            {unread} unread
          </p>
          <Button variant="ghost" size="sm" loading={pending} onClick={markAll}>
            Mark all as read
          </Button>
        </div>
      )}

      <ul className="space-y-2">
        {rows.map(({ item, day, showDay }) => {
          const unreadItem = item.readAt === null;

          const inner = (
            <div
              className={cn(
                "card-surface flex items-start gap-3 p-4 transition-shadow",
                item.linkPath && "hover:shadow-[var(--shadow-lift)]",
                unreadItem && "border-accent/40",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "mt-1.5 size-2 shrink-0 rounded-full",
                  unreadItem ? "bg-accent" : "bg-transparent",
                )}
              />
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-sm",
                    unreadItem ? "font-semibold text-ink" : "text-ink-soft",
                  )}
                >
                  {item.title}
                  {unreadItem && <span className="sr-only"> (unread)</span>}
                </p>
                {item.body && (
                  <p className="mt-0.5 text-sm text-muted">{item.body}</p>
                )}
                <p className="mt-1 text-xs text-muted">
                  {relativeTime(item.createdAt)}
                </p>
              </div>

              {unreadItem && !item.linkPath && (
                <button
                  type="button"
                  onClick={() => markOne(item.id)}
                  className="shrink-0 text-xs text-accent-ink underline underline-offset-2"
                >
                  Mark read
                </button>
              )}
            </div>
          );

          return (
            <li key={item.id}>
              {showDay && (
                <p className="px-1 pb-2 pt-3 text-xs font-medium text-muted">
                  {day}
                </p>
              )}
              {item.linkPath ? (
                <Link
                  href={item.linkPath}
                  onClick={() => {
                    if (unreadItem) void markOne(item.id);
                  }}
                  className="block"
                >
                  {inner}
                </Link>
              ) : (
                inner
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
