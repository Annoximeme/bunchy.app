"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/api";
import { Avatar, Button, Card, Chip, ErrorNotice, cn } from "@/components/ui";

/**
 * The one place Bunchy speaks first.
 *
 * Design constraints that come straight from §5 and §23:
 *
 * - The reason is shown *above* the actions, in full, before anyone is asked to
 *   decide. An introduction whose justification is behind a "why?" link is a
 *   recommendation pretending to be a reason.
 * - "Send" is not a one-tap action. It opens the openers, because the message
 *   that actually gets sent should be one the member chose or wrote — Bunchy
 *   drafts, the member sends.
 * - "Not interested" is described as permanent where it is offered, because it
 *   is, and a member should not discover that afterwards.
 */

export interface IntroductionData {
  profileId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  score: number;
  headline: string;
  why: string;
  because: string[];
  starters: string[];
}

export function IntroductionCard({ intro }: { intro: IntroductionData }) {
  const router = useRouter();
  const [stage, setStage] = useState<"idle" | "composing" | "sent" | "gone">("idle");
  const [message, setMessage] = useState(intro.starters[0] ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function respond(
    response: "send" | "dismiss" | "not_interested",
    body?: string,
  ) {
    setBusy(true);
    setError(null);
    try {
      await api("/api/introductions", {
        method: "POST",
        json: { profileId: intro.profileId, response, message: body },
      });
      setStage(response === "send" ? "sent" : "gone");
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  if (stage === "gone") return null;

  if (stage === "sent") {
    return (
      <Card>
        <p className="text-sm">
          Sent to {intro.displayName}. They&rsquo;ll see it when they accept —
          you&rsquo;ll find the conversation in{" "}
          <Link href="/messages" className="font-medium text-accent-ink underline underline-offset-2">
            Messages
          </Link>{" "}
          once they do.
        </p>
      </Card>
    );
  }

  return (
    <Card className={cn("border-l-4 border-l-purple")}>
      <div className="flex items-start justify-between gap-3">
        <Chip tone="ai">An introduction</Chip>
        <button
          type="button"
          onClick={() => void respond("dismiss")}
          disabled={busy}
          className="text-sm text-muted transition-colors hover:text-ink disabled:opacity-60"
        >
          Not now
        </button>
      </div>

      {error && (
        <div className="mt-3">
          <ErrorNotice message={error} />
        </div>
      )}

      <div className="mt-4 flex items-start gap-4">
        {/* Decorative: the person's name sits right beside this and links to
              the same profile, so exposing the avatar as a second link gave a
              screen reader an unnamed stop and a keyboard user two tabs to
              reach one place. */}
        <Link
          href={`/u/${intro.username}`}
          className="shrink-0"
          aria-hidden
          tabIndex={-1}
        >
          <Avatar name={intro.displayName} src={intro.avatarUrl} size="lg" />
        </Link>

        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold tracking-tight">{intro.headline}</h2>
          {intro.why && <p className="mt-1 text-ink-soft">{intro.why}</p>}

          {intro.because.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {intro.because.map((thing) => (
                <Chip key={thing}>{thing}</Chip>
              ))}
            </div>
          )}
        </div>
      </div>

      {stage === "composing" ? (
        <div className="mt-5 border-t border-line pt-4">
          <label htmlFor="intro-message" className="block text-sm font-medium">
            Say something to {intro.displayName.split(" ")[0]}
          </label>

          {intro.starters.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {intro.starters.map((starter) => (
                <li key={starter}>
                  <button
                    type="button"
                    onClick={() => setMessage(starter)}
                    className={cn(
                      "w-full rounded-[var(--radius-control)] border px-3.5 py-2 text-left text-sm transition-colors",
                      message === starter
                        ? "border-accent bg-accent-soft text-accent-ink"
                        : "border-line hover:bg-surface-sunken",
                    )}
                  >
                    {starter}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <textarea
            id="intro-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            maxLength={500}
            className="mt-3 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent-soft"
          />

          <div className="mt-3 flex flex-wrap gap-3">
            <Button
              onClick={() => void respond("send", message)}
              loading={busy}
              disabled={message.trim().length === 0}
            >
              Send it
            </Button>
            <Button variant="ghost" onClick={() => setStage("idle")} disabled={busy}>
              Back
            </Button>
          </div>
          <p className="mt-2 text-sm text-muted">
            This goes out as a connection request. {intro.displayName.split(" ")[0]}{" "}
            decides whether to reply.
          </p>
        </div>
      ) : (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button onClick={() => setStage("composing")}>Start a conversation</Button>
          <Button
            variant="ghost"
            onClick={() => void respond("not_interested")}
            disabled={busy}
          >
            Not interested
          </Button>
          <span className="text-sm text-muted">
            &ldquo;Not interested&rdquo; means we won&rsquo;t suggest them again.
          </span>
        </div>
      )}
    </Card>
  );
}
