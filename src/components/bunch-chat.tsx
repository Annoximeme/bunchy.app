"use client";

import { useFormats, useTranslate } from "@/components/link";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { api, errorMessage } from "@/lib/api";
import {
  Avatar,
  Button,
  ErrorNotice,
  Spinner,
  Textarea,
  cn,
} from "@/components/ui";

/**
 * Bunch chat.
 *
 * Live over SSE with an automatic fall back to polling, because a chat that
 * silently stops updating is worse than one that never claimed to be live. New
 * messages only auto-scroll when the reader is already at the bottom, yanking
 * someone away from what they were reading is a small betrayal that chat apps
 * commit constantly.
 */

export interface ChatMessage {
  id: string;
  kind: "TEXT" | "SYSTEM" | "PROMPT";
  body: string;
  createdAt: string;
  editedAt: string | null;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
  parent: { id: string; body: string; authorName: string | null } | null;
  reactions: Array<{ emoji: string; count: number; reactedByViewer: boolean }>;
  mentionsViewer: boolean;
  canModerate: boolean;
}

const REACTIONS = ["👍", "❤️", "😂", "🎉", "👀", "🙌"] as const;
const POLL_FALLBACK_MS = 6000;

export function BunchChat({
  bunchId,
  viewerProfileId,
  initialMessages,
}: {
  bunchId: string;
  viewerProfileId: string;
  initialMessages: ChatMessage[];
}) {
  const { dayLabel } = useFormats();
  const t = useTranslate();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);
  const cursorRef = useRef<string>(
    initialMessages.at(-1)?.createdAt ?? new Date(0).toISOString(),
  );

  const merge = useCallback((incoming: ChatMessage[]) => {
    if (incoming.length === 0) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const added = incoming.filter((m) => !seen.has(m.id));
      if (added.length === 0) return prev;
      return [...prev, ...added];
    });
    const newest = incoming.at(-1)?.createdAt;
    if (newest && newest > cursorRef.current) cursorRef.current = newest;
  }, []);

  // Live updates. EventSource reconnects on its own; the interval below is the
  // safety net for environments where SSE is proxied away entirely.
  useEffect(() => {
    let source: EventSource | null = null;
    let cancelled = false;

    try {
      source = new EventSource(`/api/bunches/${bunchId}/stream`);
      source.addEventListener("ready", () => !cancelled && setLive(true));
      source.addEventListener("messages", (event) => {
        if (cancelled) return;
        try {
          const payload = JSON.parse((event as MessageEvent).data) as {
            messages: ChatMessage[];
          };
          merge(payload.messages);
        } catch {
          // A malformed frame should not take the whole stream down.
        }
      });
      source.onerror = () => setLive(false);
    } catch {
      // EventSource unavailable (or blocked). `live` already starts false, so
      // there is nothing to set, the polling fallback below covers us.
    }

    const poll = setInterval(async () => {
      if (cancelled) return;
      try {
        const result = await api<{ messages: ChatMessage[] }>(
          `/api/bunches/${bunchId}/messages?after=${encodeURIComponent(cursorRef.current)}`,
        );
        merge(result.messages);
      } catch {
        // Offline or a blip, the next tick tries again.
      }
    }, POLL_FALLBACK_MS);

    return () => {
      cancelled = true;
      source?.close();
      clearInterval(poll);
    };
  }, [bunchId, merge]);

  // Only follow the conversation if the reader was already at the bottom.
  useEffect(() => {
    if (!atBottomRef.current) return;
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    atBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    const trimmed = body.trim();
    if (trimmed.length === 0) return;

    setSending(true);
    setError(null);
    try {
      const result = await api<{ message: ChatMessage }>(
        `/api/bunches/${bunchId}/messages`,
        {
          method: "POST",
          json: { body: trimmed, parentId: replyTo?.id },
        },
      );
      merge([result.message]);
      setBody("");
      setReplyTo(null);
      atBottomRef.current = true;
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSending(false);
    }
  }

  async function react(messageId: string, emoji: string) {
    // Optimistic: reactions are trivial and reverting on failure is enough.
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const existing = m.reactions.find((r) => r.emoji === emoji);
        const reactions = existing
          ? m.reactions
              .map((r) =>
                r.emoji === emoji
                  ? {
                      ...r,
                      count: r.count + (r.reactedByViewer ? -1 : 1),
                      reactedByViewer: !r.reactedByViewer,
                    }
                  : r,
              )
              .filter((r) => r.count > 0)
          : [...m.reactions, { emoji, count: 1, reactedByViewer: true }];
        return { ...m, reactions };
      }),
    );

    try {
      await api(`/api/bunches/${bunchId}/messages/${messageId}`, {
        method: "PATCH",
        json: { action: "react", emoji },
      });
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  async function remove(messageId: string) {
    try {
      await api(`/api/bunches/${bunchId}/messages/${messageId}`, {
        method: "DELETE",
      });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, body: t("chat.messageRemoved"), author: null, canModerate: false }
            : m,
        ),
      );
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  // Day separators are derived before rendering rather than by mutating a
  // variable mid-map, which would be reassignment during render.
  const rows = messages.map((message, index) => {
    const day = dayLabel(message.createdAt);
    const previous = messages[index - 1];
    return {
      message,
      day,
      showDay: !previous || dayLabel(previous.createdAt) !== day,
    };
  });

  return (
    <div className="card-surface flex h-[min(70vh,40rem)] flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <h2 className="text-sm font-semibold">{t("chat.bunchChat")}</h2>
        <span
          className="flex items-center gap-1.5 text-xs text-muted"
          title={live ? t("chat.connected") : t("chat.reconnecting")}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              live ? "bg-positive" : "bg-muted",
            )}
          />
          {live ? "Live" : t("chat.catchingUp")}
        </span>
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 space-y-1 overflow-y-auto px-4 py-4"
        role="log"
        aria-live="polite"
        aria-label={t("chat.bunchMessages")}
      >
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">
            {t("chat.bunchEmpty")}
          </p>
        )}

        {rows.map(({ message, day, showDay }) => {
          return (
            <div key={message.id} id={message.id}>
              {showDay && (
                <p className="py-3 text-center text-xs font-medium text-muted">
                  {day}
                </p>
              )}

              {message.kind === "SYSTEM" ? (
                <p className="py-1 text-center text-xs text-muted">
                  {message.body}
                </p>
              ) : message.kind === "PROMPT" ? (
                /* An icebreaker or a challenge. Somebody pressed a button to
                   ask it, so it is attributed, but nobody wrote the words,
                   and rendering it as speech made Bunchy's questions look
                   like things a member had typed. */
                <div className="my-2 rounded-[var(--radius-control)] border border-purple/30 bg-purple-soft px-4 py-3">
                  <p className="text-xs font-medium text-purple-ink">
                    {message.author?.displayName
                      ? `${message.author.displayName} asked the bunch`
                      : t("chat.aQuestion")}
                  </p>
                  <p className="mt-1 text-purple-ink">{message.body}</p>
                </div>
              ) : (
                <MessageRow
                  message={message}
                  isOwn={message.author?.id === viewerProfileId}
                  onReply={() => setReplyTo(message)}
                  onReact={react}
                  onRemove={remove}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t border-line p-3">
        {error && (
          <div className="mb-2">
            <ErrorNotice message={error} />
          </div>
        )}

        {replyTo && (
          <div className="mb-2 flex items-center justify-between gap-2 rounded-[var(--radius-control)] bg-surface-sunken px-3 py-2 text-sm">
            <span className="min-w-0 truncate text-muted">
              Replying to{" "}
              <span className="text-ink">{replyTo.author?.displayName}</span>:{" "}
              {replyTo.body}
            </span>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="shrink-0 text-muted hover:text-ink"
              aria-label={t("chat.cancelReply")}
            >
              ×
            </button>
          </div>
        )}

        <form onSubmit={send} className="flex items-end gap-2">
          <label htmlFor="chat-input" className="sr-only">
            Message
          </label>
          <Textarea
            id="chat-input"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(e);
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder={t("chat.write")}
            className="min-h-11 flex-1 resize-none py-2.5"
          />
          <Button type="submit" disabled={body.trim().length === 0 || sending}>
            {sending ? <Spinner className="size-4" /> : "Send"}
          </Button>
        </form>
      </div>
    </div>
  );
}

function MessageRow({
  message,
  isOwn,
  onReply,
  onReact,
  onRemove,
}: {
  message: ChatMessage;
  isOwn: boolean;
  onReply: () => void;
  onReact: (id: string, emoji: string) => void;
  onRemove: (id: string) => void;
}) {
  const { messageTime } = useFormats();
  const t = useTranslate();
  const [showReactions, setShowReactions] = useState(false);

  return (
    <div
      className={cn(
        "group flex gap-3 rounded-[var(--radius-control)] px-2 py-1.5 transition-colors hover:bg-surface-sunken",
        message.mentionsViewer && "bg-accent-soft/60",
      )}
    >
      <Avatar
        name={message.author?.displayName ?? t("chat.removed")}
        src={message.author?.avatarUrl}
        size="sm"
        className="mt-0.5"
      />

      <div className="min-w-0 flex-1">
        <p className="flex items-baseline gap-2">
          <span className="text-sm font-medium">
            {message.author?.displayName ?? t("chat.removed")}
          </span>
          <span className="text-xs text-muted">
            {messageTime(message.createdAt)}
          </span>
        </p>

        {message.parent && (
          <p className="mt-0.5 truncate border-l-2 border-line pl-2 text-xs text-muted">
            {message.parent.authorName}: {message.parent.body}
          </p>
        )}

        <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-ink-soft">
          {message.body}
        </p>

        {message.reactions.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {message.reactions.map((reaction) => (
              <button
                key={reaction.emoji}
                type="button"
                onClick={() => onReact(message.id, reaction.emoji)}
                aria-pressed={reaction.reactedByViewer}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-xs transition-colors",
                  reaction.reactedByViewer
                    ? "border-accent bg-accent-soft text-accent-ink"
                    : "border-line bg-surface hover:border-ink-soft",
                )}
              >
                {reaction.emoji} {reaction.count}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-start gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowReactions((v) => !v)}
            aria-expanded={showReactions}
            className="rounded-full px-1.5 py-1 text-xs text-muted hover:bg-surface hover:text-ink"
          >
            <span aria-hidden>☺</span>
            <span className="sr-only">{t("chat.addReaction")}</span>
          </button>
          {showReactions && (
            <div className="absolute right-0 z-10 mt-1 flex gap-0.5 rounded-full border border-line bg-surface p-1 shadow-[var(--shadow-lift)]">
              {REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    onReact(message.id, emoji);
                    setShowReactions(false);
                  }}
                  className="rounded-full px-1.5 py-0.5 text-sm transition-transform hover:scale-125"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onReply}
          className="rounded-full px-1.5 py-1 text-xs text-muted hover:bg-surface hover:text-ink"
        >
          {t("chat.reply")}
        </button>

        {message.canModerate && (
          <button
            type="button"
            onClick={() => onRemove(message.id)}
            className="rounded-full px-1.5 py-1 text-xs text-muted hover:bg-danger-soft hover:text-danger"
          >
            {isOwn ? "Delete" : "Remove"}
          </button>
        )}
      </div>
    </div>
  );
}
