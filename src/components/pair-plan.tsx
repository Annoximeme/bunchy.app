"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { useFormats, useLanguage } from "@/components/link";
import {
  Button,
  Card,
  Chip,
  ErrorNotice,
  Input,
  Select,
  Textarea,
  cn,
} from "@/components/ui";

/**
 * A plan between two people, in the conversation where it belongs.
 *
 * ## Why it sits above the messages
 *
 * The alternative is a tab, and a plan on a tab is a plan neither of them
 * looks at again. This is one card at the top of the thread they are already
 * reading, and it disappears the moment the plan is settled and turned into
 * something real.
 *
 * ## Why the times are already filled in
 *
 * Both people have said which parts of a week they are usually free, so the
 * form opens with the next three hours that fit both of them, already ticked.
 * An empty datetime picker is where a plan between two people usually stops,
 * and "Thursday at eight?" is a question somebody can answer in one press.
 * They are suggestions, not answers: any of them can be unticked and a time of
 * one's own typed in underneath.
 *
 * ## What it does not do
 *
 * It never books anything. Settling on a time changes a card; turning that
 * into an activity is a second, deliberate press with a description attached,
 * the same rule bunch plans follow.
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

export interface PairPlanView {
  id: string;
  title: string;
  note: string | null;
  status: "OPEN" | "DECIDED" | "CANCELLED";
  options: PlanOption[];
  decidedOptionId: string | null;
  activityId: string | null;
}

export interface SuggestedTime {
  startsAt: string;
  weekend: boolean;
}

export function PairPlan({
  conversationId,
  otherName,
  plan: initialPlan,
  suggestions,
  readOnly,
}: {
  conversationId: string;
  otherName: string;
  plan: PairPlanView | null;
  suggestions: SuggestedTime[];
  readOnly: boolean;
}) {
  const { t } = useLanguage();
  const { activityWhen } = useFormats();
  const [plan, setPlan] = useState(initialPlan);
  const [composing, setComposing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // A block makes the whole thread read-only, and a plan is a message with
  // extra steps.
  if (readOnly) return null;

  async function act(body: Record<string, unknown>, key: string) {
    setBusy(key);
    setError(null);
    try {
      await api(`/api/conversations/${conversationId}/plan`, {
        method: "POST",
        json: body,
      });
      const fresh = await api<{ plan: PairPlanView | null }>(
        `/api/conversations/${conversationId}/plan`,
      );
      setPlan(fresh.plan);
      return true;
    } catch (cause) {
      setError(errorMessage(cause));
      return false;
    } finally {
      setBusy(null);
    }
  }

  if (!plan) {
    return (
      <div className="mb-4">
        {error && <ErrorNotice message={error} />}
        {composing ? (
          <Card>
            <Composer
              suggestions={suggestions}
              busy={busy === "create"}
              onCancel={() => setComposing(false)}
              onCreate={async (input) => {
                const ok = await act({ action: "create", ...input }, "create");
                if (ok) setComposing(false);
              }}
            />
          </Card>
        ) : (
          <button
            type="button"
            onClick={() => setComposing(true)}
            className="text-sm font-medium text-accent-ink underline underline-offset-2"
          >
            {t("pairPlan.suggest")}
          </button>
        )}
      </div>
    );
  }

  const decided = plan.options.find((option) => option.id === plan.decidedOptionId);

  return (
    <Card className="mb-4">
      {error && <ErrorNotice message={error} />}

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold tracking-tight">{plan.title}</h2>
        {plan.status === "DECIDED" && <Chip tone="positive">{t("pairPlan.settled")}</Chip>}
      </div>
      {plan.note && <p className="mt-1 text-sm text-muted">{plan.note}</p>}

      {plan.status === "OPEN" && (
        <ul className="mt-3 space-y-2">
          {plan.options.map((option) => (
            <li
              key={option.id}
              className="rounded-[var(--radius-control)] bg-surface-sunken px-3 py-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium">
                  {activityWhen(option.startsAt)}
                </span>
                {/*
                  Two people, so the useful thing to say is whether the other
                  one has answered, not a tally. "2 yes" between two people is
                  a scoreboard for an audience of nobody.
                */}
                <span className="text-xs text-muted">
                  {option.yes + option.maybe + option.no > (option.yourResponse ? 1 : 0)
                    ? t("pairPlan.bothAnswered", { name: otherName })
                    : t("pairPlan.waiting", { name: otherName })}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {(["YES", "MAYBE", "NO"] as const).map((response) => (
                  <button
                    key={response}
                    type="button"
                    disabled={busy === `vote-${option.id}`}
                    onClick={() =>
                      act(
                        { action: "vote", optionId: option.id, response },
                        `vote-${option.id}`,
                      )
                    }
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60",
                      option.yourResponse === response
                        ? "border-accent bg-accent-soft text-accent-ink"
                        : "border-line hover:bg-surface",
                    )}
                  >
                    {response === "YES"
                      ? t("pairPlan.works")
                      : response === "MAYBE"
                        ? t("pairPlan.maybe")
                        : t("pairPlan.cant")}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={busy === `decide-${plan.id}`}
                  onClick={() =>
                    act(
                      { action: "decide", planId: plan.id, optionId: option.id },
                      `decide-${plan.id}`,
                    )
                  }
                  className="ml-auto text-xs font-medium text-accent-ink underline underline-offset-2 disabled:opacity-60"
                >
                  {t("pairPlan.settleOnThis")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {plan.status === "DECIDED" && decided && (
        <p className="mt-2 text-sm text-ink-soft">{activityWhen(decided.startsAt)}</p>
      )}

      {plan.status === "DECIDED" && !plan.activityId && (
        <MakeItReal
          busy={busy === "real"}
          onSubmit={(input) => act({ action: "to_activity", planId: plan.id, ...input }, "real")}
        />
      )}

      <button
        type="button"
        disabled={busy === "cancel"}
        onClick={() => act({ action: "cancel", planId: plan.id }, "cancel")}
        className="mt-3 text-xs text-muted underline underline-offset-2 hover:text-ink disabled:opacity-60"
      >
        {t("pairPlan.callOff")}
      </button>
    </Card>
  );
}

