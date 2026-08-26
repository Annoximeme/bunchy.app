"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { Button, ErrorNotice, cn } from "@/components/ui";
import { useLocaleRouter } from "@/components/link";

/**
 * The three quick steps: style, goals and availability.
 *
 * The personality questions are deliberately framed as "which sounds more like
 * you" with a five-point scale and no scoring, no traits named at the member,
 * and no result screen. It is a preference capture, and it should feel like one
 *, not a test that tells someone who they are.
 */

// --- Personality ------------------------------------------------------------

interface Axis {
  key: string;
  question: string;
  low: string;
  high: string;
}

const AXES: Axis[] = [
  {
    key: "introversionExtraversion",
    question: "After a long week, you'd rather…",
    low: "Recharge on your own",
    high: "Be around people",
  },
  {
    key: "smallLargeGroups",
    question: "Your ideal get-together is…",
    low: "Three or four people",
    high: "A full room",
  },
  {
    key: "deepCasual",
    question: "The conversations you enjoy most are…",
    low: "Long and deep",
    high: "Easy and light",
  },
  {
    key: "onlineOffline",
    question: "You'd rather spend time together…",
    low: "Online",
    high: "In person",
  },
  {
    key: "spontaneityPlanning",
    question: "Plans usually happen…",
    low: "Spur of the moment",
    high: "Arranged in advance",
  },
  {
    key: "competitiveRelaxed",
    question: "When you play something…",
    low: "You play to win",
    high: "You play for fun",
  },
  {
    key: "nightMorning",
    question: "You're at your best…",
    low: "Late at night",
    high: "Early in the morning",
  },
];

const SCALE = [0, 25, 50, 75, 100];

export function PersonalityStep({
  initial,
}: {
  initial: Record<string, number> | null;
}) {
  const router = useLocaleRouter();
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(AXES.map((a) => [a.key, initial?.[a.key] ?? 50])),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setPending(true);
    setError(null);
    try {
      const result = await api<{ next: string }>("/api/onboarding/personality", {
        method: "POST",
        json: values,
      });
      router.push(result.next);
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && <ErrorNotice message={error} />}

      <div className="space-y-5">
        {AXES.map((axis) => (
          <fieldset key={axis.key} className="card-surface p-5">
            <legend className="mb-3 text-sm font-medium text-ink">
              {axis.question}
            </legend>

            <div className="flex items-center gap-2">
              <span className="hidden w-28 shrink-0 text-right text-xs text-muted sm:block">
                {axis.low}
              </span>

              <div className="flex flex-1 items-center justify-between gap-1.5">
                {SCALE.map((value) => {
                  const active = values[axis.key] === value;
                  const distance = Math.abs(value - 50) / 50;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      aria-label={`${axis.low} to ${axis.high}: ${value}`}
                      onClick={() =>
                        setValues((prev) => ({ ...prev, [axis.key]: value }))
                      }
                      className={cn(
                        "rounded-full border-2 transition-all duration-200 ease-[var(--ease-out-soft)] active:scale-90",
                        active
                          ? "border-accent bg-accent"
                          : "border-line bg-surface hover:border-ink-soft",
                      )}
                      style={{
                        width: `${1.5 + distance * 0.9}rem`,
                        height: `${1.5 + distance * 0.9}rem`,
                      }}
                    />
                  );
                })}
              </div>

              <span className="hidden w-28 shrink-0 text-xs text-muted sm:block">
                {axis.high}
              </span>
            </div>

            <div className="mt-2 flex justify-between text-xs text-muted sm:hidden">
              <span>{axis.low}</span>
              <span>{axis.high}</span>
            </div>
          </fieldset>
        ))}
      </div>

      <p className="text-sm text-muted">
        There are no right answers here, and nothing is shown to anyone as a
        score. Leave anything in the middle if it depends.
      </p>

      <Button onClick={submit} loading={pending} size="lg" className="w-full">
        Continue
      </Button>
    </div>
  );
}

// --- Goals ------------------------------------------------------------------

const GOALS = [
  { value: "NEW_FRIENDS", label: "New friends", hint: "Just good people to know" },
  { value: "GAMING_FRIENDS", label: "Gaming friends", hint: "People to play with" },
  { value: "HOBBY_PARTNERS", label: "Hobby partners", hint: "Someone who's into the same thing" },
  { value: "GOING_OUT", label: "People to go out with", hint: "Drinks, gigs, nights out" },
  { value: "STUDY_PARTNERS", label: "Study partners", hint: "Learning something together" },
  { value: "FITNESS_PARTNERS", label: "Fitness partners", hint: "Training, running, climbing" },
  { value: "CREATIVE_COLLABORATORS", label: "Creative collaborators", hint: "Making things together" },
  { value: "BUSINESS_PARTNERS", label: "Project partners", hint: "Building something" },
  { value: "MENTORS", label: "Mentors", hint: "Someone a few steps ahead" },
  { value: "SIMILAR_INTERESTS", label: "People like me", hint: "Shared taste, shared world" },
  { value: "LOCAL_COMMUNITIES", label: "Local communities", hint: "Something near you" },
  { value: "TRAVEL_COMPANIONS", label: "Travel companions", hint: "People to go places with" },
  { value: "ACTIVITY_PARTNERS", label: "Activity partners", hint: "Someone for a specific thing" },
] as const;

