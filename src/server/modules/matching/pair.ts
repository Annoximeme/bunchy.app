import { scorer } from "@/server/modules/matching";
import {
  buildScoringContext,
  loadMatchProfile,
} from "@/server/modules/matching/repository";
import type { PersonMatch } from "@/server/modules/matching/types";

/**
 * How two specific people line up.
 *
 * Everything else in this module ranks a pool: Discover scores four hundred
 * candidates and keeps eight, bunch formation scores a room. This scores
 * exactly one pair, which is what a profile page needs, somebody arriving
 * there has already chosen who they are looking at, and the question is no
 * longer "who?" but "why us?".
 *
 * It runs the same scorer as everything else rather than a simplified copy.
 * A profile page that disagreed with the Discover card that led to it, 87%
 * there, "quite similar" here, would make both numbers untrustworthy, and the
 * one people would believe is whichever they saw last.
 *
 * ## What this deliberately does not do
 *
 * It does not persist a `Recommendation` row and does not emit an analytics
 * event. Looking at somebody's profile is not us recommending them, and
 * recording it as one would poison the measurement of whether recommendations
 * actually lead anywhere. It is also not a view counter: who looked at whose
 * profile is not something this product stores.
 */
export async function scorePair(
  viewerProfileId: string,
  targetProfileId: string,
): Promise<PersonMatch | null> {
  // Nobody is shown a compatibility score with themselves. It would be a
  // meaningless 100% and it would look like a bug.
  if (viewerProfileId === targetProfileId) return null;

  const now = new Date();
  const [subject, candidate] = await Promise.all([
    loadMatchProfile(viewerProfileId, now),
    loadMatchProfile(targetProfileId, now),
  ]);

  // A profile that has not finished onboarding has no interests, no goals and
  // no availability to score against. The honest answer is nothing at all,
  // rather than a low number that reads as "you two have little in common"
  // when what it means is "one of you has not filled this in".
  if (!subject || !candidate) return null;

  const context = await buildScoringContext(now);
  const [match] = await scorer().scorePeople(subject, [candidate], context);

  return match ?? null;
}
