"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, MapPin } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { Avatar, Button, Input, Select } from "@/components/ui";

/**
 * Open calls: asking, and answering.
 *
 * The board above this says who is around. This is the part where somebody
 * actually says the thing, and the difference matters: a status is a fact about
 * you that other people have to act on one at a time, and a call is an offer
 * with a slot count that anybody can simply take.
 *
 * ## Why the form is this short
 *
 * Somebody making one of these is bored right now. Every field is a reason to
 * close the app instead, so it is one line and two dropdowns, and everything
 * else is inferred. There is no description, because a description is a
 * paragraph you write instead of going and doing the thing.
 *
 * ## Why it says when it closes
 *
 * The window is stated on the form and on every card, because the whole
 * bargain of a quick call is that it goes away on its own. Somebody answering
 * one needs to know it is still true, and somebody posting one needs to know
 * they are not leaving something lying around. An offer with no stated end is
 * how a board fills with evenings that already happened.
 */

const WINDOWS: Array<[number, string]> = [
  [60, "for the next hour"],
  [180, "for the next 3 hours"],
  [360, "for the next 6 hours"],
  [720, "for the rest of the day"],
];

export interface OpenCall {
  id: string;
  title: string;
  startsAt: Date;
  expiresAt: Date;
  mode: "ONLINE" | "OFFLINE";
  locationLabel: string | null;
  going: number;
  spotsLeft: number;
  organizer: { username: string; displayName: string; avatarUrl: string | null };
}

/** "closes in 40 minutes", which is the only thing anybody needs from the date. */
function closesIn(expiresAt: Date, now: Date): string {
  const minutes = Math.round((expiresAt.getTime() - now.getTime()) / 60_000);
  if (minutes <= 1) return "closing now";
  if (minutes < 60) return `closes in ${minutes} min`;
  const hours = Math.round(minutes / 60);
  return `closes in ${hours} ${hours === 1 ? "hour" : "hours"}`;
}

export function OpenCalls({ calls }: { calls: OpenCall[] }) {
  const router = useRouter();
  const now = new Date();

  const [asking, setAsking] = useState(false);
  const [title, setTitle] = useState("");
  const [windowMinutes, setWindowMinutes] = useState("180");
  const [mode, setMode] = useState<"ONLINE" | "OFFLINE">("ONLINE");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function post() {
    setPending("new");
    setError(null);
    try {
      await api("/api/activities/quick", {
        method: "POST",
        json: {
          title: title.trim(),
          windowMinutes: Number(windowMinutes),
          mode,
        },
      });
      setTitle("");
      setAsking(false);
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(null);
    }
  }

  async function join(id: string) {
    setPending(id);
    setError(null);
    try {
      await api(`/api/activities/${id}/participation`, { method: "POST" });
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="mb-8">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Open calls</h2>
          <p className="text-sm text-muted">
            Somebody asking, right now. They close on their own.
          </p>
        </div>
        {!asking && (
          <Button size="sm" onClick={() => setAsking(true)}>
            Ask for something
          </Button>
        )}
      </div>

      {error && (
        <p role="alert" className="mb-3 text-sm text-danger">
          {error}
        </p>
      )}

      {asking && (
        <div className="mb-4 rounded-squircle bg-surface p-5 shadow-pebble">
          <label className="block">
            <span className="text-sm font-medium text-ink">
              What do you fancy doing?
            </span>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              autoFocus
              maxLength={100}
              placeholder="Anyone up for Helldivers?"
              className="mt-1.5"
            />
          </label>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-ink">Stays open</span>
              <Select
                value={windowMinutes}
                onChange={(event) => setWindowMinutes(event.target.value)}
                className="mt-1.5"
              >
                {WINDOWS.map(([minutes, label]) => (
                  <option key={minutes} value={minutes}>
                    {label}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink">Where</span>
              <Select
                value={mode}
                onChange={(event) =>
                  setMode(event.target.value as "ONLINE" | "OFFLINE")
                }
                className="mt-1.5"
              >
                <option value="ONLINE">Online</option>
                <option value="OFFLINE">In person</option>
              </Select>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              loading={pending === "new"}
              disabled={title.trim().length < 3}
              onClick={post}
            >
              Ask
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAsking(false)}>
              Never mind
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted">
            If nobody takes it up before it closes, it goes away quietly. Nobody
            is told you asked.
          </p>
        </div>
      )}

      {calls.length === 0 ? (
        // A path forward rather than "no results". The point of this surface is
        // that the answer to an empty board is to be the one who asks.
        <p className="rounded-squircle bg-surface p-5 text-[15px] text-ink-soft shadow-pebble">
          Nobody has asked for anything in the last few hours.{" "}
          <button
            type="button"
            onClick={() => setAsking(true)}
            className="font-semibold text-accent-ink underline underline-offset-2"
          >
            Be the one who does
          </button>
          .
        </p>
      ) : (
        <ul className="space-y-3">
          {calls.map((call) => (
            <li
              key={call.id}
              className="flex flex-wrap items-center gap-4 rounded-squircle bg-surface p-5 shadow-pebble"
            >
              <Avatar
                name={call.organizer.displayName}
                src={call.organizer.avatarUrl}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{call.title}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                  <span>{call.organizer.displayName}</span>
                  <span className="inline-flex items-center gap-1.5">
                    {call.mode === "ONLINE" ? (
                      <Globe size={13} aria-hidden />
                    ) : (
                      <MapPin size={13} aria-hidden />
                    )}
                    {call.mode === "ONLINE"
                      ? "Online"
                      : (call.locationLabel ?? "In person")}
                  </span>
                  <span>{call.going} going</span>
                  <span className="font-medium text-accent-ink">
                    {closesIn(call.expiresAt, now)}
                  </span>
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                loading={pending === call.id}
                disabled={call.spotsLeft === 0}
                onClick={() => join(call.id)}
              >
                {call.spotsLeft === 0 ? "Full" : "I'm in"}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
