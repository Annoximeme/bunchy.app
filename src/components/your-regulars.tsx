"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, MapPin, Repeat } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { Button } from "@/components/ui";

/**
 * The things that come round again.
 *
 * Separate from "you're going to" on purpose. A one-off is something on your
 * calendar; a standing arrangement is something you are part of, and a list
 * that mixes them makes the second look like eight copies of the first. This is
 * the surface where somebody sees "this is my Thursday" as one row rather than
 * as however many occurrences happen to be materialised.
 *
 * ## What it counts, and what it refuses to
 *
 * The count is evenings the arrangement has had. It is never framed as a streak
 * and never shown as consecutive anything, because a streak is a thing you can
 * break, and the moment a number can be broken the product has handed somebody
 * a reason to turn up that is not the people. "Met 6 times" is a fact about a
 * group. "6 weeks in a row" is a liability you are carrying.
 */

const CADENCE_LABEL: Record<string, string> = {
  WEEKLY: "Every week",
  BIWEEKLY: "Every two weeks",
  MONTHLY: "Every month",
};

export interface Regular {
  id: string;
  title: string;
  cadence: string;
  nextAt: Date;
  mode: "ONLINE" | "OFFLINE";
  locationLabel: string | null;
  bunch: { slug: string; name: string } | null;
  members: number;
  occurrences: number;
  isOrganiser: boolean;
}

export function YourRegulars({ regulars }: { regulars: Regular[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (regulars.length === 0) return null;

  async function act(id: string, method: "DELETE" | "PATCH") {
    setBusy(id);
    setError(null);
    try {
      await api(`/api/activities/series/${id}`, { method });
      setConfirming(null);
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="mb-10">
      <h2 className="mb-1 text-lg font-bold tracking-tight">Your regulars</h2>
      <p className="mb-4 text-sm text-muted">
        Standing arrangements. You can miss one without leaving.
      </p>

      {error && (
        <p role="alert" className="mb-3 text-sm text-danger">
          {error}
        </p>
      )}

      <ul className="space-y-3">
        {regulars.map((regular) => (
          <li
            key={regular.id}
            className="rounded-squircle bg-surface p-5 shadow-pebble"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-semibold">
                  <Repeat size={14} aria-hidden className="text-purple-ink" />
                  {regular.title}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                  <span>{CADENCE_LABEL[regular.cadence] ?? regular.cadence}</span>
                  <span className="inline-flex items-center gap-1.5">
                    {regular.mode === "ONLINE" ? (
                      <Globe size={13} aria-hidden />
                    ) : (
                      <MapPin size={13} aria-hidden />
                    )}
                    {regular.mode === "ONLINE"
                      ? "Online"
                      : (regular.locationLabel ?? "In person")}
                  </span>
                  <span>
                    {regular.members}{" "}
                    {regular.members === 1 ? "person" : "people"}
                  </span>
                  {/* A count of evenings, never a streak. See the note above. */}
                  {regular.occurrences > 1 && (
                    <span>Met {regular.occurrences} times</span>
                  )}
                </p>
                <p className="mt-2 text-sm">
                  Next:{" "}
                  <time
                    dateTime={regular.nextAt.toISOString()}
                    className="font-medium"
                  >
                    {regular.nextAt.toLocaleDateString("en-GB", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </time>
                </p>
              </div>

              <div className="flex shrink-0 gap-2">
                {regular.isOrganiser ? (
                  confirming === regular.id ? (
                    <>
                      <Button
                        size="sm"
                        variant="danger"
                        loading={busy === regular.id}
                        onClick={() => act(regular.id, "PATCH")}
                      >
                        End it
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setConfirming(null)}
                      >
                        Keep it
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirming(regular.id)}
                    >
                      End it
                    </Button>
                  )
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={busy === regular.id}
                    onClick={() => act(regular.id, "DELETE")}
                  >
                    Step out
                  </Button>
                )}
              </div>
            </div>

            {confirming === regular.id && (
              <p className="mt-3 text-sm text-ink-soft">
                Ending it stops new evenings being scheduled. The ones that
                already happened stay, and so does anything already in the
                calendar.
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
