/**
 * Server-Sent Events, and the two things every stream in this product needs.
 *
 * The transport choice is explained where it was first made, in the bunch chat
 * stream: each connection tails the same indexed cursor query the REST
 * endpoint uses, there is no shared in-process bus, and that is what makes it
 * correct across as many instances as we care to run. When the per-tick query
 * stops being cheap enough, the fix is Redis pub/sub behind this same helper
 * and no client changes at all.
 *
 * What lives here is the part that is identical for every stream and easy to
 * get subtly wrong twice: releasing the per-member slot on every exit path,
 * clearing the timer, recycling the connection before a proxy does it for us,
 * and the keep-alive that stops an idle connection being dropped as dead.
 */

/** Connections are recycled well before typical proxy idle timeouts. */
const MAX_CONNECTION_MS = 5 * 60 * 1000;

/**
 * Open streams one member may hold at once, per instance.
 *
 * Every connection is a database query every couple of seconds for up to five
 * minutes, and nothing else bounds how many a single account can open: the
 * rate limiter counts requests, and a stream's cost is in how long one request
 * lasts. Two hundred streams from one script is a hundred queries a second
 * that no one would attribute to a member reading a chat.
 *
 * A generous ceiling on purpose. A real person has a handful of chats open
 * across a laptop and a phone, and a reconnect can briefly double that while
 * the old connection is still closing. Counted in this process rather than in
 * the database, because the resource being protected is this process.
 */
const MAX_STREAMS_PER_MEMBER = 12;

const openStreams = new Map<string, number>();

function claimSlot(profileId: string): boolean {
  const current = openStreams.get(profileId) ?? 0;
  if (current >= MAX_STREAMS_PER_MEMBER) return false;
  openStreams.set(profileId, current + 1);
  return true;
}

function releaseSlot(profileId: string): void {
  const current = openStreams.get(profileId) ?? 0;
  if (current <= 1) openStreams.delete(profileId);
  else openStreams.set(profileId, current - 1);
}

export interface StreamTick {
  /** Emit a named event. Ignored once the connection has gone. */
  send: (event: string, data: unknown) => void;
  /** End the stream from inside a tick, for a membership revoked mid-read. */
  stop: () => void;
}

/**
 * A response that calls `tick` on an interval until the client goes away.
 *
 * `tick` throwing is treated as "this member may no longer read this", which
 * is the realistic cause: a bunch deleted, a membership revoked, a block
 * placed. The stream closes rather than retrying into a permission error
 * every two seconds.
 *
 * Returns a 429 rather than an error when the member is at their ceiling: the
 * client reconnects on its own, and this is a "not right now" rather than a
 * refusal of the chat.
 */
export function eventStream({
  profileId,
  request,
  intervalMs,
  ready,
  tick,
}: {
  profileId: string;
  request: Request;
  intervalMs: number;
  ready?: unknown;
  tick: (helpers: StreamTick) => Promise<void>;
}): Response {
  if (!claimSlot(profileId)) {
    return new Response("Too many open connections.", {
      status: 429,
      headers: { "retry-after": "30" },
    });
  }

  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | undefined;
  // Hoisted so `cancel` releases the slot too. A consumer that cancels the
  // stream without the request aborting would otherwise leave the member's
  // count incremented forever, and enough of those would lock them out of
  // their own chat.
  let stop = () => {};

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      stop = () => {
        if (closed) return;
        closed = true;
        releaseSlot(profileId);
        if (timer) clearInterval(timer);
        try {
          controller.close();
        } catch {
          // Already closed by the client going away.
        }
      };

      // The client disconnecting is the common case, not an error case.
      request.signal.addEventListener("abort", stop);

      const send = (event: string, data: unknown) => {
        if (closed) return;
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      const keepAlive = () => {
        if (closed) return;
        controller.enqueue(encoder.encode(": keep-alive\n\n"));
      };

      send("ready", ready ?? {});
      const startedAt = Date.now();

      timer = setInterval(async () => {
        if (closed) return;
        if (Date.now() - startedAt > MAX_CONNECTION_MS) return stop();

        let sentSomething = false;
        try {
          await tick({
            send: (event, data) => {
              sentSomething = true;
              send(event, data);
            },
            stop,
          });
        } catch {
          return stop();
        }
        if (!sentSomething) keepAlive();
      }, intervalMs);
    },

    cancel() {
      stop();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      // Stops nginx-style proxies from buffering the stream into uselessness.
      "x-accel-buffering": "no",
    },
  });
}
