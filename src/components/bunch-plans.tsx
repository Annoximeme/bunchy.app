"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link } from "@/components/link";
import { api, errorMessage } from "@/lib/api";
import { Button, Card, Chip, ErrorNotice, Input, Textarea, cn } from "@/components/ui";
import { activityWhen } from "@/lib/format";

/**
 * Plan something, break the ice, take on a challenge.
 *
 * Three small things a bunch can do to itself, on one card because they are
 * one question: *what now?* Each is a button somebody presses, and none of them
 * has a badge, a streak or a count that grows, §12 asks for interaction rather
 * than addiction, and the difference is visible in what the screen does when
 * you ignore it, which here is nothing.
 */

interface PlanOption {
  id: string;
  startsAt: string | Date;
  label: string | null;
  yes: number;
  maybe: number;
  no: number;
  yourResponse: "YES" | "MAYBE" | "NO" | null;
}

interface Plan {
  id: string;
  title: string;
  note: string | null;
  status: "OPEN" | "DECIDED" | "CANCELLED";
  memberCount: number;
  options: PlanOption[];
  decidedOptionId: string | null;
  activityId: string | null;
  best: { optionId: string; yes: number; of: number } | null;
}

interface ChallengeState {
  enabled: boolean;
  active: { id: string; key: string; title: string; description: string } | null;
  available: ReadonlyArray<{ key: string; title: string; description: string }>;
}

export function BunchPlans({
  bunchId,
  plans: initialPlans,
  challenges: initialChallenges,
  isModerator,
}: {
  bunchId: string;
  plans: Plan[];
  challenges: ChallengeState;
  isModerator: boolean;
}) {
  const router = useRouter();
  const [plans, setPlans] = useState(initialPlans);
  const [challenges, setChallenges] = useState(initialChallenges);
  const [composing, setComposing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [icebreaker, setIcebreaker] = useState<string | null>(null);

  async function act(body: Record<string, unknown>, key: string) {
    setBusy(key);
    setError(null);
    try {
      const result = await api<Record<string, unknown>>(`/api/bunches/${bunchId}/plans`, {
        method: "POST",
        json: body,
      });
      const fresh = await api<{ plans: Plan[]; challenges: ChallengeState }>(
        `/api/bunches/${bunchId}/plans`,
      );
      setPlans(fresh.plans);
      setChallenges(fresh.challenges);
      router.refresh();
      return result;
    } catch (cause) {
      setError(errorMessage(cause));
      return null;
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && <ErrorNotice message={error} />}

      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold">What now?</h2>
          {/* Not "Plan something": the activities section already has a button
              with that label which creates an activity outright. Two identical
              labels doing different things is worse than a slightly duller one
              that says which is which. */}
          {!composing && (
            <button
              type="button"
              onClick={() => setComposing(true)}
              className="text-sm font-medium text-accent-ink underline underline-offset-2"
            >
              Find a time
            </button>
          )}
        </div>

        {composing && (
          <PlanComposer
            busy={busy === "create"}
            onCancel={() => setComposing(false)}
            onCreate={async (input) => {
              const ok = await act({ action: "create_plan", ...input }, "create");
              if (ok) setComposing(false);
            }}
          />
        )}

        {!composing && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              loading={busy === "icebreaker"}
              onClick={async () => {
                const result = (await act({ action: "icebreaker" }, "icebreaker")) as
                  | { question: string | null; reason?: string }
                  | null;
                if (result) setIcebreaker(result.question ?? result.reason ?? null);
              }}
            >
              Break the ice
            </Button>

            {challenges.enabled && !challenges.active && challenges.available[0] && (
              <Button
                variant="secondary"
                size="sm"
                loading={busy === "challenge"}
                onClick={() =>
                  act(
                    { action: "start_challenge", challengeKey: challenges.available[0]!.key },
                    "challenge",
                  )
                }
              >
                Try a challenge
              </Button>
            )}
          </div>
        )}

        {icebreaker && (
          <p className="mt-3 rounded-[var(--radius-control)] bg-purple-soft px-3.5 py-2.5 text-sm text-purple-ink">
            {icebreaker}, posted to the chat.
          </p>
        )}

        {challenges.active && (
          <div className="mt-4 rounded-[var(--radius-control)] bg-surface-sunken px-3.5 py-3">
            <p className="text-sm font-medium">{challenges.active.title}</p>
            <p className="mt-0.5 text-sm text-muted">{challenges.active.description}</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <Button
                size="sm"
                loading={busy === "done"}
                onClick={() =>
                  act(
                    { action: "end_challenge", challengeId: challenges.active!.id, outcome: "DONE" },
                    "done",
                  )
                }
              >
                We did it
              </Button>
              <Button
                variant="ghost"
                size="sm"
                loading={busy === "drop"}
                onClick={() =>
                  act(
                    { action: "end_challenge", challengeId: challenges.active!.id, outcome: "DROPPED" },
                    "drop",
                  )
                }
              >
                Put it down
              </Button>
            </div>
          </div>
        )}

        {isModerator && (
          <label className="mt-4 flex items-center gap-2 border-t border-line pt-3 text-sm text-muted">
            <input
              type="checkbox"
              checked={challenges.enabled}
              onChange={(e) =>
                act({ action: "set_challenges_enabled", enabled: e.target.checked }, "toggle")
              }
              className="size-4 accent-[var(--color-accent)]"
            />
            Offer challenges in this bunch
          </label>
        )}
      </Card>

      {plans.map((plan) => (
        <PlanCard
          key={plan.id}
          plan={plan}
          busy={busy}
          onVote={(optionId, response) =>
            act({ action: "vote", optionId, response }, `vote-${optionId}`)
          }
          onDecide={(optionId) =>
            act({ action: "decide", planId: plan.id, optionId }, `decide-${plan.id}`)
          }
        />
      ))}
    </div>
  );
}

