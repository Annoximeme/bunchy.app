import { createHmac } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db/client";
import { authSecret } from "@/server/env";

/**
 * Addresses that may not create a new account.
 *
 * The problem this solves: deleting an account frees its email address. Without
 * this, a banned member deletes and re-registers in one click, and every block,
 * report and moderation decision about them is void.
 *
 * The cost: retaining a fingerprint of someone who may have asked to be
 * forgotten. That is a real cost and worth stating plainly rather than
 * pretending it is free. It is proportionate because the people a ban protects
 * have a stronger interest in not meeting that person again than the banned
 * person has in the erasure of one opaque hash, and because everything below
 * is built to keep the retention as small as it can be.
 *
 * **Keyed, not merely hashed.** A plain SHA-256 of an email is reversible in
 * practice: the address space is small enough to enumerate. An HMAC under
 * `AUTH_SECRET` means a copy of this table alone cannot tell anyone whether a
 * given person was banned, an attacker needs the application secret too.
 *
 * **No link to the account.** The table has no foreign key to `User`, which is
 * the whole point: a cascade would remove the row along with the account, which
 * is exactly the path being closed.
 *
 * **Bans only, and reversible.** Suspensions never write here. Voluntary
 * deletions never write here. Lifting a ban removes the row.
 */

function fingerprint(email: string): string {
  return createHmac("sha256", authSecret())
    .update(email.trim().toLowerCase())
    .digest("hex");
}

/** Records the address at ban time, on the transaction that applies the ban. */
export async function blockEmailTx(
  tx: Prisma.TransactionClient,
  email: string,
  reason: string,
): Promise<void> {
  const emailHash = fingerprint(email);
  await tx.bannedEmail.upsert({
    where: { emailHash },
    create: { emailHash, reason: reason.slice(0, 500) },
    update: { reason: reason.slice(0, 500) },
  });
}

/** Removes the block when a ban is lifted. */
export async function unblockEmailTx(
  tx: Prisma.TransactionClient,
  email: string,
): Promise<void> {
  await tx.bannedEmail.deleteMany({ where: { emailHash: fingerprint(email) } });
}

export async function isEmailBanned(email: string): Promise<boolean> {
  const row = await db.bannedEmail.findUnique({
    where: { emailHash: fingerprint(email) },
    select: { emailHash: true },
  });
  return row !== null;
}
