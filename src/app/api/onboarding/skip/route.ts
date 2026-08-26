import { handleAuthed } from "@/server/http/route";
import { finishOnboardingEarly } from "@/server/modules/profile/service";

/**
 * "I'll do the rest later."
 *
 * Its own route rather than a flag on the step handler, because it is a
 * different act: the step handler saves an answer, and this one declines to.
 * The service refuses it from anywhere but the last two steps, which is where
 * the rule about what onboarding actually needs is written down.
 */
export async function POST() {
  return handleAuthed(async (viewer) => {
    await finishOnboardingEarly(viewer.profileId);
    return { ok: true, next: "/discover" };
  });
}