function PlanComposer({
  busy,
  onCancel,
  onCreate,
}: {
  busy: boolean;
  onCancel: () => void;
  onCreate: (input: {
    title: string;
    note: string | null;
    options: Array<{ startsAt: string; label: string | null }>;
  }) => void;
}) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [times, setTimes] = useState<string[]>(["", ""]);

  const filled = times.filter((t) => t.length > 0);

  return (
    <div className="mt-3 space-y-3">
      <div>
        <label htmlFor="plan-title" className="block text-sm font-medium">
          What are you trying to find a time for?
        </label>
        <Input
          id="plan-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Board game night"
          maxLength={100}
          className="mt-1.5"
        />
      </div>

      <fieldset>
        <legend className="text-sm font-medium">Times to choose between</legend>
        <div className="mt-1.5 space-y-2">
          {times.map((value, index) => (
            <Input
              key={index}
              type="datetime-local"
              value={value}
              aria-label={`Option ${index + 1}`}
              onChange={(e) =>
                setTimes((prev) => prev.map((t, i) => (i === index ? e.target.value : t)))
              }
            />
          ))}
        </div>
        {times.length < 6 && (
          <button
            type="button"
            onClick={() => setTimes((prev) => [...prev, ""])}
            className="mt-2 text-sm font-medium text-accent-ink underline underline-offset-2"
          >
            Add another time
          </button>
        )}
      </fieldset>

      <div>
        <label htmlFor="plan-note" className="block text-sm font-medium">
          Anything to add? <span className="font-normal text-muted">(optional)</span>
        </label>
        <Textarea
          id="plan-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={500}
          className="mt-1.5"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          loading={busy}
          disabled={title.trim().length < 3 || filled.length < 2}
          onClick={() =>
            onCreate({
              title: title.trim(),
              note: note.trim() || null,
              options: filled.map((t) => ({
                startsAt: new Date(t).toISOString(),
                label: null,
              })),
            })
          }
        >
          Ask the bunch
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  busy,
  onVote,
  onDecide,
}: {
  plan: Plan;
  busy: string | null;
  onVote: (optionId: string, response: "YES" | "MAYBE" | "NO") => void;
  onDecide: (optionId: string) => void;
}) {
  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold tracking-tight">{plan.title}</h3>
        {plan.status === "DECIDED" && <Chip tone="positive">Settled</Chip>}
      </div>
      {plan.note && <p className="mt-1 text-sm text-muted">{plan.note}</p>}

      {plan.best && plan.status === "OPEN" && (
        <p className="mt-2 text-sm text-ink-soft">
          Best so far: works for {plan.best.yes} of {plan.best.of}.
        </p>
      )}

      <ul className="mt-3 space-y-2">
        {plan.options.map((option) => {
          const decided = plan.decidedOptionId === option.id;
          return (
            <li
              key={option.id}
              className={cn(
                "rounded-[var(--radius-control)] px-3 py-2.5",
                decided ? "bg-positive-soft" : "bg-surface-sunken",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium">{activityWhen(option.startsAt)}</span>
                <span className="text-xs text-muted">
                  {option.yes} yes
                  {option.maybe > 0 && ` · ${option.maybe} maybe`}
                  {option.no > 0 && ` · ${option.no} no`}
                </span>
              </div>

              {plan.status === "OPEN" && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(["YES", "MAYBE", "NO"] as const).map((response) => (
                    <button
                      key={response}
                      type="button"
                      disabled={busy === `vote-${option.id}`}
                      onClick={() => onVote(option.id, response)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60",
                        option.yourResponse === response
                          ? "border-accent bg-accent-soft text-accent-ink"
                          : "border-line hover:bg-surface",
                      )}
                    >
                      {response === "YES" ? "Works" : response === "MAYBE" ? "Maybe" : "Can't"}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => onDecide(option.id)}
                    disabled={busy === `decide-${plan.id}`}
                    className="ml-auto text-xs font-medium text-accent-ink underline underline-offset-2 disabled:opacity-60"
                  >
                    Settle on this
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {plan.status === "DECIDED" && (
        <p className="mt-3 text-sm text-muted">
          {plan.activityId ? (
            <>
              <Link
                href={`/activities/${plan.activityId}`}
                className="font-medium text-accent-ink underline underline-offset-2"
              >
                See the activity
              </Link>
              .
            </>
          ) : (
            "A time is set. Someone still needs to turn it into an activity. Nothing is booked automatically."
          )}
        </p>
      )}
    </Card>
  );
}
