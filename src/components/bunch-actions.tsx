"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { Button, Card, ErrorNotice, Spinner } from "@/components/ui";

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
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingLeave, setConfirmingLeave] = useState(false);

  async function act(fn: () => Promise<unknown>) {
    setPending(true);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  const body = () => {
    if (status === "ACTIVE") {
      if (confirmingLeave) {
        return (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-ink-soft">
              Leave this bunch? You&rsquo;ll lose access to the chat.
            </span>
            <Button
              variant="danger"
              size="sm"
              loading={pending}
              onClick={() =>
                act(() =>
                  api(`/api/bunches/${bunchId}/membership`, { method: "DELETE" }),
                )
              }
            >
              Leave
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmingLeave(false)}
            >
              Stay
            </Button>
          </div>
        );
      }
      return (
        <Button variant="ghost" size="sm" onClick={() => setConfirmingLeave(true)}>
          Leave bunch
        </Button>
      );
    }

    if (status === "REQUESTED") {
      return (
        <p className="text-sm text-muted">
          Your request is waiting for a moderator.
        </p>
      );
    }

    if (status === "INVITED") {
      return (
        <Button
          loading={pending}
          onClick={() =>
            act(() =>
              api(`/api/bunches/${bunchId}/membership`, {
                method: "POST",
                json: { action: "accept_invite" },
              }),
            )
          }
        >
          Accept invite
        </Button>
      );
    }

    if (status === "REMOVED") {
      return <p className="text-sm text-muted">You can&rsquo;t rejoin this bunch.</p>;
    }

    if (isFull) {
      return <p className="text-sm text-muted">This bunch is full.</p>;
    }

    return (
      <Button
        loading={pending}
        onClick={() =>
          act(() =>
            api(`/api/bunches/${bunchId}/membership`, {
              method: "POST",
              json: { action: "join" },
            }),
          )
        }
      >
        Ask to join
      </Button>
    );
  };

  return (
    <div className="space-y-2">
      {error && <ErrorNotice message={error} />}
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
                Approve
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => respond(request.id, "decline")}
              >
                Decline
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

      if (task === "summary") setSummary(result.summary ?? "Nothing to catch up on.");
      else if (result.suggestion) setIdea(result.suggestion);
      else setError("Not enough to go on yet, try once the bunch has talked a bit.");
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
        Ask for a catch-up, or an idea for something to do.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          loading={busy === "summary"}
          onClick={() => run("summary")}
        >
          Catch me up
        </Button>
        <Button
          size="sm"
          variant="secondary"
          loading={busy === "activity_idea"}
          onClick={() => run("activity_idea")}
        >
          Suggest an activity
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
            Turn this into a plan →
          </a>
        </div>
      )}

      {busy && (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted">
          <Spinner className="size-4" /> Thinking…
        </p>
      )}
    </Card>
  );
}
