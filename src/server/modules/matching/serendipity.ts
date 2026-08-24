import type { MatchProfile, PersonMatch, SignalResult } from "@/server/modules/matching/types";
import { interestInSentence } from "@/lib/interests";
import {
  buildScoringContext,
  loadCandidates,
  loadMatchProfile,
} from "@/server/modules/matching/repository";
import { scorer } from "@/server/modules/matching/index";

/**
 * Serendipity, the person you would not have found.
 *
 * The ordinary matcher rewards similarity, and it is right to: shared interests
 * are the easiest reason for two people to spend an evening together. Run it
 * often enough, though, and it hands back the same kind of person every time,
 * which is a filter bubble with a compatibility score on it.
 *
 * This re-ranks the same candidates against a different question. Not "who is
 * most like you" but "who is unlike you in what they do, and like you in how
 * they do it", different hobbies, same social temperature, overlapping
 * evenings, close enough to actually meet.
 *
 * It re-ranks rather than re-queries deliberately. `loadCandidates` is where
 * blocks, privacy audiences, discoverability and suspended accounts are
 * enforced; a second candidate loader written for this feature would be a second
 * place to get all of that right.
 */

/** Below this, "unexpected" is just "incompatible". */
const MIN_FLOOR = 30;

/**
 * How much of the ordinary compatibility survives into the serendipity score.
 * The rest is novelty. Weighted towards compatibility on purpose: a stranger
 * with nothing in common is not a discovery, it is a random row.
 */
const COMPATIBILITY_WEIGHT = 0.62;
const NOVELTY_WEIGHT = 0.38;

/** Signals that describe *how* somebody socialises rather than *what* they do. */
const STYLE_SIGNALS = new Set([
  "personality",
  "social_goals",
  "availability",
  "location",
]);

export interface SerendipityMatch {
  profileId: string;
  score: number;
  /** 0–100. How unlike the viewer's interests this person is. */
  novelty: number;
  /** Why it works anyway, most persuasive first. */
  reasons: string[];
  /** The bridge: interests that connect despite the difference. */
  sharedInterests: string[];
  complementaryInterests: string[];
}

function signalValue(signals: SignalResult[], name: string): number {
  return signals.find((s) => s.signal === name)?.score ?? 0;
}

/**
 * Novelty is the absence of overlap, not the presence of difference.
 *
 * Someone with no interests recorded scores low rather than high: we do not
 * know they are different, only that we know nothing, and presenting that as a
 * discovery would be dressing up an empty profile.
 */
export function noveltyFor(
  subject: MatchProfile,
  candidate: MatchProfile,
  match: PersonMatch,
): number {
  if (subject.interests.length === 0 || candidate.interests.length === 0) {
    return 0;
  }

  const overlap = match.sharedInterests.length;
  const breadth = Math.min(subject.interests.length, candidate.interests.length);
  const unlike = 1 - Math.min(1, overlap / Math.max(1, breadth));

  // A bridge is required. Two people with nothing connecting them at all are
  // not a serendipitous match, they are a cold introduction.
  const bridge =
    match.complementaryInterests.length > 0 || overlap > 0 ? 1 : 0.35;

  return Math.round(unlike * bridge * 100);
}

/** The part of compatibility that is about temperament rather than hobbies. */
function styleScore(match: PersonMatch): number {
  const values = match.signals
    .filter((s) => STYLE_SIGNALS.has(s.signal))
    .map((s) => s.score);
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function reasonsFor(match: PersonMatch, novelty: number): string[] {
  const reasons: string[] = [];

  if (novelty >= 60) {
    reasons.push("Very little of what you do overlaps");
  } else if (novelty >= 35) {
    reasons.push("Different interests to most of your matches");
  }

  if (signalValue(match.signals, "personality") >= 0.6) {
    reasons.push("Similar social style");
  }
  if (signalValue(match.signals, "availability") >= 0.6) {
    reasons.push("Free at the same times");
  }
  if (signalValue(match.signals, "social_goals") >= 0.6) {
    reasons.push("Looking for the same kind of thing");
  }
  if (match.complementaryInterests.length > 0) {
    reasons.push(
      // Mid-sentence, so it takes the same casing rule as every other place a
      // label is dropped into prose. Without it this said "One of you does
      // Gaming", capitalised in the middle of a sentence, while the same label
      // read correctly two lines away on Discover.
      `One of you does ${interestInSentence(match.complementaryInterests[0]!)}, the other wants to`,
    );
  }
  if (match.sharedInterests.length > 0) {
    reasons.push(`Still a way in: ${match.sharedInterests.slice(0, 2).join(", ")}`);
  }

  // Never returns an empty list: a card that says "unexpected match" and gives
  // no reason is asking somebody to trust a number.
  return reasons.length > 0 ? reasons : ["Compatible on how you like to spend time"];
}

export interface SurpriseOptions {
  now?: Date;
  /** Profiles already shown in this session, so "another one" moves on. */
  exclude?: string[];
}

export async function surpriseMe(
  profileId: string,
  options: SurpriseOptions = {},
): Promise<SerendipityMatch | null> {
  const now = options.now ?? new Date();
  const subject = await loadMatchProfile(profileId, now);
  if (!subject) return null;

  const [candidates, context] = await Promise.all([
    loadCandidates(subject, now),
    buildScoringContext(),
  ]);
  if (candidates.length === 0) return null;

  const matches = await scorer().scorePeople(subject, candidates, context);
  const byId = new Map(candidates.map((c) => [c.profileId, c]));
  const excluded = new Set(options.exclude ?? []);

  const ranked = matches
    .filter((match) => !excluded.has(match.profileId))
    .map((match) => {
      const candidate = byId.get(match.profileId);
      if (!candidate) return null;

      const novelty = noveltyFor(subject, candidate, match);
      const style = styleScore(match);

      // The headline number is not the ordinary compatibility. It answers a
      // different question, so it would be dishonest to reuse the same label
      // for it, the UI calls it "unexpected compatibility".
      const score = Math.round(
        (COMPATIBILITY_WEIGHT * style + NOVELTY_WEIGHT * (novelty / 100)) * 100,
      );

      return { match, novelty, score };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .filter((row) => row.score >= MIN_FLOOR && row.novelty >= 25)
    .sort((a, b) => b.score - a.score);

  const chosen = ranked[0];
  if (!chosen) return null;

  return {
    profileId: chosen.match.profileId,
    score: chosen.score,
    novelty: chosen.novelty,
    reasons: reasonsFor(chosen.match, chosen.novelty),
    sharedInterests: chosen.match.sharedInterests,
    complementaryInterests: chosen.match.complementaryInterests,
  };
}
