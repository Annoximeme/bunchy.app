"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { api, errorMessage } from "@/lib/api";
import { dayLabel, messageTime } from "@/lib/format";
import { Button, Card, ErrorNotice, Spinner, Textarea, cn } from "@/components/ui";

export interface DirectMessage {
  id: string;
  body: string;
  createdAt: string;
  fromViewer: boolean;
  deleted: boolean;
}

interface ConversationContext {
  sharedInterests: string[];
  complementaryInterests: string[];
  starters: string[];
}

const POLL_MS = 5000;

/**
 * A one-to-one conversation.
 *
 * The opener panel is shown only while the thread is empty. Once two people are
 * actually talking, suggestions are noise — the assistant's job here is to get
 * the first message sent and then get out of the way.
 */
export function DirectThread({
  conversationId,
  otherName,
  initialMessages,
  readOnly,
}: {
  conversationId: string;
  otherName: string;
  initialMessages: DirectMessage[];
  readOnly: boolean;
}) {
  const [messages, setMessages] = useState<DirectMessage[]>(initialMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<ConversationContext | null>(null);
  // Starts true when the thread opens empty, so the effect below never has to
  // flip it on synchronously — it only ever settles it in the promise callback.
  const [loadingContext, setLoadingContext] = useState(
    initialMessages.length === 0,
  );
  const contextRequested = useRef(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const result = await api<{ conversation: { messages: DirectMessage[] } }>(
        `/api/conversations/${conversationId}/messages`,
      );
      setMessages((prev) =>
        result.conversation.messages.length === prev.length
          ? prev
          : result.conversation.messages,
      );
    } catch {
      // Transient. The next tick retries.
    }
  }, [conversationId]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (!atBottomRef.current) return;
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  // Only fetch openers when there is nothing to say yet.
  useEffect(() => {
    if (messages.length > 0 || contextRequested.current) return;
    contextRequested.current = true;

    let cancelled = false;
    api<ConversationContext>(`/api/conversations/${conversationId}/context`)
      .then((result) => {
        if (!cancelled) setContext(result);
      })
      .catch(() => {
        // Openers are a nicety; failing quietly is the right call.
      })
      .finally(() => {
        if (!cancelled) setLoadingContext(false);
      });

    return () => {
      cancelled = true;
    };
  }, [messages.length, conversationId]);

  async function send(event: FormEvent) {
    event.preventDefault();
    const trimmed = body.trim();
    if (trimmed.length === 0) return;

    setSending(true);
    setError(null);
    try {
      const result = await api<{ message: { id: string; createdAt: string } }>(
        `/api/conversations/${conversationId}/messages`,
        { method: "POST", json: { body: trimmed } },
      );
      setMessages((prev) => [
        ...prev,
        {
          id: result.message.id,
          body: trimmed,
          createdAt: result.message.createdAt,
          fromViewer: true,
          deleted: false,
        },
      ]);
      setBody("");
      atBottomRef.current = true;
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSending(false);
    }
  }

  // Derived before render rather than by mutating a variable inside the map.
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
    <div className="space-y-4">
      {messages.length === 0 && (
        <Card>
          <h2 className="text-sm font-semibold">
            You and {otherName}
          </h2>

          {loadingContext && (
            <p className="mt-3 flex items-center gap-2 text-sm text-muted">
              <Spinner className="size-4" /> Finding what you have in common…
            </p>
          )}

          {context && (
            <>
              {context.sharedInterests.length > 0 && (
                <p className="mt-2 text-sm text-ink-soft">
                  You both like{" "}
                  <span className="font-medium">
                    {context.sharedInterests.slice(0, 4).join(", ")}
                  </span>
                  .
                </p>
              )}
              {context.complementaryInterests.length > 0 && (
                <p className="mt-1 text-sm text-ink-soft">
                  One of you is still learning{" "}
                  <span className="font-medium">
                    {context.complementaryInterests.slice(0, 3).join(", ")}
                  </span>
                  .
                </p>
              )}

              {context.starters.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">
                    Something to open with
                  </p>
                  <div className="mt-2 flex flex-col gap-2">
                    {context.starters.map((starter) => (
                      <button
                        key={starter}
                        type="button"
                        onClick={() => setBody(starter)}
                        className="rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2 text-left text-sm text-ink-soft transition-colors hover:border-accent hover:text-ink"
                      >
                        {starter}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      )}

      <div className="card-surface flex h-[min(65vh,36rem)] flex-col overflow-hidden">
        <div
          ref={scrollRef}
          onScroll={() => {
            const el = scrollRef.current;
            if (!el) return;
            atBottomRef.current =
              el.scrollHeight - el.scrollTop - el.clientHeight < 120;
          }}
          className="flex-1 space-y-2 overflow-y-auto px-4 py-4"
          role="log"
          aria-live="polite"
          aria-label={`Conversation with ${otherName}`}
        >
          {messages.length === 0 && (
            <p className="py-12 text-center text-sm text-muted">
              No messages yet. Say the first thing.
            </p>
          )}

          {rows.map(({ message, day, showDay }) => {
            return (
              <div key={message.id}>
                {showDay && (
                  <p className="py-3 text-center text-xs font-medium text-muted">
                    {day}
                  </p>
                )}
                <div
                  className={cn(
                    "flex",
                    message.fromViewer ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-3.5 py-2",
                      message.fromViewer
                        ? "bg-accent text-[var(--color-on-accent)]"
                        : "bg-surface-sunken text-ink-soft",
                      message.deleted && "italic opacity-70",
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words text-sm">
                      {message.body}
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 text-[11px]",
                        message.fromViewer
                          ? "text-[var(--color-on-accent)]/70"
                          : "text-muted",
                      )}
                    >
                      {messageTime(message.createdAt)}
                    </p>
                  </div>
                </div>
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

          {readOnly ? (
            <p className="py-2 text-center text-sm text-muted">
              This conversation is read-only.
            </p>
          ) : (
            <form onSubmit={send} className="flex items-end gap-2">
              <label htmlFor="dm-input" className="sr-only">
                Message {otherName}
              </label>
              <Textarea
                id="dm-input"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send(e);
                  }
                }}
                rows={1}
                maxLength={4000}
                placeholder={`Message ${otherName}…`}
                className="min-h-11 flex-1 resize-none py-2.5"
              />
              <Button type="submit" disabled={body.trim().length === 0 || sending}>
                {sending ? <Spinner className="size-4" /> : "Send"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
