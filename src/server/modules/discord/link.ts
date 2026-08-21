import { randomInt } from "node:crypto";
import { db } from "@/server/db/client";
import { hashToken } from "@/server/auth/tokens";
import { notFound, validationFailed } from "@/server/errors";
import { consume } from "@/server/ratelimit";

/**
 * Proving a Discord account belongs to a member.
 *
 * ## Which way the proof runs, and why
 *
 * The member asks Bunchy for a code and types it at the bot, not the reverse.
 * That direction is the whole design. The session already proves who they are,
 * so the code only has to carry that proof outward to Discord. A code issued by
 * the bot and redeemed on the site would be proving *Discord* identity to
 * Bunchy, which is a different and harder problem: it needs OAuth, a redirect,
 * a client secret and a callback, and it would let anybody who can post in the
 * server hand a code to somebody else.
 *
 * ## What a leaked code buys
 *
 * Somebody who steals a code within its five minutes can attach *their* Discord
 * account to *your* member. That is worth guarding but it is not catastrophic:
 * it grants no access to the account, and unlinking is one action. Hence a
 * short window, single use, one outstanding code per member, and a rate limit.
 *
 * Stored hashed, like sessions and email tokens, so the table is not a list of
 * working credentials. Six digits rather than a long random string, because it
 * has to be typed into a chat box by a human, and the entropy that matters here
 * is bounded by the five-minute window and the rate limit rather than by
 * length.
 */

/** Long enough to fetch a phone, short enough that a stolen code is stale. */
const CODE_TTL_MINUTES = 5;

function generateCode(): string {
  // `randomInt` rather than `Math.random`: this is a credential, however short
  // lived, and the difference costs nothing.
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export interface IssuedCode {
  code: string;
  expiresAt: Date;
}

/**
 * Mint a code for this member.
 *
 * Replaces any outstanding one rather than adding a second, so a member who
 * presses the button twice does not leave a working code behind them.
 */
export async function issueLinkCode(profileId: string): Promise<IssuedCode> {
  await consume("tokenSubmission", profileId);

  const code = generateCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60_000);

  await db.$transaction([
    db.discordLinkCode.deleteMany({ where: { profileId } }),
    db.discordLinkCode.create({
      data: { codeHash: hashToken(code), profileId, expiresAt },
    }),
  ]);

  return { code, expiresAt };
}

export interface RedeemResult {
  profileId: string;
  displayName: string;
}

/**
 * Redeem a code, from the bot.
 *
 * Every failure returns the same refusal. A code that never existed, one that
 * expired and one belonging to somebody else are indistinguishable to the
 * caller, because the caller here is a chat message anybody in the server can
 * send and distinguishing them would turn this into an oracle.
 *
 * The code is consumed whether or not the link succeeds, so a wrong guess
 * cannot be retried against a different Discord account.
 */
export async function redeemLinkCode(
  code: string,
  discordId: string,
  username: string | null,
): Promise<RedeemResult> {
  const row = await db.discordLinkCode.findUnique({
    where: { codeHash: hashToken(code.trim()) },
    select: {
      profileId: true,
      expiresAt: true,
      profile: { select: { displayName: true } },
    },
  });

  if (row) {
    await db.discordLinkCode.deleteMany({ where: { profileId: row.profileId } });
  }

  if (!row || row.expiresAt < new Date()) {
    throw validationFailed(
      "That code is not valid, or it has expired. Ask Bunchy for a new one.",
    );
  }

  // One Discord account, one member. Re-linking the same Discord account to a
  // different member is allowed and replaces the old row, because that is what
  // somebody who made a second Bunchy account and wants to move actually
  // means. What is not allowed is one account quietly covering two members,
  // which would make presence ambiguous.
  await db.$transaction([
    db.discordLink.deleteMany({ where: { discordId } }),
    db.discordLink.upsert({
      where: { profileId: row.profileId },
      create: { profileId: row.profileId, discordId, username },
      update: { discordId, username, linkedAt: new Date() },
    }),
  ]);

  return { profileId: row.profileId, displayName: row.profile.displayName };
}

/** Undo it. Available from the member's own settings, and always allowed. */
export async function unlinkDiscord(profileId: string): Promise<void> {
  await db.discordLink.deleteMany({ where: { profileId } });
}

export async function linkedAccount(profileId: string) {
  return db.discordLink.findUnique({
    where: { profileId },
    select: { discordId: true, username: true, linkedAt: true },
  });
}

/** Whoever this Discord user is, if the product knows. */
export async function profileForDiscordId(discordId: string) {
  const row = await db.discordLink.findUnique({
    where: { discordId },
    select: { profile: { select: { id: true, username: true, displayName: true } } },
  });
  return row?.profile ?? null;
}

/**
 * Best-effort cleanup of codes nobody used. Safe to call from the job runner.
 *
 * Not required for correctness: `redeemLinkCode` checks the expiry itself. This
 * is so a spent five-minute credential is not still sitting in a backup next
 * week, the same reasoning the availability purge already uses.
 */
export async function pruneExpiredLinkCodes(): Promise<number> {
  const { count } = await db.discordLinkCode.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return count;
}

/** Guard for the bot's own calls into the product. */
export async function requireLinked(discordId: string) {
  const profile = await profileForDiscordId(discordId);
  if (!profile) {
    throw notFound(
      "That Discord account is not linked to a Bunchy profile yet.",
    );
  }
  return profile;
}
