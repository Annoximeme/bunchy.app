import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/server/env";
import { suppress } from "@/server/email/suppression";

/**
 * Bounces and complaints, from the provider.
 *
 * Resend signs webhooks with the Svix scheme, and this verifies it by hand
 * rather than pulling in the `svix` package, the same reasoning as talking
 * SMTP instead of a provider SDK. It is an HMAC and three headers; a
 * dependency here would be a supply-chain surface on an unauthenticated public
 * endpoint, which is the last place to want one.
 *
 * ## The signature
 *
 * The signed payload is `${id}.${timestamp}.${body}`, keyed on the part of the
 * webhook secret after `whsec_`, base64-decoded. The `svix-signature` header
 * carries one or more space-separated `v1,<base64>` entries, more than one
 * during a secret rotation, and any of them matching is a pass.
 *
 * The raw body text is what gets signed, so it must be read as text and never
 * as parsed-then-restringified JSON: `JSON.parse` followed by
 * `JSON.stringify` reorders nothing but does drop insignificant whitespace,
 * and the signature is over the bytes.
 *
 * ## Why the timestamp is checked
 *
 * Without it, a signed request captured once is replayable forever. Five
 * minutes either side is Svix's own tolerance and leaves room for clock skew.
 */

const TOLERANCE_SECONDS = 5 * 60;

function verify(
  body: string,
  headers: Headers,
  secret: string,
): "ok" | "bad-signature" | "stale" | "malformed" {
  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signatures = headers.get("svix-signature");
  if (!id || !timestamp || !signatures) return "malformed";

  const sentAt = Number(timestamp);
  if (!Number.isFinite(sentAt)) return "malformed";
  if (Math.abs(Date.now() / 1000 - sentAt) > TOLERANCE_SECONDS) return "stale";

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${body}`)
    .digest("base64");
  const expectedBuf = Buffer.from(expected);

  for (const entry of signatures.split(" ")) {
    const [version, value] = entry.split(",");
    if (version !== "v1" || !value) continue;
    const candidate = Buffer.from(value);
    if (
      candidate.length === expectedBuf.length &&
      timingSafeEqual(candidate, expectedBuf)
    ) {
      return "ok";
    }
  }

  return "bad-signature";
}

interface ResendEvent {
  type?: string;
  data?: {
    to?: string[] | string;
    /** Present on bounces: the provider's own explanation. */
    bounce?: { message?: string; type?: string };
  };
}

/** Everything the payload might call the recipient, flattened. */
function recipients(event: ResendEvent): string[] {
  const to = event.data?.to;
  if (typeof to === "string") return [to];
  return Array.isArray(to) ? to.filter((v) => typeof v === "string") : [];
}

export async function POST(request: Request) {
  const secret = env().RESEND_WEBHOOK_SECRET;
  if (!secret) {
    // Unconfigured is not "accept anything". An endpoint that processes
    // unsigned bounce reports is an endpoint anybody can use to suppress
    // somebody else's address, a denial of service on a person's password
    // reset, delivered by us.
    console.error("resend webhook: RESEND_WEBHOOK_SECRET is not set");
    return new Response("Not configured.", { status: 503 });
  }

  const body = await request.text();
  const result = verify(body, request.headers, secret);
  if (result !== "ok") {
    console.warn(`resend webhook: rejected (${result})`);
    return new Response("Rejected.", { status: 400 });
  }

  let event: ResendEvent;
  try {
    event = JSON.parse(body) as ResendEvent;
  } catch {
    return new Response("Not JSON.", { status: 400 });
  }

  const reason =
    event.type === "email.bounced"
      ? ("BOUNCE" as const)
      : event.type === "email.complained"
        ? ("COMPLAINT" as const)
        : null;

  // Everything else, delivered, opened, clicked, is acknowledged and
  // dropped. Resend will send whichever events the endpoint is subscribed to,
  // and answering 2xx to the ones we do not act on keeps it from retrying them
  // and eventually disabling the endpoint.
  if (!reason) return new Response("Ignored.", { status: 200 });

  const detail = event.data?.bounce?.message ?? event.data?.bounce?.type;

  for (const email of recipients(event)) {
    await suppress({ email, reason, detail });
  }

  // Counted, not listed. The address belongs to a person and this log line
  // outlives the request.
  console.info(
    `resend webhook: suppressed ${recipients(event).length} address(es) (${reason})`,
  );

  return new Response("OK", { status: 200 });
}
