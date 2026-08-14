"use client";

import { useState } from "react";
import Link from "next/link";
import { api, errorMessage } from "@/lib/api";
import { Button, Card, Chip, cn } from "@/components/ui";
import { COST_LABELS, type ActivityIdea, type Mood } from "@/lib/activity-ideas";

/**
 * Do Something.
 *
 * The constraints are the whole interface: five taps, no typing, and the answer
 * arrives as three ideas rather than one. One suggestion is a decision somebody
 * has to argue with; three is a menu, and a group picks from a menu far faster
 * than it agrees with a verdict.
 *
 * What is deliberately absent: a venue, an address and a price on any idea.
 * Bunchy has no venue data, and a suggestion that names a bar it invented is
 * worse than no suggestion at all.
 */

const BUDGETS = [
  { value: 0, label: "Free" },
  { value: 10, label: "€10" },
  { value: 25, label: "€25" },
  { value: 50, label: "€50+" },
];

const HOURS = [
  { value: 1, label: "1 hour" },
  { value: 2, label: "2 hours" },
  { value: 4, label: "An evening" },
  { value: 8, label: "All day" },
];

const MOODS: Array<{ value: Mood; label: string }> = [
  { value: "chill", label: "Chill" },
  { value: "social", label: "Social" },
  { value: "adventurous", label: "Adventurous" },
  { value: "competitive", label: "Competitive" },
  { value: "random", label: "Surprise me" },
];

const PEOPLE = [
  { value: "alone", label: "On my own" },
  { value: "friends", label: "With my bunches" },
  { value: "find", label: "Find people" },
] as const;

interface Result {
  ideas: ActivityIdea[];
  happening: Array<{
    id: string;
    title: string;
    startsAt: string;
    locationLabel: string | null;
    spotsLeft: number;
  }>;
  peopleUp: Array<{
    profileId: string;
    username: string;
    displayName: string;
    score: number;
  }>;
}

export function DoSomething() {
  const [budget, setBudget] = useState<number | undefined>();
  const [hours, setHours] = useState<number | undefined>();
  const [mood, setMood] = useState<Mood | undefined>();
  const [people, setPeople] = useState<(typeof PEOPLE)[number]["value"]>("find");
  const [result, setResult] = useState<Result | null>(null);
  const [seed, setSeed] = useState(1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate(nextSeed: number) {
    setPending(true);
    setError(null);
    try {
      const data = await api<Result>("/api/do-something", {
        method: "POST",
        json: { budget, hours, mood, people, seed: nextSeed },
      });
      setResult(data);
      setSeed(nextSeed);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="space-y-4">
          <Row label="Budget">
            {BUDGETS.map((option) => (
              <Toggle
                key={option.value}
                active={budget === option.value}
                onClick={() =>
                  setBudget(budget === option.value ? undefined : option.value)
                }
              >
                {option.label}
              </Toggle>
            ))}
          </Row>

          <Row label="Time">
            {HOURS.map((option) => (
              <Toggle
                key={option.value}
                active={hours === option.value}
                onClick={() =>
                  setHours(hours === option.value ? undefined : option.value)
                }
              >
                {option.label}
              </Toggle>
            ))}
          </Row>

          <Row label="Mood">
            {MOODS.map((option) => (
              <Toggle
                key={option.value}
                active={mood === option.value}
                onClick={() =>
                  setMood(mood === option.value ? undefined : option.value)
                }
              >
                {option.label}
              </Toggle>
            ))}
          </Row>

          <Row label="People">
            {PEOPLE.map((option) => (
              <Toggle
                key={option.value}
                active={people === option.value}
                onClick={() => setPeople(option.value)}
              >
                {option.label}
              </Toggle>
            ))}
          </Row>
        </div>

        {error && <p className="mt-4 text-sm text-danger">{error}</p>}

        <div className="mt-5 flex flex-wrap gap-2.5">
          <Button onClick={() => generate(seed + 1)} loading={pending}>
            {result ? "Try another" : "Do something"}
          </Button>
          {result && (
            <Button
              variant="ghost"
              onClick={() => {
                setBudget(undefined);
                setHours(undefined);
                setMood(undefined);
                setResult(null);
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </Card>

      {result && (
        <>
          {result.happening.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold tracking-tight">
                Already happening
              </h2>
              <p className="mb-4 text-sm text-muted">
                Real activities somebody has already created. These have a time
                and a place because a member put them there.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {result.happening.map((activity) => (
                  <Link key={activity.id} href={`/activities/${activity.id}`}>
                    <Card className="h-full transition-transform duration-200 hover:-translate-y-0.5">
                      <p className="font-semibold tracking-tight">
                        {activity.title}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        {new Date(activity.startsAt).toLocaleString()} ·{" "}
                        {activity.locationLabel ?? "Online"}
                      </p>
                      <p className="mt-2 text-xs text-teal">
                        {activity.spotsLeft} spots left
                      </p>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-3 text-lg font-semibold tracking-tight">
              Ideas that fit
            </h2>
            <p className="mb-4 text-sm text-muted">
              Kinds of evening, not places. Bunchy does not know which venues are
              near you or what they charge, so it will not pretend to — you pick
              where, and it becomes a real plan.
            </p>

            {result.ideas.length === 0 ? (
              <Card>
                <p className="text-sm font-medium">
                  Nothing fits all of that at once.
                </p>
                <p className="mt-1 text-sm text-muted">
                  Usually it is the time and the budget disagreeing. Drop one and
                  try again.
                </p>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                {result.ideas.map((idea) => (
                  <Card key={idea.slug} className="flex h-full flex-col">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Chip tone="teal">{COST_LABELS[idea.cost]}</Chip>
                      <Chip>{idea.hours}h</Chip>
                      {idea.mode === "ONLINE" && <Chip tone="ai">Online</Chip>}
                    </div>
                    <h3 className="mt-3 font-semibold tracking-tight">
                      {idea.title}
                    </h3>
                    <p className="mt-1.5 flex-1 text-sm text-ink-soft">
                      {idea.blurb}
                    </p>
                    <Link
                      href={`/start?idea=${encodeURIComponent(idea.title)}`}
                      className="mt-4 inline-flex rounded-full bg-accent px-4 py-2 text-sm font-semibold text-[var(--color-on-accent)]"
                    >
                      Make it a plan
                    </Link>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {result.peopleUp.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold tracking-tight">
                Free right now
              </h2>
              <div className="flex flex-wrap gap-2">
                {result.peopleUp.map((person) => (
                  <Link
                    key={person.profileId}
                    href={`/u/${person.username}`}
                    className="rounded-full border border-line px-3.5 py-2 text-sm transition-colors hover:bg-surface-sunken"
                  >
                    {person.displayName}{" "}
                    <span className="text-muted">{person.score}%</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-20 shrink-0 text-sm text-muted">{label}</span>
      {children}
    </div>
  );
}

function Toggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-accent text-[var(--color-on-accent)]"
          : "border border-line text-ink-soft hover:bg-surface-sunken",
      )}
    >
      {children}
    </button>
  );
}
