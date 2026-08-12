import { handleAuthed } from "@/server/http/route";
import {
  referralCode,
  referralCount,
} from "@/server/modules/profile/referrals";

/**
 * The member's invite link.
 *
 * POST rather than GET because it mints the code on first call — most people
 * never open this screen, and generating a code for every account at signup
 * would be a column full of things nobody asked for.
 */
export async function POST() {
  return handleAuthed(async (viewer) => ({
    code: await referralCode(viewer.profileId),
    joined: await referralCount(viewer.profileId),
  }));
}
