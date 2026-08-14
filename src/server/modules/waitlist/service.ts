import { z } from "zod";
import { db } from "@/server/db/client";

/**
 * The pre-launch waiting list.
 *
 * Joining is idempotent. Somebody who submits twice, or who signed up weeks
 * ago and forgot, gets the same friendly answer rather than "that email is
 * already taken", which would turn this form into a way of testing whether a
 * given address is on the list.
 *
 * Nothing here reads or writes anything except the address itself. There is no
 * referrer, no IP, no timestamped funnel: the whole purpose is one message on
 * launch day, and the coming-soon page promises exactly that in plain words.
 */

export const waitlistEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(320)
  .pipe(z.email("That does not look like an email address."));

export async function joinWaitlist(rawEmail: string): Promise<void> {
  const email = waitlistEmailSchema.parse(rawEmail);

  // `createMany` with skipDuplicates rather than an upsert: there is nothing to
  // update on a second attempt, and this keeps the original createdAt so the
  // list stays in the order people actually arrived.
  await db.waitlistSignup.createMany({
    data: [{ email }],
    skipDuplicates: true,
  });
}

/**
 * How many people are waiting.
 *
 * Shown on the page only once it is a number worth showing. Announcing "3
 * people are waiting" is worse than announcing nothing, and it is also close
 * enough to nobody that it starts to identify them.
 */
export const MIN_PUBLIC_COUNT = 25;

export async function publicWaitlistCount(): Promise<number | null> {
  const total = await db.waitlistSignup.count();
  return total >= MIN_PUBLIC_COUNT ? total : null;
}
