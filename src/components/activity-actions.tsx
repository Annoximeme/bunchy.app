"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { Button, ErrorNotice, Select } from "@/components/ui";
import { Announce } from "@/components/live-region";

/**
 * Join, waitlist, or pull out.
 *
 * ## Why this answers before the server does
 *
 * "Count me in" used to wait for a round trip and then a `router.refresh()`,
 * which re-renders the whole server tree, before the button admitted anything
 * had happened. On a phone on mobile data that is most of a second of a button
 * that looks broken, on the single most-pressed control in the product.
 *
 * So the button changes immediately and the request runs underneath it. The
 * optimistic value is cleared the moment the real one arrives, by watching the
 * prop rather than by guessing at a duration, and it is put back to the truth
 * if the request fails, alongside a message saying why. Optimism without a
 * rollback is just a lie told quickly.
 */
export function ActivityJoinButton({
  activityId,
  viewerStatus,
  spotsLeft,
  isOrganizer,
  status,
  viewerGuests,
}: {
  activityId: string;
  viewerStatus: string | null;
  spotsLeft: number;
  isOrganizer: boolean;
  status: string;
  /** How many people this member is already bringing. */
  viewerGuests: number;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [guests, setGuests] = useState(viewerGuests);
  // `undefined` means "no opinion, show the server's answer". `null` is a real
  // optimistic value, the one that means not going, so the two cannot share.
  const [optimistic, setOptimistic] = useState<string | null | undefined>(undefined);

  // The refresh landed and the server now agrees, or disagrees. Either way its
  // answer is the true one from here on, so the optimistic guess is dropped.
  //
  // Adjusted during render rather than in an effect, which is React's own
  // advice for state derived from a changed prop: an effect would render the
  // stale guess once, then immediately render again, and the person watching
  // would see the button flicker back and forth.
  const [lastFromServer, setLastFromServer] = useState(viewerStatus);
  if (lastFromServer !== viewerStatus) {
    setLastFromServer(viewerStatus);
    setOptimistic(undefined);
  }

  const shownStatus = optimistic === undefined ? viewerStatus : optimistic;

  async function act(
    fn: () => Promise<unknown>,
    next: string | null,
    said: string,
  ) {
    setPending(true);
    setError(null);
    setOptimistic(next);
    setAnnouncement(said);
    try {
      await fn();
      router.refresh();
    } catch (cause) {
      setOptimistic(undefined);
      setAnnouncement("");
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  if (status === "CANCELLED") {
    return <p className="text-sm font-medium text-danger">This was cancelled.</p>;
  }

  const joining = spotsLeft > 0 ? "JOINED" : "WAITLISTED";

  return (
    <div className="space-y-2">
      {error && <ErrorNotice message={error} />}
      <Announce message={announcement} />

      {isOrganizer ? (
        confirmCancel ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-ink-soft">
              Cancel this? Everyone going will be told.
            </span>
            <Button
              variant="danger"
              size="sm"
              loading={pending}
              onClick={() =>
                act(
                  () => api(`/api/activities/${activityId}`, { method: "DELETE" }),
                  null,
                  "Activity cancelled. Everyone going has been told.",
                )
              }
            >
              Cancel it
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmCancel(false)}>
              Keep it
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirmCancel(true)}>
            Cancel activity
          </Button>
        )
      ) : shownStatus === "JOINED" || shownStatus === "WAITLISTED" ? (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-positive">
            {shownStatus === "JOINED" ? "You're going" : "You're on the waitlist"}
          </span>
          <Button
            variant="ghost"
            size="sm"
            loading={pending}
            onClick={() =>
              act(
                () =>
                  api(`/api/activities/${activityId}/participation`, {
                    method: "DELETE",
                  }),
                null,
                "You are no longer going.",
              )
            }
          >
            Can&rsquo;t make it
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            loading={pending}
            onClick={() =>
              act(
                () =>
                  api(`/api/activities/${activityId}/participation`, {
                    method: "POST",
                    json: { guests },
                  }),
                joining,
                joining === "JOINED"
                  ? "You're going. It's in your week now."
                  : "You're on the waitlist. We'll tell you if a spot opens.",
              )
            }
          >
            {spotsLeft > 0 ? "Count me in" : "Join the waitlist"}
          </Button>

          {/*
            Beside the button rather than behind a second step, because a
            first evening with strangers is the one most people would rather
            not turn up to alone, and asking afterwards is asking too late.

            Guests are a count and never a name: they have no account here and
            nothing about them is ours to store.
          */}
          <label className="flex items-center gap-2 text-sm text-muted">
            Bringing
            {/*
              `w-auto` here never took effect: `Select` brings its own `w-full`
              and the two sat side by side in the class list, where the winner
              is whichever Tailwind emitted last rather than whichever was
              written last. Overriding the width property itself is the one
              spelling that cannot lose the argument, and a dropdown holding
              the word "nobody" should be as wide as the word.
            */}
            <Select
              value={String(guests)}
              onChange={(event) => setGuests(Number(event.target.value))}
              style={{ width: "auto" }}
              className="py-1.5 pl-3 pr-8 text-sm"
            >
              <option value="0">nobody</option>
              <option value="1">1 person</option>
              <option value="2">2 people</option>
              <option value="3">3 people</option>
            </Select>
          </label>
        </div>
      )}
    </div>
  );
}