function Composer({
  suggestions,
  busy,
  onCancel,
  onCreate,
}: {
  suggestions: SuggestedTime[];
  busy: boolean;
  onCancel: () => void;
  onCreate: (input: {
    title: string;
    note: string | null;
    options: Array<{ startsAt: string; label: string | null }>;
  }) => void;
}) {
  const { t } = useLanguage();
  const { activityWhen } = useFormats();
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  // Every suggestion starts ticked. The whole point is that the common answer
  // is "yes, one of those", and a form that opens with three empty checkboxes
  // has only moved the work around.
  const [chosen, setChosen] = useState<string[]>(
    suggestions.map((suggestion) => suggestion.startsAt),
  );
  const [own, setOwn] = useState("");

  const times = [
    ...chosen,
    ...(own ? [new Date(own).toISOString()] : []),
  ].slice(0, 4);

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="pair-plan-title" className="block text-sm font-medium">
          {t("pairPlan.what")}
        </label>
        <Input
          id="pair-plan-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t("pairPlan.whatPlaceholder")}
          maxLength={100}
          className="mt-1.5"
        />
      </div>

      <fieldset>
        <legend className="text-sm font-medium">
          {suggestions.length > 0 ? t("pairPlan.whenBoth") : t("pairPlan.whenNone")}
        </legend>
        <div className="mt-1.5 space-y-1.5">
          {suggestions.map((suggestion) => (
            <label
              key={suggestion.startsAt}
              className="flex items-center gap-2 text-sm"
            >
              <input
                type="checkbox"
                checked={chosen.includes(suggestion.startsAt)}
                onChange={(event) =>
                  setChosen((current) =>
                    event.target.checked
                      ? [...current, suggestion.startsAt]
                      : current.filter((value) => value !== suggestion.startsAt),
                  )
                }
                className="size-4 accent-[var(--color-accent)]"
              />
              {activityWhen(suggestion.startsAt)}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="pair-plan-own" className="block text-sm font-medium">
          {t("pairPlan.ownTime")}
        </label>
        <Input
          id="pair-plan-own"
          type="datetime-local"
          value={own}
          onChange={(event) => setOwn(event.target.value)}
          className="mt-1.5"
        />
      </div>

      <div>
        <label htmlFor="pair-plan-note" className="block text-sm font-medium">
          {t("pairPlan.note")}
        </label>
        <Textarea
          id="pair-plan-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          maxLength={500}
          className="mt-1.5"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          loading={busy}
          disabled={title.trim().length < 3 || times.length === 0}
          onClick={() =>
            onCreate({
              title: title.trim(),
              note: note.trim() || null,
              options: times.map((startsAt) => ({ startsAt, label: null })),
            })
          }
        >
          {t("pairPlan.send")}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
      </div>
    </div>
  );
}

function MakeItReal({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (input: {
    description: string;
    mode: "ONLINE" | "OFFLINE";
    location: string | null;
  }) => void;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<"ONLINE" | "OFFLINE">("OFFLINE");
  const [location, setLocation] = useState("");

  if (!open) {
    return (
      <Button size="sm" className="mt-3" onClick={() => setOpen(true)}>
        {t("pairPlan.makeReal")}
      </Button>
    );
  }

  return (
    <div className="mt-3 space-y-3 border-t border-line pt-3">
      <p className="text-sm text-muted">{t("pairPlan.makeRealHint")}</p>

      <Textarea
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        rows={2}
        maxLength={1500}
        placeholder={t("pairPlan.descriptionPlaceholder")}
        aria-label={t("pairPlan.description")}
      />

      <div className="flex flex-wrap gap-2">
        <Select
          value={mode}
          aria-label={t("pairPlan.mode")}
          onChange={(event) => setMode(event.target.value as "ONLINE" | "OFFLINE")}
          className="w-auto"
        >
          <option value="OFFLINE">{t("pairPlan.inPerson")}</option>
          <option value="ONLINE">{t("pairPlan.online")}</option>
        </Select>
        {mode === "OFFLINE" && (
          <Input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder={t("pairPlan.wherePlaceholder")}
            aria-label={t("pairPlan.where")}
            maxLength={160}
          />
        )}
      </div>

      <Button
        size="sm"
        loading={busy}
        disabled={description.trim().length < 10}
        onClick={() =>
          onSubmit({
            description: description.trim(),
            mode,
            location: location.trim() || null,
          })
        }
      >
        {t("pairPlan.confirm")}
      </Button>
    </div>
  );
}
