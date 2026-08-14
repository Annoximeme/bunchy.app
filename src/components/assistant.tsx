"use client";

import { useState } from "react";
import Link from "next/link";
import { api, errorMessage } from "@/lib/api";
import {
  Avatar,
  Button,
  Card,
  Chip,
  ErrorNotice,
  LinkButton,
  Spinner,
  Textarea,
} from "@/components/ui";
import { activityWhen } from "@/lib/format";

/**
 * Bunchy AI.
 *
 * Presented as a thing that looks things up, not a thing that chats. There is
 * no typing indicator, no persona and no thread of remembered banter, because
 * all three would imply capabilities it does not have — and a member who
 * believes they are talking to something that can act on their behalf will
 * eventually assume it did.
 *
 * Every next step is a link. That is the visible form of the guarantee in
 * `concierge/service.ts`: it cannot send, join or commit to anything.
 */

interface Reply {
  understood: string;
  guessed: boolean;
  say: string[];
  people: Array<{
    profileId: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    score: number;
    highlights: string[];
    availability: { label: string } | null;
  }>;
  bunches: Array<{ slug: string; name: string; memberCount: number; score: number }>;
  activities: Array<{ id: string; title: string; startsAt: string; cityLabel: string | null }>;
  clusters: Array<{ where: string; label: string; count: number }>;
  actions: Array<{ label: string; href: string; primary?: boolean }>;
}

const SUGGESTIONS = [
  "I want to play Warhammer tonight",
  "What's happening this weekend?",
  "Find a bunch for board games",
  "Who's around right now?",
  "Why am I seeing these people?",
];

export function Assistant({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [reply, setReply] = useState<Reply | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(text = query) {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;

    setBusy(true);
    setError(null);
    try {
      setReply(await api<Reply>("/api/assistant", { method: "POST", json: { query: trimmed } }));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <label htmlFor="assistant-query" className="block text-sm font-medium">
            Ask Bunchy
          </label>
          <Textarea
            id="assistant-query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={2}
            maxLength={280}
            placeholder="What's happening this weekend?"
            className="mt-1.5"
          />

          <div className="mt-3 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => {
                  setQuery(suggestion);
                  void send(suggestion);
                }}
                className="rounded-full border border-line px-3 py-1.5 text-xs text-ink-soft transition-colors hover:bg-surface-sunken hover:text-ink"
              >
                {suggestion}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Button type="submit" loading={busy} disabled={query.trim().length === 0}>
              Ask
            </Button>
            <span className="text-sm text-muted">
              I can look things up. I can&rsquo;t send or join anything for you.
            </span>
          </div>
        </form>
      </Card>

      {error && <ErrorNotice message={error} />}

      {busy && !reply && (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      )}

      {reply && <Answer reply={reply} />}
    </div>
  );
}

function Answer({ reply }: { reply: Reply }) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <Chip tone="ai">Bunchy AI</Chip>
        {reply.guessed && (
          <span className="text-xs text-muted">
            I wasn&rsquo;t sure what you meant, so I looked for people.
          </span>
        )}
      </div>

      <div className="mt-3 space-y-2">
        {reply.say.map((line) => (
          <p key={line} className="text-ink-soft">
            {line}
          </p>
        ))}
      </div>

      {reply.people.length > 0 && (
        <ul className="mt-4 space-y-2">
          {reply.people.slice(0, 5).map((person) => (
            <li key={person.profileId}>
              <Link
                href={`/u/${person.username}`}
                className="flex items-center gap-3 rounded-[var(--radius-control)] px-2 py-2 transition-colors hover:bg-surface-sunken"
              >
                <Avatar name={person.displayName} src={person.avatarUrl} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {person.displayName}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {person.highlights[0] ?? ""}
                  </span>
                </span>
                {person.availability && (
                  <Chip tone="positive">{person.availability.label}</Chip>
                )}
                <span className="text-sm font-medium tabular-nums text-accent-ink">
                  {person.score}%
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {reply.bunches.length > 0 && (
        <ul className="mt-4 space-y-2">
          {reply.bunches.slice(0, 5).map((bunch) => (
            <li key={bunch.slug}>
              <Link
                href={`/bunches/${bunch.slug}`}
                className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] px-2 py-2 transition-colors hover:bg-surface-sunken"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{bunch.name}</span>
                  <span className="block text-xs text-muted">
                    {bunch.memberCount} {bunch.memberCount === 1 ? "member" : "members"}
                  </span>
                </span>
                <span className="text-sm font-medium tabular-nums text-accent-ink">
                  {bunch.score}%
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {reply.activities.length > 0 && (
        <ul className="mt-4 space-y-2">
          {reply.activities.slice(0, 5).map((activity) => (
            <li key={activity.id}>
              <Link
                href={`/activities/${activity.id}`}
                className="block rounded-[var(--radius-control)] px-2 py-2 transition-colors hover:bg-surface-sunken"
              >
                <span className="block text-xs font-medium text-yellow-ink">
                  {activityWhen(activity.startsAt)}
                </span>
                <span className="block truncate text-sm font-medium">{activity.title}</span>
                {activity.cityLabel && (
                  <span className="block text-xs text-muted">{activity.cityLabel}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {reply.clusters.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {reply.clusters.slice(0, 5).map((cluster) => (
            <li key={`${cluster.where}-${cluster.label}`} className="text-sm text-ink-soft">
              <strong className="font-semibold tabular-nums">{cluster.count}</strong> near{" "}
              {cluster.where}, {cluster.label.toLowerCase()}
            </li>
          ))}
        </ul>
      )}

      {reply.actions.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-3 border-t border-line pt-4">
          {reply.actions.map((action) => (
            <LinkButton
              key={action.href + action.label}
              href={action.href}
              variant={action.primary ? "primary" : "secondary"}
              size="sm"
            >
              {action.label}
            </LinkButton>
          ))}
        </div>
      )}
    </Card>
  );
}
