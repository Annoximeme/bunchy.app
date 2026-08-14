"use client";

import { useState } from "react";
import Link from "next/link";
import { api, errorMessage } from "@/lib/api";
import { Avatar, Button, Card, Chip } from "@/components/ui";

/**
 * Surprise Me.
 *
 * One person at a time, with the reasons attached. A grid of unexpected matches
 * is a contradiction — the point is to make somebody consider one person they
 * would have scrolled past, and ten of them at once is a feed.
 *
 * "Not interested" only removes them from this session rather than writing a
 * rejection: the ordinary matcher already has feedback for that, and a
 * serendipity pass that trained itself away from difference would eventually
 * stop being one.
 */

interface SurpriseMatch {
  profileId: string;
  score: number;
  novelty: number;
  reasons: string[];
  sharedInterests: string[];
  complementaryInterests: string[];
  person: {
    username: string;
    displayName: string;
    avatarUrl: string | null;
    age: number | null;
    ageBand: string | null;
    locationLabel: string | null;
    bio: string | null;
    goals: string[];
  };
}

export function SurpriseMe() {
  const [match, setMatch] = useState<SurpriseMatch | null>(null);
  const [seen, setSeen] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exhausted, setExhausted] = useState(false);

  async function draw(excluding: string[]) {
    setPending(true);
    setError(null);
    try {
      const result = await api<{ match: SurpriseMatch | null }>("/api/surprise", {
        method: "POST",
        json: { exclude: excluding.slice(-20) },
      });
      if (!result.match) {
        setExhausted(true);
        setMatch(null);
        return;
      }
      setMatch(result.match);
      setSeen((previous) => [...previous, result.match!.profileId]);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  if (!match && !exhausted) {
    return (
      <Card className="text-center">
        <h2 className="text-lg font-semibold tracking-tight">
          Someone you wouldn&rsquo;t have found
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
          Discover ranks people by how much you have in common. This does the
          opposite on purpose — different interests, similar way of spending an
          evening.
        </p>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        <div className="mt-5">
          <Button onClick={() => draw(seen)} loading={pending}>
            Surprise me
          </Button>
        </div>
      </Card>
    );
  }

  if (exhausted) {
    return (
      <Card className="text-center">
        <h2 className="text-lg font-semibold tracking-tight">
          That is everyone for now
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
          There is nobody left who is both different enough to be a surprise and
          compatible enough to be worth one. More people nearby changes that
          faster than anything else.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link
            href="/start"
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-[var(--color-on-accent)]"
          >
            Start a bunch
          </Link>
          <Button
            variant="secondary"
            onClick={() => {
              setSeen([]);
              setExhausted(false);
              void draw([]);
            }}
          >
            Start again
          </Button>
        </div>
      </Card>
    );
  }

  const person = match!.person;

  return (
    <Card>
      <div className="flex flex-wrap items-start gap-5">
        <Avatar name={person.displayName} src={person.avatarUrl} size="xl" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <Link
                href={`/u/${person.username}`}
                className="text-xl font-semibold tracking-tight hover:underline"
              >
                {person.displayName}
              </Link>
              <p className="text-sm text-muted">
                {[person.age ?? person.ageBand, person.locationLabel]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-semibold tabular-nums text-purple-ink">
                {match!.score}%
              </p>
              <p className="text-xs text-muted">unexpected compatibility</p>
            </div>
          </div>

          {person.bio && (
            <p className="mt-3 text-sm text-ink-soft">{person.bio}</p>
          )}

          <ul className="mt-4 space-y-1.5">
            {match!.reasons.map((reason) => (
              <li key={reason} className="flex items-start gap-2 text-sm">
                <span aria-hidden className="mt-1 text-purple-ink">
                  ◆
                </span>
                <span className="text-ink-soft">{reason}</span>
              </li>
            ))}
          </ul>

          {(match!.sharedInterests.length > 0 ||
            match!.complementaryInterests.length > 0) && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {match!.sharedInterests.slice(0, 3).map((interest) => (
                <Chip key={interest}>{interest}</Chip>
              ))}
              {match!.complementaryInterests.slice(0, 3).map((interest) => (
                <Chip key={interest} tone="teal">
                  {interest}
                </Chip>
              ))}
            </div>
          )}

          {error && <p className="mt-3 text-sm text-danger">{error}</p>}

          <div className="mt-5 flex flex-wrap gap-2.5">
            <Link
              href={`/u/${person.username}`}
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-[var(--color-on-accent)]"
            >
              See {person.displayName.split(" ")[0]}
            </Link>
            <Button
              variant="secondary"
              onClick={() => draw(seen)}
              loading={pending}
            >
              Someone else
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
