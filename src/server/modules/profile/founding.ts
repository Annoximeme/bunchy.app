import { db } from "@/server/db/client";

/**
 * Founding members (§37).
 *
 * Awarded once, when onboarding completes, while the completed member base is
 * still under the limit. Three deliberate constraints:
 *
 * **It is a boolean, never an ordinal.** "Here since the beginning" is a fact
 * about someone. "Founding member #47" is a leaderboard, and this product does
 * not have numbers that rank one member above another (§29). Nothing in the
 * codebase can tell you who was 12th.
 *
 * **It is earned by finishing, not by signing up.** Accounts that never complete
 * onboarding do not consume a place, because a half-filled profile is not a
 * founding member, it is a row.
 *
 * **It changes nothing else.** It does not affect matching, ranking, discovery
 * order or what anyone can do. A badge that bought advantages would turn the
 * early cohort into a class, which is precisely what a product about belonging
 * should not build.
 */

/** How many completed members get the badge. */
export const FOUNDING_MEMBER_LIMIT = 1000;

/**
 * Marks the profile as founding if there is still room.
 *
 * Racy by construction, two people finishing onboarding at the same instant
 * could both see the same count. That is accepted: the failure mode is one
 * extra founding member out of a thousand, and the alternative is serializing
 * every onboarding completion behind a lock to protect a badge.
 */
export async function awardFoundingMember(profileId: string): Promise<boolean> {
  const alreadyFounding = await db.profile.count({
    where: { foundingMember: true },
  });
  if (alreadyFounding >= FOUNDING_MEMBER_LIMIT) return false;

  const result = await db.profile.updateMany({
    // `foundingMember: false` makes this idempotent: re-running onboarding
    // cannot re-award, and re-saving availability cannot flip it twice.
    where: { id: profileId, foundingMember: false, onboardingStage: "COMPLETE" },
    data: { foundingMember: true },
  });

  return result.count > 0;
}
