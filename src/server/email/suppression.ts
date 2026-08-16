import { db } from "@/server/db/client";
import type { EmailSuppressionReason } from "@/generated/prisma/enums";

/**
 * Addresses that must not be written to again.
 *
 * A provider tells you about a bounce or a complaint exactly once, on a
 * webhook, and then considers the matter closed. If nothing on this end
 * records it, the next send goes to the same dead mailbox — and the *next* —
 * and the sending domain accumulates precisely the signal that mailbox
 * providers use to decide whether Bunchy's password resets reach an inbox.
 *
 * The check runs before every send rather than only before bulk. A hard bounce
 * means the address does not exist, which is as true of a password reset as it
 * is of an announcement; the reset was never going to arrive, and pretending
 * otherwise only costs reputation.
 *
 * Nothing here is a preference. A member who wants less email has notification
 * settings and an unsubscribe link; this table is a fact about the address, and
 * the two are kept apart so that neither can quietly overwrite the other.
 */

export async function isSuppressed(email: string): Promise<boolean> {
  const row = await db.emailSuppression.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true },
  });
  return row !== null;
}

/**
 * Record an address as undeliverable.
 *
 * Idempotent, because webhooks are delivered at least once and a provider that
 * does not get a prompt 2xx will happily send the same bounce five times.
 */
export async function suppress(input: {
  email: string;
  reason: EmailSuppressionReason;
  detail?: string;
}): Promise<void> {
  const email = input.email.toLowerCase();
  await db.emailSuppression.upsert({
    where: { email },
    create: { email, reason: input.reason, detail: input.detail ?? null },
    // A complaint after a bounce is worth overwriting: it is the stronger
    // instruction, and the one that matters if anybody ever asks why we
    // stopped writing to this address.
    update: { reason: input.reason, detail: input.detail ?? null },
  });
}

/**
 * Deliberately not exported as a "remove" function.
 *
 * There is no un-suppress path in the product, and that is the intended shape:
 * an address ends up here because a mail server said it does not exist or a
 * person said this is spam, and neither is something a dashboard button should
 * be able to overrule. Somebody who mistyped their address signs up again with
 * the right one, which creates a different row entirely.
 */
export async function suppressionCounts(): Promise<{
  bounced: number;
  complained: number;
}> {
  const [bounced, complained] = await Promise.all([
    db.emailSuppression.count({ where: { reason: "BOUNCE" } }),
    db.emailSuppression.count({ where: { reason: "COMPLAINT" } }),
  ]);
  return { bounced, complained };
}
