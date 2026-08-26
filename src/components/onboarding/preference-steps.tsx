"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { Button, ErrorNotice, cn } from "@/components/ui";
import { useLocaleRouter, useTranslate } from "@/components/link";

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

/**
 * The seven axes, by key alone.
 *
 * The wording lives in the phrasebook under `onboarding.axes`, keyed by the
 * same string that names the column in the database. One list, in one order,
 * and a language cannot silently drop or reorder a question.
 */
const AXIS_KEYS = [
  "introversionExtraversion",
  "smallLargeGroups",
  "deepCasual",
  "onlineOffline",
  "spontaneityPlanning",
  "competitiveRelaxed",
  "nightMorning",
] as const;

const SCALE = [0, 25, 50, 75, 100];

export function PersonalityStep({
  initial,
}: {
  initial: Record<string, number> | null;
}) {
  const router = useLocaleRouter();
  const t = useTranslate();
  const axes: Axis[] = AXIS_KEYS.map((key) => ({
    key,
    question: t(`onboarding.axes.${key}.question`),
    low: t(`onboarding.axes.${key}.low`),
    high: t(`onboarding.axes.${key}.high`),
  }));
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(AXIS_KEYS.map((key) => [key, initial?.[key] ?? 50])),
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
        {axes.map((axis) => (
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
                      aria-label={t("onboarding.axisScale", {
                        low: axis.low,
                        high: axis.high,
                        value,
                      })}
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

      <p className="text-sm text-muted">{t("onboarding.personalityNote")}</p>

      <Button onClick={submit} loading={pending} size="lg" className="w-full">
        {t("onboarding.continueLabel")}
      </Button>
    </div>
  );
}

// --- Goals ------------------------------------------------------------------

const GOAL_VALUES = [
  "NEW_FRIENDS",
  "GAMING_FRIENDS",
  "HOBBY_PARTNERS",
  "GOING_OUT",
  "STUDY_PARTNERS",
  "FITNESS_PARTNERS",
  "CREATIVE_COLLABORATORS",
  "BUSINESS_PARTNERS",
  "MENTORS",
  "SIMILAR_INTERESTS",
  "LOCAL_COMMUNITIES",
  "TRAVEL_COMPANIONS",
  "ACTIVITY_PARTNERS",
] as const;

export function GoalsStep({ initial }: { initial: string[] }) {
  const t = useTranslate();
  return (
    <MultiSelectStep
      endpoint="/api/onboarding/goals"
      field="goals"
      initial={initial}
      options={GOAL_VALUES.map((value) => ({
        value,
        label: t(`onboarding.goals.${value}.label`),
        hint: t(`onboarding.goals.${value}.hint`),
      }))}
      minimum={1}
      minimumMessage={t("onboarding.goalsMinimum")}
      skippable
      columns
    />
  );
}

// --- Availability -----------------------------------------------------------

const AVAILABILITY_VALUES = [
  "WEEKDAY_MORNING",
  "WEEKDAY_AFTERNOON",
  "WEEKDAY_EVENING",
  "WEEKEND_MORNING",
  "WEEKEND_AFTERNOON",
  "WEEKEND_EVENING",
  "LATE_NIGHT",
] as const;

export function AvailabilityStep({ initial }: { initial: string[] }) {
  const t = useTranslate();
  return (
    <MultiSelectStep
      endpoint="/api/onboarding/availability"
      field="availability"
      initial={initial}
      options={AVAILABILITY_VALUES.map((value) => ({
        value,
        label: t(`onboarding.availability.${value}.label`),
        hint: t(`onboarding.availability.${value}.hint`),
      }))}
      minimum={1}
      minimumMessage={t("onboarding.availabilityMinimum")}
      submitLabel={t("onboarding.finish")}
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
  submitLabel,
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
  const t = useTranslate();
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
          {submitLabel ?? t("onboarding.continueLabel")}
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
            {t("onboarding.answerLater")}
          </Button>
        )}
      </div>
    </div>
  );
}
