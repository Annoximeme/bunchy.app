import { requireViewer } from "@/server/auth/current-user";
import { errorResponse } from "@/server/http/route";
import { listMessages } from "@/server/modules/messaging/bunch-chat";

/**
 * Live bunch chat over Server-Sent Events.
 *
 * The transport is deliberately the simplest thing that is actually real-time:
 * each connection tails the same cursor query the REST endpoint uses. There is
 * no shared in-process bus, which means this is correct across as many
 * instances as we care to run, at the cost of one small indexed query per
 * connection per tick. At MVP scale that trade is obviously right; when it
 * stops being right, the fix is Redis pub/sub behind this same endpoint, with
 * no client changes at all.
 *
 * SSE rather than WebSockets because the traffic is one-directional (posting
 * goes through POST) and SSE reconnects itself. Voice and video will need a
 * different transport regardless, so there is nothing here to preserve.
 */

const POLL_INTERVAL_MS = 2000;
/** Connections are recycled well before typical proxy idle timeouts. */
const MAX_CONNECTION_MS = 5 * 60 * 1000;

/**
 * Open streams one member may hold at once, per instance.
 *
 * Every connection is a database query every two seconds for up to five
 * minutes, and nothing else here bounds how many a single account can open,
 * the rate limiter counts requests, and this endpoint's cost is in how long
 * one request lasts. Two hundred streams from one script is a hundred queries
 * a second that no one would attribute to a member reading a chat.
 *
 * A generous ceiling on purpose: a real person has a handful of bunches open
 * across a laptop and a phone, and a reconnect can briefly double that while
 * the old connection is still closing. Counted in this process rather than in
 * the database, because the resource being protected is this process.
 */
const MAX_STREAMS_PER_MEMBER = 12;

const openStreams = new Map<string, number>();

function openStream(profileId: string): boolean {
  const current = openStreams.get(profileId) ?? 0;
  if (current >= MAX_STREAMS_PER_MEMBER) return false;
  openStreams.set(profileId, current + 1);
  return true;
}

function closeStream(profileId: string): void {
  const current = openStreams.get(profileId) ?? 0;
  if (current <= 1) openStreams.delete(profileId);
  else openStreams.set(profileId, current - 1);
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const viewer = await requireViewer();
    const { id: bunchId } = await context.params;

    // Membership is checked here, and again on every tick by listMessages.
    await listMessages(bunchId, viewer.profileId, { limit: 1 });

    if (!openStream(viewer.profileId)) {
      // 429 rather than an error page: the client already reconnects on its
      // own, and this is a "not right now", not a refusal of the chat.
      return new Response("Too many open connections.", {
        status: 429,
        headers: { "retry-after": "30" },
      });
    }

    const encoder = new TextEncoder();
    let cursor = new Date().toISOString();
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
          closeStream(viewer.profileId);
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

        send("ready", { cursor });
        const startedAt = Date.now();

        timer = setInterval(async () => {
          if (closed) return;
          if (Date.now() - startedAt > MAX_CONNECTION_MS) return stop();

          try {
            const messages = await listMessages(bunchId, viewer.profileId, {
              after: cursor,
              limit: 50,
            });

            if (messages.length > 0) {
              cursor = messages.at(-1)!.createdAt;
              send("messages", { messages });
            } else if (!closed) {
              // Keeps intermediaries from dropping an idle connection.
              controller.enqueue(encoder.encode(": keep-alive\n\n"));
            }
          } catch {
            // Membership revoked mid-stream, or the bunch went away.
            stop();
          }
        }, POLL_INTERVAL_MS);
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
  } catch (error) {
    return errorResponse(error);
  }
}
