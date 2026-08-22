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

/**
 * One-tap starts, weighted towards company rather than shared interest.
 *
 * The first three need nothing in common at all. Two strangers who share no
 * interest, no game and no conversation can still usefully be in the same room
 * at two in the afternoon, and that is the lowest bar anything in this product
 * clears. Everything else here needs at least a shared taste, which is a
 * constraint that has to be satisfied by a membership that does not exist yet.
 *
 * So they are first, and they are the reason this row exists: the fastest path
 * from "I am bored" to somebody else being present is not a recommendation, it
 * is a button that posts one of these.
 *
 * The window differs per preset because the shape of the thing differs. Company
 * while you work is an hour. "Anyone gaming tonight" is an evening.
 */
const PRESETS: Array<{ label: string; title: string; minutes: number }> = [
  { label: "Co-working hour", title: "Co-working hour, cameras off", minutes: 60 },
  { label: "Study session", title: "Study session, quiet company", minutes: 120 },
  { label: "Body doubling", title: "Working on something, want company", minutes: 60 },
  { label: "Gaming tonight", title: "Anyone gaming tonight?", minutes: 360 },
  { label: "Watch something", title: "Watch something together?", minutes: 180 },
  { label: "Just talk", title: "Anyone want to talk?", minutes: 120 },
];

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

export function OpenCalls({
  calls,
  around = 0,
  discordUrl,
}: {
  calls: OpenCall[];
  /** How many linked members are in a voice channel. A count, never names. */
  around?: number;
  discordUrl: string;
}) {
  const router = useRouter();
  const now = new Date();

  const [asking, setAsking] = useState(false);
  const [title, setTitle] = useState("");
  const [windowMinutes, setWindowMinutes] = useState("180");
  const [mode, setMode] = useState<"ONLINE" | "OFFLINE">("ONLINE");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function post(preset?: { title: string; minutes: number }) {
    setPending(preset ? preset.title : "new");
    setError(null);
    try {
      await api("/api/activities/quick", {
        method: "POST",
        json: {
          title: preset ? preset.title : title.trim(),
          windowMinutes: preset ? preset.minutes : Number(windowMinutes),
          // Presets are online, always. The whole reason they work at this
          // membership size is that they ask for nobody nearby.
          mode: preset ? "ONLINE" : mode,
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
            {/*
              The reverse link. Presence already flows from Discord into the
              count on this page; this is the sentence that tells somebody the
              room exists and how to walk into it. A count, never names, the
              same rule the rest of this board follows.
            */}
            {around > 0 && (
              <>
                {" "}
                <a
                  href={discordUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-accent-ink underline underline-offset-2"
                >
                  {around} in voice on Discord
                </a>{" "}
                now.
              </>
            )}
          </p>
        </div>
        {!asking && (
          <Button size="sm" onClick={() => setAsking(true)}>
            Ask for something
          </Button>
        )}
      </div>

      {/*
        One tap, no form. Somebody who opened this because they were bored
        should not have to compose a sentence before anything happens.
      */}
      {!asking && (
        <div className="mb-4 flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              disabled={pending !== null}
              onClick={() => post(preset)}
              className="rounded-full border border-line px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:border-ink-soft hover:text-ink disabled:opacity-50"
            >
              {pending === preset.title ? "Posting…" : preset.label}
            </button>
          ))}
        </div>
      )}

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
              onClick={() => post()}
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
