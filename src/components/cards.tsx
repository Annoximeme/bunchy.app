"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { activityWhen } from "@/lib/format";
import {
  Avatar,
  Button,
  Chip,
  CompatibilityBadge,
  cn,
} from "@/components/ui";

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
    try {
      await api("/api/discover/feedback", {
        method: "POST",
        json: { profileId: person.profileId, signal: "NOT_INTERESTED" },
      });
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
      setState("idle");
    }
  }

  if (state === "dismissed") return null;

  const meta = [person.age, person.locationLabel].filter(Boolean).join(" · ");

  return (
    <article className="card-surface flex flex-col p-5 transition-shadow duration-300 hover:shadow-[var(--shadow-lift)]">
      <div className="flex items-start gap-4">
        <Link href={`/u/${person.username}`} className="shrink-0">
          <Avatar name={person.displayName} src={person.avatarUrl} size="lg" />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                href={`/u/${person.username}`}
                className="block truncate font-semibold tracking-tight hover:underline"
              >
                {person.displayName}
              </Link>
              {meta && <p className="truncate text-sm text-muted">{meta}</p>}
            </div>
            <CompatibilityBadge score={person.score} />
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

      {person.highlights.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t border-line pt-4">
          {person.highlights.map((highlight) => (
            /* Purple, because these lines are the one thing on the card the
               system inferred rather than the member wrote. */
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
            Request sent — you&rsquo;ll hear back here.
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
}

export function BunchCard({ bunch }: { bunch: BunchCardData }) {
  const spotsLeft = bunch.maxMembers - bunch.memberCount;

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
        {bunch.score !== undefined && <CompatibilityBadge score={bunch.score} />}
      </div>

      <p className="mt-3 line-clamp-2 text-sm text-ink-soft">{bunch.description}</p>

      {/*
        Why you'd fit. The scorer has always produced these — five shared
        interests, same preferred group size, active this weekend — and this
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
        <span className={cn(spotsLeft > 0 ? "text-muted" : "text-danger")}>
          {spotsLeft > 0
            ? `${spotsLeft} ${spotsLeft === 1 ? "spot" : "spots"} left`
            : "Full"}
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
        {/* Yellow marks activities throughout the product — the "when" is the
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
