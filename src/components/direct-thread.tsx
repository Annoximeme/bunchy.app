"use client";

import { useFormats, useTranslate } from "@/components/link";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { api, errorMessage } from "@/lib/api";
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

/** Safety net for environments where SSE is proxied away entirely. */
const POLL_FALLBACK_MS = 15000;
/** Shorter than the server's six-second window, so a steady typist never blinks. */
const TYPING_PING_MS = 3000;

/**
 * A one-to-one conversation.
 *
 * The opener panel is shown only while the thread is empty. Once two people are
 * actually talking, suggestions are noise, the assistant's job here is to get
 * the first message sent and then get out of the way.
 */
export function DirectThread({
  conversationId,
  otherName,
  initialMessages,
  readOnly,
  initialOtherLastReadAt,
}: {
  conversationId: string;
  otherName: string;
  initialMessages: DirectMessage[];
  readOnly: boolean;
  /** How far the other person had read when the page was rendered. */
  initialOtherLastReadAt: string | null;
}) {
  const { dayLabel, messageTime } = useFormats();
  const t = useTranslate();
  const [messages, setMessages] = useState<DirectMessage[]>(initialMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<ConversationContext | null>(null);
  const [otherLastReadAt, setOtherLastReadAt] = useState(initialOtherLastReadAt);
  const [otherTyping, setOtherTyping] = useState(false);
  // Starts true when the thread opens empty, so the effect below never has to
  // flip it on synchronously, it only ever settles it in the promise callback.
  const [loadingContext, setLoadingContext] = useState(
    initialMessages.length === 0,
  );
  const contextRequested = useRef(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);
  const cursorRef = useRef<string>(
    initialMessages.at(-1)?.createdAt ?? new Date(0).toISOString(),
  );

  /*
    One request per few seconds of writing, never one per keystroke.

    The server records the arrival time and the mark ages out by itself, so
    the only thing this has to get right is not firing on every letter. A
    timestamp in a ref rather than a debounce timer: a debounce would send the
    signal *after* somebody stopped, which is precisely backwards.
  */
  const lastTypingPingRef = useRef(0);
  const pingTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingPingRef.current < TYPING_PING_MS) return;
    lastTypingPingRef.current = now;
    void api(`/api/conversations/${conversationId}/typing`, { method: "POST" }).catch(
      () => {
        // An indicator that failed to appear is not worth telling anybody about.
      },
    );
  }, [conversationId]);

  const merge = useCallback((incoming: DirectMessage[]) => {
    if (incoming.length === 0) return;
    setMessages((prev) => {
      // A message this client sent optimistically comes back down the stream
      // with the same id, so identity is what de-duplicates, not arrival order.
      const seen = new Set(prev.map((m) => m.id));
      const added = incoming.filter((m) => !seen.has(m.id));
      if (added.length === 0) return prev;
      return [...prev, ...added];
    });
    const newest = incoming.at(-1)?.createdAt;
    if (newest && newest > cursorRef.current) cursorRef.current = newest;
  }, []);

  /*
    Live, rather than re-fetching the entire thread every five seconds and
    swapping it in when the length happened to differ. Two people talking to
    each other is the place in this product where a delay is felt most, and it
    was the one place still on a timer.

    The fallback interval stays, at a much slower rate: some corporate proxies
    strip `text/event-stream` entirely, and a conversation that silently stops
    updating is worse than one that updates slowly.
  */
  useEffect(() => {
    let source: EventSource | null = null;
    let cancelled = false;

    try {
      source = new EventSource(`/api/conversations/${conversationId}/stream`);
      source.addEventListener("messages", (event) => {
        if (cancelled) return;
        try {
          const payload = JSON.parse((event as MessageEvent).data) as {
            messages: DirectMessage[];
          };
          merge(payload.messages);
        } catch {
          // A malformed frame should not take the whole stream down.
        }
      });
      source.addEventListener("typing", (event) => {
        if (cancelled) return;
        try {
          const payload = JSON.parse((event as MessageEvent).data) as {
            otherTyping: boolean;
          };
          setOtherTyping(payload.otherTyping);
        } catch {
          // As above.
        }
      });
      source.addEventListener("read", (event) => {
        if (cancelled) return;
        try {
          const payload = JSON.parse((event as MessageEvent).data) as {
            otherLastReadAt: string | null;
          };
          setOtherLastReadAt(payload.otherLastReadAt);
        } catch {
          // As above.
        }
      });
    } catch {
      // EventSource unavailable or blocked; the poll below covers it.
    }

    const poll = setInterval(async () => {
      if (cancelled || document.visibilityState !== "visible") return;
      try {
        const result = await api<{
          conversation: { messages: DirectMessage[]; otherLastReadAt: string | null };
        }>(`/api/conversations/${conversationId}/messages`);
        merge(result.conversation.messages);
        setOtherLastReadAt(result.conversation.otherLastReadAt);
      } catch {
        // Offline or a blip; the next tick tries again.
      }
    }, POLL_FALLBACK_MS);

    return () => {
      cancelled = true;
      source?.close();
      clearInterval(poll);
    };
  }, [conversationId, merge]);

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

  /*
    The receipt goes on the last message in the thread, and only when this
    member sent it.

    A "Seen" under every outgoing message is a column of noise, and the only
    question anybody is actually asking is about the last thing they said. If
    the other person has read past it, it is seen; if not, it has been sent and
    that is all that can honestly be claimed.

    And if they have replied, the reply is the receipt. Printing "Seen" above
    an answer is telling somebody something the answer already told them.
  */
  const newestOwn = messages.at(-1)?.fromViewer ? messages.length - 1 : -1;

  // Derived before render rather than by mutating a variable inside the map.
  const rows = messages.map((message, index) => {
    const day = dayLabel(message.createdAt);
    const previous = messages[index - 1];
    return {
      message,
      day,
      showDay: !previous || dayLabel(previous.createdAt) !== day,
      receipt:
        index === newestOwn
          ? otherLastReadAt && message.createdAt <= otherLastReadAt
            ? "Seen"
            : "Sent"
          : null,
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
              <Spinner className="size-4" /> {t("chat.findingCommon")}
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
                    {t("chat.somethingToOpen")}
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
          aria-label={t("chat.conversationWith", { name: otherName })}
        >
          {messages.length === 0 && (
            <p className="py-12 text-center text-sm text-muted">
              {t("chat.noMessages")}
            </p>
          )}

          {rows.map(({ message, day, showDay, receipt }) => {
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
                {receipt && (
                  <p className="mt-0.5 pr-1 text-right text-[11px] text-muted">
                    {receipt}
                  </p>
                )}
              </div>
            );
          })}

          {/*
            Announced as well as drawn. The three dots are the entire message
            to somebody watching, and nothing at all to somebody listening,
            and this sits inside the `role="log"` above so it is read in the
            conversation rather than out of nowhere.
          */}
          {otherTyping && (
            <p className="flex items-center gap-2 pt-1 text-xs text-muted">
              <span aria-hidden className="flex gap-1">
                <span className="typing-dot size-1.5 rounded-full bg-muted" />
                <span
                  className="typing-dot size-1.5 rounded-full bg-muted"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="typing-dot size-1.5 rounded-full bg-muted"
                  style={{ animationDelay: "300ms" }}
                />
              </span>
              {otherName} is typing…
            </p>
          )}
        </div>

        <div className="border-t border-line p-3">
          {error && (
            <div className="mb-2">
              <ErrorNotice message={error} />
            </div>
          )}

          {readOnly ? (
            <p className="py-2 text-center text-sm text-muted">
              {t("chat.readOnly")}
            </p>
          ) : (
            <form onSubmit={send} className="flex items-end gap-2">
              <label htmlFor="dm-input" className="sr-only">
                Message {otherName}
              </label>
              <Textarea
                id="dm-input"
                value={body}
                onChange={(e) => {
                  setBody(e.target.value);
                  if (e.target.value.length > 0) pingTyping();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send(e);
                  }
                }}
                rows={1}
                maxLength={4000}
                placeholder={t("chat.messagePlaceholder", { name: otherName })}
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
