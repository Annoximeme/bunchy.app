"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/api";
import { Avatar, Button, Card } from "@/components/ui";
import type { OutcomePrompt as Prompt } from "@/server/modules/activities/outcomes";

/**
 * "Did you go?", asked once, on the page people already open.
 *
 * Two taps, no free text, and dismissible without answering, a prompt that
 * blocks the page until it is fed is a toll booth, and the answer it extracts
 * that way is not worth having. Dismissing is client-side only: nothing is
 * written, so the question can come back tomorrow, and silence never becomes a
 * recorded "no".
 */
export function OutcomePrompt({ prompt }: { prompt: Prompt }) {
  const router = useRouter();
  const [step, setStep] = useState<"attended" | "met" | "done" | "repeat">(
    "attended",
  );
  const [pending, setPending] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (dismissed) return null;

  async function answer(attended: boolean, metSomeone?: boolean) {
    setPending(true);
    setError(null);
    try {
      await api(`/api/activities/${prompt.activityId}/outcome`, {
        method: "POST",
        json: { attended, ...(metSomeone === undefined ? {} : { metSomeone }) },
      });

      // Going means there is a second question. Not going ends it, pressing
      // someone who did not turn up for a reason is how a product earns being
      // ignored.
      if (attended && metSomeone === undefined) {
        setStep("met");
        setPending(false);
        return;
      }

      /*
        A good evening is the one moment the question "should this be a
        regular thing?" makes sense, and the only moment somebody is thinking
        about it. Offered to the organiser, and only when the answer was that
        they met someone: asking after an evening that did not work would be
        the product not listening.
      */
      setStep(metSomeone && prompt.canRepeat ? "repeat" : "done");
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
      setPending(false);
    }
  }

  async function makeItRegular(cadence: string) {
    setPending(true);
    setError(null);
    try {
      await api(`/api/activities/${prompt.activityId}/repeat`, {
        method: "POST",
        json: { cadence },
      });
      setStep("done");
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
      setPending(false);
    }
  }

  if (step === "repeat") {
    return (
      <Card className="border-positive/30 bg-positive-soft/40">
        <p className="font-semibold">That one worked. Make it a regular thing?</p>
        <p className="mt-1.5 text-sm text-ink-soft">
          Everyone who turned up comes with it. They can miss a week without
          leaving, and you can stop it whenever you like.
        </p>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            ["WEEKLY", "Every week"],
            ["BIWEEKLY", "Every two weeks"],
            ["MONTHLY", "Every month"],
          ].map(([value, label]) => (
            <Button
              key={value}
              size="sm"
              variant="secondary"
              loading={pending}
              onClick={() => makeItRegular(value!)}
            >
              {label}
            </Button>
          ))}
          {/* Client-side only, like the dismiss above: nothing is written, so
              declining is not recorded as a preference against repeating. */}
          <Button size="sm" variant="ghost" onClick={() => setStep("done")}>
            Not now
          </Button>
        </div>
      </Card>
    );
  }

  if (step === "done") {
    return (
      <Card className="border-positive/30 bg-positive-soft/40">
        <p className="text-sm font-medium">Thanks. That shapes what we show you next.</p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted">About {prompt.title}</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">
            {step === "attended"
              ? "Did you go?"
              : "Did you meet anyone you'd see again?"}
          </h2>
        </div>

        {prompt.others.length > 0 && step === "met" && (
          <div className="flex -space-x-2">
            {prompt.others.slice(0, 5).map((person) => (
              <Avatar
                key={person.id}
                name={person.displayName}
                src={person.avatarUrl}
                size="sm"
                className="ring-2 ring-surface"
              />
            ))}
          </div>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-2.5">
        {step === "attended" ? (
          <>
            <Button onClick={() => answer(true)} loading={pending}>
              I went
            </Button>
            <Button
              variant="secondary"
              onClick={() => answer(false)}
              disabled={pending}
            >
              I didn&apos;t
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => answer(true, true)} loading={pending}>
              Yes
            </Button>
            <Button
              variant="secondary"
              onClick={() => answer(true, false)}
              disabled={pending}
            >
              Not this time
            </Button>
          </>
        )}
        <Button
          variant="ghost"
          onClick={() => setDismissed(true)}
          disabled={pending}
        >
          Skip
        </Button>
      </div>
    </Card>
  );
}
