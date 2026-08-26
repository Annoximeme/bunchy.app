"use client";

import { useTranslate } from "@/components/link";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { Button, Card, ErrorNotice, Spinner } from "@/components/ui";
import { Announce } from "@/components/live-region";

/** Join / leave / accept-invite, with the confirmation that leaving deserves. */
export function BunchMembershipButton({
  bunchId,
  status,
  isFull,
}: {
  bunchId: string;
  status: string | null;
  isFull: boolean;
}) {
  const t = useTranslate();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [optimistic, setOptimistic] = useState<string | null | undefined>(undefined);

  // See `activity-actions.tsx` for why this is adjusted during render rather
  // than in an effect. Same situation, same reason.
  const [lastFromServer, setLastFromServer] = useState(status);
  if (lastFromServer !== status) {
    setLastFromServer(status);
    setOptimistic(undefined);
  }

  const shownStatus = optimistic === undefined ? status : optimistic;

  async function act(fn: () => Promise<unknown>, next: string | null, said: string) {
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

  const body = () => {
    if (shownStatus === "ACTIVE") {
      if (confirmingLeave) {
        return (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-ink-soft">
              {t("bunch.leaveConfirm")}
            </span>
            <Button
              variant="danger"
              size="sm"
              loading={pending}
              onClick={() =>
                act(
                  () =>
                    api(`/api/bunches/${bunchId}/membership`, { method: "DELETE" }),
                  null,
                  t("bunch.left"),
                )
              }
            >
              {t("bunch.leave")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmingLeave(false)}
            >
              {t("bunch.stay")}
            </Button>
          </div>
        );
      }
      return (
        <Button variant="ghost" size="sm" onClick={() => setConfirmingLeave(true)}>
          {t("bunch.leaveBunch")}
        </Button>
      );
    }

    if (shownStatus === "REQUESTED") {
      return (
        <p className="text-sm text-muted">
          {t("bunch.requestWaiting")}
        </p>
      );
    }

    if (shownStatus === "INVITED") {
      return (
        <Button
          loading={pending}
          onClick={() =>
            act(
              () =>
                api(`/api/bunches/${bunchId}/membership`, {
                  method: "POST",
                  json: { action: "accept_invite" },
                }),
              "ACTIVE",
              t("bunch.inviteAccepted"),
            )
          }
        >
          {t("bunch.acceptInvite")}
        </Button>
      );
    }

    if (shownStatus === "REMOVED") {
      return <p className="text-sm text-muted">{t("bunch.cannotRejoin")}</p>;
    }

    if (isFull) {
      return <p className="text-sm text-muted">{t("bunch.full")}</p>;
    }

    return (
      <Button
        loading={pending}
        onClick={() =>
          act(
            () =>
              api(`/api/bunches/${bunchId}/membership`, {
                method: "POST",
                json: { action: "join" },
              }),
            "REQUESTED",
            t("bunch.requestSent"),
          )
        }
      >
        {t("bunch.askToJoin")}
      </Button>
    );
  };

  return (
    <div className="space-y-2">
      {error && <ErrorNotice message={error} />}
      <Announce message={announcement} />
      {body()}
    </div>
  );
}

/** Approve or decline the people waiting at the door. */
export function JoinRequestList({
  bunchId,
  requests,
}: {
  bunchId: string;
  requests: Array<{ id: string; displayName: string; username: string }>;
}) {
  const t = useTranslate();
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (requests.length === 0) return null;

  async function respond(profileId: string, action: "approve" | "decline") {
    setPendingId(profileId);
    setError(null);
    try {
      await api(`/api/bunches/${bunchId}/members/${profileId}`, {
        method: "PATCH",
        json: { action },
      });
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <Card>
      <h2 className="text-sm font-semibold">
        Waiting to join ({requests.length})
      </h2>
      {error && (
        <div className="mt-3">
          <ErrorNotice message={error} />
        </div>
      )}
      <ul className="mt-3 space-y-2">
        {requests.map((request) => (
          <li key={request.id} className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate text-sm">
              {request.displayName}{" "}
              <span className="text-muted">@{request.username}</span>
            </span>
            <span className="flex shrink-0 gap-1">
              <Button
                size="sm"
                loading={pendingId === request.id}
                onClick={() => respond(request.id, "approve")}
              >
                {t("bunch.approve")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => respond(request.id, "decline")}
              >
                {t("bunch.decline")}
              </Button>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/**
 * Ask Bunchy, on request only.
 *
 * Both buttons are things a member chooses to press. Nothing here runs on a
 * timer or arrives unasked, which is the whole difference between an assistant
 * and a notification engine.
 */
export function BunchAssistant({ bunchId }: { bunchId: string }) {
  const t = useTranslate();
  const [busy, setBusy] = useState<"summary" | "activity_idea" | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [idea, setIdea] = useState<{
    title: string;
    description: string;
    rationale: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(task: "summary" | "activity_idea") {
    setBusy(task);
    setError(null);
    try {
      const result = await api<{
        summary?: string;
        suggestion?: { title: string; description: string; rationale: string } | null;
      }>(`/api/bunches/${bunchId}/assist`, { method: "POST", json: { task } });

      if (task === "summary") setSummary(result.summary ?? t("bunch.nothingToCatchUp"));
      else if (result.suggestion) setIdea(result.suggestion);
      else setError(t("bunch.notEnoughYet"));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <span
          aria-hidden
          className="inline-block size-2 shrink-0 rounded-full bg-purple"
        />
        Ask Bunchy
      </h2>
      <p className="mt-1 text-sm text-muted">
        {t("bunch.assistantNote")}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          loading={busy === "summary"}
          onClick={() => run("summary")}
        >
          {t("bunch.catchMeUp")}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          loading={busy === "activity_idea"}
          onClick={() => run("activity_idea")}
        >
          {t("bunch.suggestActivity")}
        </Button>
      </div>

      {error && (
        <div className="mt-3">
          <ErrorNotice message={error} />
        </div>
      )}

      {summary && (
        <p className="mt-3 rounded-[var(--radius-control)] bg-surface-sunken p-3 text-sm text-ink-soft">
          {summary}
        </p>
      )}

      {idea && (
        <div className="mt-3 rounded-[var(--radius-control)] bg-surface-sunken p-3">
          <p className="text-sm font-medium">{idea.title}</p>
          <p className="mt-1 text-sm text-ink-soft">{idea.description}</p>
          {idea.rationale && (
            <p className="mt-2 text-xs text-muted">{idea.rationale}</p>
          )}
          <a
            href={`/activities/new?bunchId=${bunchId}&title=${encodeURIComponent(idea.title)}&description=${encodeURIComponent(idea.description)}`}
            className="mt-3 inline-block text-sm font-medium text-accent-ink underline underline-offset-2"
          >
            {t("bunch.turnIntoPlan")}
          </a>
        </div>
      )}

      {busy && (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted">
          <Spinner className="size-4" /> {t("bunch.thinking")}
        </p>
      )}
    </Card>
  );
}
