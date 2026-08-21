"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { activityWhen } from "@/lib/format";
import { lifecycleOf } from "@/server/modules/bunches/lifecycle";
import { NameMarks, SupporterRing } from "@/components/supporter/marks";
import { Avatar, Button, Chip, cn } from "@/components/ui";

/**
 * The three cards Discover is built from.
 *
 * Each one leads with *why* it is being shown. A recommendation you cannot
 * explain is a recommendation the member has no reason to trust, so the
 * highlights the scorer produced are rendered as first-class content rather
 * than hidden behind a tooltip.
 */

export interface PersonCardData {
  profileId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  age: number | null;
  locationLabel: string | null;
  score: number;
  highlights: string[];
  sharedInterests: string[];
  goals: string[];
  /** Optional: not every producer of this shape carries the marks yet. */
  staff?: boolean;
  supporter?: boolean;
}

export function PersonCard({ person }: { person: PersonCardData }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "sending" | "sent" | "dismissed">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    setState("sending");
    setError(null);
    try {
      await api("/api/connections", {
        method: "POST",
        json: { profileId: person.profileId },
      });
      setState("sent");
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
      setState("idle");
    }
  }

  async function dismiss() {
    setState("dismissed");
    setError(null);
    try {
      await api("/api/discover/feedback", {
        method: "POST",
        json: { profileId: person.profileId, signal: "NOT_INTERESTED" },
      });
      // Deliberately no `router.refresh()` here.
      //
      // Refreshing re-runs the page's recommendations, which drops this card
      // and reflows everything below it, under the cursor of somebody who has
      // just pressed a small button, and taking the undo with it. The card
      // stays in its own hole until the next natural navigation.
    } catch (cause) {
      setError(errorMessage(cause));
      setState("idle");
    }
  }

  async function undoDismiss() {
    setState("idle");
    setError(null);
    try {
      await api("/api/discover/feedback", {
        method: "DELETE",
        json: { profileId: person.profileId },
      });
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  /*
    A dismissal leaves its own footprint rather than vanishing.

    "Not for me" used to unmount the card outright: one mis-tap on a phone and
    a person was gone with nothing to say so and no way back. The grid also
    resnapped around the hole, which moves every remaining card under the
    finger that just tapped.

    The slot stays, at a fraction of the height, and holds the undo. It is the
    quietest possible acknowledgement that something happened.
  */
  if (state === "dismissed") {
    return (
      <div className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-dashed border-line px-5 py-4 text-sm">
        <span className="text-muted">
          You won&rsquo;t see {person.displayName} again.
        </span>
        <button
          type="button"
          onClick={undoDismiss}
          className="font-medium text-accent-ink underline underline-offset-2"
        >
          Undo
        </button>
      </div>
    );
  }

  const meta = [person.age, person.locationLabel].filter(Boolean).join(" · ");
  const [lead, ...rest] = person.highlights;

  return (
    <article className="card-surface flex flex-col p-5 transition-shadow duration-300 hover:shadow-[var(--shadow-lift)]">
      <div className="flex items-start gap-4">
        {/* Decorative: the person's name sits right beside this and links to
              the same profile, so exposing the avatar as a second link gave a
              screen reader an unnamed stop and a keyboard user two tabs to
              reach one place. */}
        <Link
          href={`/u/${person.username}`}
          className="shrink-0"
          aria-hidden
          tabIndex={-1}
        >
          <SupporterRing active={Boolean(person.supporter)}>
            <Avatar name={person.displayName} src={person.avatarUrl} size="lg" />
          </SupporterRing>
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="flex min-w-0 items-center gap-1.5">
                <Link
                  href={`/u/${person.username}`}
                  className="truncate font-semibold tracking-tight hover:underline"
                >
                  {person.displayName}
                </Link>
                <NameMarks staff={person.staff} supporter={person.supporter} />
              </span>
              {meta && <p className="truncate text-sm text-muted">{meta}</p>}
            </div>
          </div>

          {person.sharedInterests.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {person.sharedInterests.slice(0, 5).map((interest) => (
                <Chip key={interest}>{interest}</Chip>
              ))}
            </div>
          )}
        </div>
      </div>

      {/*
        The reason, where the percentage used to be.

        A number stamped on a person did three things and all of them worked
        against the product: it quantified people, on a page whose own About
        text spends six paragraphs refusing to; it invited comparison shopping,
        so the lowest card on the grid was never read; and it implied a
        precision the scorer does not have, because the gap between 74 and 77
        is noise wearing a decimal point.

        The reasons were always the honest part and they were always already
        written. The strongest one leads the card now, at a size that says it
        is the point, and the rest follow underneath.
      */}
      {lead && (
        <p className="mt-4 border-t border-line pt-4 font-medium leading-snug text-ink">
          {lead}
        </p>
      )}

      {rest.length > 0 && (
        <ul className={`space-y-1.5 ${lead ? "mt-2.5" : "mt-4 border-t border-line pt-4"}`}>
          {rest.map((highlight) => (
            /* Purple, because these lines are the one thing on the card the
               system worked out rather than the member wrote. */
            <li key={highlight} className="flex gap-2 text-sm text-ink-soft">
              <span aria-hidden className="text-purple-ink">
                ·
              </span>
              {highlight}
            </li>
          ))}
        </ul>
      )}

      {person.goals.length > 0 && (
        <p className="mt-3 text-sm text-muted">
          Looking for {person.goals.slice(0, 2).join(" · ").toLowerCase()}
        </p>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-5 flex items-center gap-2">
        {state === "sent" ? (
          <p className="text-sm font-medium text-positive">
            Request sent. You&rsquo;ll hear back here.
          </p>
        ) : (
          <>
            <Button onClick={connect} loading={state === "sending"} size="sm">
              Connect
            </Button>
            <Button variant="ghost" size="sm" onClick={dismiss}>
              Not for me
            </Button>
          </>
        )}
      </div>
    </article>
  );
}

export interface BunchCardData {
  id: string;
  slug: string;
  name: string;
  description: string;
  memberCount: number;
  maxMembers: number;
  locationLabel: string | null;
  interests: string[];
  score?: number;
  highlights?: string[];
  membershipStatus?: string | null;
  /** The next evening this bunch has, if the caller knows of one. */
  nextActivityAt?: Date | null;
  /** When its standing arrangement next comes round, if it has one. */
  nextSeriesAt?: Date | null;
  /** Evenings that have been and gone. */
  completedCount?: number;
}

const LIFECYCLE_TONE: Record<string, string> = {
  live: "text-accent-ink font-semibold",
  soon: "text-purple-ink font-medium",
  open: "text-muted",
  settled: "text-teal font-medium",
  quiet: "text-muted",
};

export function BunchCard({ bunch }: { bunch: BunchCardData }) {
  /*
    Where the bunch is in its life, worked out rather than stored.

    This used to be "N spots left" or "Full", which is one fact out of several
    and not usually the most useful one: a bunch with an evening on Thursday is
    a bunch with an evening on Thursday, whether or not it also has two spare
    seats. `lifecycleOf` picks whichever is actually worth saying, in that
    order, and degrades to the seat count when nothing else is known, so a
    caller that has not plumbed the extra facts through loses nothing.
  */
  const state = lifecycleOf(
    {
      memberCount: bunch.memberCount,
      maxMembers: bunch.maxMembers,
      nextActivityAt: bunch.nextActivityAt ?? null,
      nextSeriesAt: bunch.nextSeriesAt ?? null,
      completedCount: bunch.completedCount,
    },
  );

  return (
    <Link
      href={`/bunches/${bunch.slug}`}
      className="card-surface group flex flex-col p-5 transition-shadow duration-300 hover:shadow-[var(--shadow-lift)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold tracking-tight group-hover:underline">
            {bunch.name}
          </h3>
          <p className="text-sm text-muted">
            {bunch.memberCount} {bunch.memberCount === 1 ? "member" : "members"}
            {bunch.locationLabel && ` · ${bunch.locationLabel}`}
          </p>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-sm text-ink-soft">{bunch.description}</p>

      {/*
        Why you'd fit. The scorer has always produced these, five shared
        interests, same preferred group size, active this weekend, and this
        card accepted them in its props and then dropped them on the floor, so
        a bunch recommendation was a number with no argument behind it. The
        person card has rendered its equivalent from the start.
      */}
      {bunch.highlights && bunch.highlights.length > 0 && (
        <ul className="mt-3 space-y-1">
          {bunch.highlights.slice(0, 2).map((highlight) => (
            <li
              key={highlight}
              className="flex items-start gap-1.5 text-sm text-ink-soft"
            >
              <span aria-hidden className="mt-0.5 text-teal">
                ✓
              </span>
              {highlight}
            </li>
          ))}
        </ul>
      )}

      {bunch.interests.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {bunch.interests.slice(0, 4).map((interest) => (
            <Chip key={interest} tone="neutral">
              {interest}
            </Chip>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className={cn(LIFECYCLE_TONE[state.tone] ?? "text-muted")}>
          {state.label}
        </span>
        {bunch.membershipStatus === "ACTIVE" && (
          <Chip tone="positive">You&rsquo;re in</Chip>
        )}
        {bunch.membershipStatus === "REQUESTED" && <Chip>Request pending</Chip>}
        {bunch.membershipStatus === "INVITED" && <Chip tone="accent">Invited</Chip>}
      </div>
    </Link>
  );
}

export interface ActivityCardData {
  id: string;
  title: string;
  startsAt: string;
  mode: string;
  locationLabel: string | null;
  cityLabel: string | null;
  participantCount: number;
  maxParticipants: number;
  bunch: { id: string; slug: string; name: string } | null;
  highlights?: string[];
  viewerStatus?: string | null;
}

export function ActivityCard({ activity }: { activity: ActivityCardData }) {
  const spotsLeft = activity.maxParticipants - activity.participantCount;
  const where =
    activity.mode === "ONLINE"
      ? "Online"
      : (activity.locationLabel ?? activity.cityLabel ?? "Somewhere nearby");

  return (
    <Link
      href={`/activities/${activity.id}`}
      className="card-surface group flex items-start justify-between gap-4 p-5 transition-shadow duration-300 hover:shadow-[var(--shadow-lift)]"
    >
      <div className="min-w-0">
        {/* Yellow marks activities throughout the product, the "when" is the
            first thing you look for, and it is the same colour every time. */}
        <p className="text-sm font-medium text-yellow-ink">
          {activityWhen(activity.startsAt)}
        </p>
        <h3 className="mt-1 truncate font-semibold tracking-tight group-hover:underline">
          {activity.title}
        </h3>
        <p className="mt-0.5 truncate text-sm text-muted">
          {where}
          {activity.bunch && ` · ${activity.bunch.name}`}
        </p>
        {activity.highlights && activity.highlights.length > 0 && (
          <p className="mt-2 text-sm text-ink-soft">{activity.highlights[0]}</p>
        )}
      </div>

      <div className="shrink-0 text-right">
        <p className="text-sm font-medium">
          {activity.participantCount} going
        </p>
        <p className="text-xs text-muted">
          {spotsLeft > 0 ? `${spotsLeft} left` : "Waitlist"}
        </p>
        {activity.viewerStatus === "JOINED" && (
          <Chip tone="positive" className="mt-2">
            Going
          </Chip>
        )}
      </div>
    </Link>
  );
}
