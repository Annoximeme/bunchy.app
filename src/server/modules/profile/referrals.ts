import { randomBytes } from "node:crypto";
import { db } from "@/server/db/client";

/**
 * Referrals (§38).
 *
 * A personal link a member can send to someone they actually know. What this
 * deliberately is not:
 *
 * - **No rewards ladder.** Nothing is unlocked by inviting three people, or
 *   ten. The moment a referral pays out, the incentive is to send the link to
 *   strangers, and a product about finding people you belong with is the last
 *   place that should reward volume.
 * - **No leaderboard, and no names.** A member sees how many people joined
 *   through their link, not who. The count is a fact they can already infer;
 *   a list would disclose that a specific person has an account here.
 * - **No contact import, and no reminders.** Bunchy never asks for an address
 *   book and never emails anyone "your friend is still waiting".
 *
 * The honest reward for inviting a friend is that your friend is here.
 */

/**
 * Unambiguous alphabet, following Crockford: no `I`, `L` or `O` (misread as
 * `1`, `1` and `0`), no `0`/`1` for the same reason, and no `U` so a code
 * cannot spell something unfortunate. These get read aloud and typed from
 * memory, so the confusable characters are worth the smaller keyspace —
 * 28^8 is still 3.8×10^11.
 *
 * Existing codes are unaffected: `resolveReferrer` accepts any A–Z0–9 string,
 * so narrowing what we *mint* never invalidates a link already in the wild.
 */
const ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789";
const CODE_LENGTH = 8;

function generateCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return code;
}

/**
 * The member's code, minted on first use rather than at signup.
 *
 * Most people never open the invite screen, and a column that is null until
 * someone actually wants a link is more honest than a billion pre-generated
 * codes nobody asked for.
 */
export async function referralCode(profileId: string): Promise<string> {
  const existing = await db.profile.findUnique({
    where: { id: profileId },
    select: { referralCode: true },
  });
  if (existing?.referralCode) return existing.referralCode;

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateCode();
    const taken = await db.profile.findUnique({
      where: { referralCode: code },
      select: { id: true },
    });
    if (taken) continue;

    await db.profile.update({
      where: { id: profileId },
      data: { referralCode: code },
    });
    return code;
  }

  throw new Error("Could not allocate a referral code");
}

/** How many people finished onboarding after arriving through this member. */
export async function referralCount(profileId: string): Promise<number> {
  return db.profile.count({
    where: { referredById: profileId, onboardingStage: "COMPLETE" },
  });
}

/**
 * Resolves an invite code to the inviter, for attribution at signup.
 *
 * Returns null for anything unrecognised rather than throwing — a mistyped or
 * expired link should let someone sign up regardless. Losing the attribution is
 * a rounding error; blocking a signup over it is not.
 */
export async function resolveReferrer(
  code: string | null | undefined,
): Promise<string | null> {
  if (!code) return null;
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{4,16}$/.test(normalized)) return null;

  const profile = await db.profile.findUnique({
    where: { referralCode: normalized },
    select: { id: true, user: { select: { status: true } } },
  });
  // A suspended or banned member's link stops working. Otherwise a ban is
  // trivially routed around by inviting new accounts.
  if (!profile || profile.user.status !== "ACTIVE") return null;
  return profile.id;
}