export function GoalsStep({ initial }: { initial: string[] }) {
  return (
    <MultiSelectStep
      endpoint="/api/onboarding/goals"
      field="goals"
      initial={initial}
      options={GOALS.map((g) => ({ ...g }))}
      minimum={1}
      minimumMessage="Pick at least one so we know who to introduce you to."
      skippable
      columns
    />
  );
}

// --- Availability -----------------------------------------------------------

const WINDOWS = [
  { value: "WEEKDAY_MORNING", label: "Weekday mornings", hint: "Before noon" },
  { value: "WEEKDAY_AFTERNOON", label: "Weekday afternoons", hint: "Midday to evening" },
  { value: "WEEKDAY_EVENING", label: "Weekday evenings", hint: "After work" },
  { value: "WEEKEND_MORNING", label: "Weekend mornings", hint: "Early starts" },
  { value: "WEEKEND_AFTERNOON", label: "Weekend afternoons", hint: "The easy slot" },
  { value: "WEEKEND_EVENING", label: "Weekend evenings", hint: "Going out" },
  { value: "LATE_NIGHT", label: "Late nights", hint: "After eleven" },
] as const;

export function AvailabilityStep({ initial }: { initial: string[] }) {
  return (
    <MultiSelectStep
      endpoint="/api/onboarding/availability"
      field="availability"
      initial={initial}
      options={WINDOWS.map((w) => ({ ...w }))}
      minimum={1}
      minimumMessage="Pick at least one so we only suggest things you can make."
      submitLabel="Finish"
      skippable
      columns
    />
  );
}

// --- Shared multi-select ----------------------------------------------------

function MultiSelectStep({
  endpoint,
  field,
  initial,
  options,
  minimum,
  minimumMessage,
  submitLabel = "Continue",
  skippable = false,
  columns = false,
}: {
  endpoint: string;
  field: string;
  initial: string[];
  options: Array<{ value: string; label: string; hint: string }>;
  minimum: number;
  minimumMessage: string;
  submitLabel?: string;
  /**
   * Whether this step can be left for later.
   *
   * True for goals and availability, and only those two. Everything before
   * them is load-bearing: a member with no name, no interests and no
   * personality answers cannot be matched to anybody. These two make matching
   * better and it runs without them, so holding a new member at them, between
   * signing up and the first screen worth seeing, is a bad trade.
   */
  skippable?: boolean;
  columns?: boolean;
}) {
  const router = useLocaleRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set(initial));
  const [pending, setPending] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(value: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  async function submit() {
    if (selected.size < minimum) {
      setError(minimumMessage);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await api<{ next: string }>(endpoint, {
        method: "POST",
        json: { [field]: [...selected] },
      });
      router.push(result.next);
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
      setPending(false);
    }
  }

  async function skip() {
    setSkipping(true);
    setError(null);
    try {
      const result = await api<{ next: string }>("/api/onboarding/skip", {
        method: "POST",
      });
      router.push(result.next);
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
      setSkipping(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && <ErrorNotice message={error} />}

      <div className={cn("grid gap-3", columns && "sm:grid-cols-2")}>
        {options.map((option) => {
          const active = selected.has(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => toggle(option.value)}
              aria-pressed={active}
              className={cn(
                "rounded-[var(--radius-card)] border p-4 text-left transition-all duration-200 ease-[var(--ease-out-soft)] active:scale-[0.99]",
                active
                  ? "border-accent bg-accent-soft"
                  : "border-line bg-surface hover:border-ink-soft",
              )}
            >
              <span
                className={cn(
                  "block font-medium",
                  active ? "text-accent-ink" : "text-ink",
                )}
              >
                {option.label}
              </span>
              <span className="mt-0.5 block text-sm text-muted">{option.hint}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        <Button onClick={submit} loading={pending} size="lg" className="w-full">
          {submitLabel}
        </Button>

        {/*
          Underneath rather than beside, and worded as what it is. "Skip" reads
          as throwing the question away; this one is genuinely still there
          afterwards, and saying so is the difference between a member who
          answers it next week and one who assumes they cannot.
        */}
        {skippable && (
          <Button
            variant="ghost"
            onClick={skip}
            loading={skipping}
            className="w-full"
          >
            I&rsquo;ll answer this later
          </Button>
        )}
      </div>
    </div>
  );
}
