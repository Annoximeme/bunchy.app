import { db } from "@/server/db/client";
import { forbidden } from "@/server/errors";
import { assistant } from "@/server/modules/ai";
import { track } from "@/server/modules/analytics/track";
import { ANALYTICS_EVENTS } from "@/server/modules/analytics/events";
import { sendRequest } from "@/server/modules/connections/service";
import {
  recommendPeople,
  recordMatchFeedback,
  type RecommendedPerson,
} from "@/server/modules/matching/engine";
import {
  composeIntroduction,
  worthIntroducing,
} from "@/server/modules/discovery/introduction-copy";

/**
 * "Sarah, meet Milan."
 *
 * The one place in Bunchy where the product speaks first. That is why it is
 * held to tighter rules than anything else:
 *
 * - **One at a time.** Not a list, not a carousel. An introduction that arrives
 *   with four others is a feed, and the point is a single suggestion somebody
 *   might actually act on today.
 * - **A high bar, plus a real reason.** A good score built from a pile of
 *   mediocre signals produces a sentence that says nothing; `worthIntroducing`
 *   refuses those. Better to show no introduction than an empty one.
 * - **Opt-out that means it.** `aiIntroductions` is checked before anything is
 *   computed, so switching it off does not merely hide the card.
 * - **Nothing is sent without a press.** "Send" creates an ordinary connection
 *   request, which the other person accepts or declines. Bunchy does not
 *   introduce two people to each other behind their backs.
 *
 * There is deliberately no stored `Introduction` row. The copy is a pure
 * function of the match, so it can be recomputed identically; what needs
 * remembering, shown, acted on, dismissed, is already what `Recommendation`
 * records.
 */

/** Introductions are for people who would plainly get on, not plausible ones. */
const MIN_SCORE = 72;

export interface Introduction {
  profileId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  score: number;
  headline: string;
  why: string;
  because: string[];
  starters: string[];
}

/**
 * The one introduction worth making right now, if there is one.
 *
 * Reuses the cached recommendation set rather than scoring again, so this costs
 * nothing on a page that was already going to load Discover.
 */
export async function nextIntroduction(
  profileId: string,
): Promise<Introduction | null> {
  if (!(await introductionsEnabled(profileId))) return null;

  const viewer = await db.profile.findUnique({
    where: { id: profileId },
    select: { displayName: true },
  });
  if (!viewer) return null;

  const candidates = await recommendPeople(profileId, { limit: 8 });
  const chosen = candidates.find((person) => worthIntroducing(person, MIN_SCORE));
  if (!chosen) return null;

  return build(viewer.displayName, chosen);
}

async function build(
  viewerName: string,
  person: RecommendedPerson,
): Promise<Introduction> {
  const copy = composeIntroduction(viewerName, person.displayName, person);

  const starters = await assistant().conversationStarters({
    viewerName,
    otherName: person.displayName,
    sharedInterests: person.sharedInterests,
    complementaryInterests: person.complementaryInterests,
    otherGoals: person.goals,
  });

  return {
    profileId: person.profileId,
    username: person.username,
    displayName: person.displayName,
    avatarUrl: person.avatarUrl,
    score: person.score,
    headline: copy.headline,
    why: copy.why,
    because: copy.because,
    starters: starters.slice(0, 3),
  };
}

/**
 * Acts on an introduction.
 *
 * "Send" is a connection request with the opener attached, so it travels the
 * path that already exists: the recipient decides, blocks and audience rules
 * still apply, and nothing appears in anyone's inbox without their consent.
 */
export async function respondToIntroduction(
  profileId: string,
  targetProfileId: string,
  response: "send" | "dismiss" | "not_interested",
  message?: string,
): Promise<{ ok: true }> {
  if (profileId === targetProfileId) {
    throw forbidden("You cannot introduce yourself to yourself.");
  }

  switch (response) {
    case "send":
      // Rate limits, blocks and `whoCanSendRequests` are all enforced in here.
      await sendRequest(profileId, targetProfileId, message?.trim() || undefined);
      break;

    case "dismiss":
      // Not now. The person stays in the pool; only this card goes away.
      await db.recommendation.updateMany({
        where: { profileId, kind: "PERSON", targetId: targetProfileId },
        data: { dismissedAt: new Date() },
      });
      break;

    case "not_interested":
      // Permanent, and shared with the matching engine.
      await recordMatchFeedback(profileId, targetProfileId, "NOT_INTERESTED");
      break;
  }

  track({
    name:
      response === "send"
        ? ANALYTICS_EVENTS.INTRODUCTION_ACCEPTED
        : ANALYTICS_EVENTS.INTRODUCTION_DISMISSED,
    profileId,
    // Never the message: it is something one member wrote to another.
    properties: { response, hadMessage: Boolean(message?.trim()) },
  });

  return { ok: true };
}

/** False when the member has turned introductions off. */
export async function introductionsEnabled(profileId: string): Promise<boolean> {
  const privacy = await db.privacySettings.findUnique({
    where: { profileId },
    select: { aiIntroductions: true },
  });
  // No row means the defaults, and the column defaults to on.
  return privacy?.aiIntroductions ?? true;
}
