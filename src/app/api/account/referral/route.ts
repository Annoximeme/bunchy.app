import { handleAuthed } from "@/server/http/route";
import { referralCode, referralCount } from "@/server/modules/profile/referrals";

/**
 * The member's invite link.
 *
 * GET mints the code on first request rather than at signup — most people never
 * open this screen, and a column that stays null until someone actually wants a
 * link is more honest than pre-generating a code for everyone.
 */
export async function GET() {
  return handleAuthed(async (viewer) => ({
    code: await referralCode(viewer.profileId),
    joined: await referralCount(viewer.profileId),
  }));
}
