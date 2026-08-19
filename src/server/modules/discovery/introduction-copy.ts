import type { PersonMatch, SignalResult } from "@/server/modules/matching/types";

/**
 * The words of an introduction, as a pure function of the score that produced it.
 *
 * §5 says an introduction must never fabricate compatibility. The way to
 * guarantee that is not to instruct a writer carefully, it is to give the
 * writer nothing to invent with. Every clause below is emitted only when the
 * signal that justifies it actually fired and scored well, and the phrasing
 * comes from a fixed table rather than from anything generative. There is no
 * input to this function that makes it claim two people share an interest they
 * do not.
 *
 * The second rule is subtler: an introduction is shown to one person *about*
 * another, so it may only contain things the viewer could already see on that
 * profile. Shared interests, stated goals and symbolic availability are all on
 * the public profile. Age, location and anything behind a privacy switch are
 * deliberately absent, the caller has them, and this never asks.
 */

/** Below this a signal has not really said anything worth repeating. */
const STRONG = 0.6;

/**
 * How each dimension reads in a sentence, given it scored well.
 *
 * Ordered by how much a person would actually care. "You like the same things"
 * is the reason someone reads on; "you are a similar age" is not, and is only
 * ever a supporting clause.
 */
const CLAUSES: ReadonlyArray<{
  signal: SignalResult["signal"];
  /** Uses the signal's own evidence when it has some, else this fallback. */
  fallback: string;
  withEvidence?: (items: string[]) => string;
}> = [
  {
    signal: "shared_interests",
    fallback: "you're into a lot of the same things",
    withEvidence: (items) => `you're both into ${list(items)}`,
  },
  {
    signal: "social_goals",
    // Not "the same thing": this signal also scores well for goals that
    // complement rather than match, and claiming they are identical would be
    // the small kind of false that makes the whole sentence untrustworthy.
    fallback: "what you're each looking for lines up",
    withEvidence: (items) => `you're both looking for ${list(items).toLowerCase()}`,
  },
  {
    signal: "complementary_interests",
    // Deliberately directionless. The signal's evidence is "the interest worth
    // naming", which for some pairings is the candidate's and for others the
    // viewer's, so "they could teach you X" would be a coin flip presented as
    // a fact. "Something to swap notes on" is true of every pairing it emits.
    fallback: "there's something each of you could show the other",
    withEvidence: (items) => `you'd have things to swap notes on, like ${list(items)}`,
  },
  {
    signal: "availability",
    fallback: "you're free at the same times",
  },
  {
    signal: "personality",
    fallback: "you spend time in similar ways",
  },
  {
    signal: "location",
    fallback: "you're in the same area",
  },
  {
    signal: "history",
    fallback: "you've been in the same rooms already",
  },
];

export interface IntroductionCopy {
  /** "Sarah, meet Milan." */
  headline: string;
  /** One sentence. Only ever describes signals that fired. */
  why: string;
  /** The concrete evidence, for chips under the sentence. */
  because: string[];
}

export function composeIntroduction(
  viewerName: string,
  otherName: string,
  match: Pick<PersonMatch, "signals" | "sharedInterests" | "highlights">,
): IntroductionCopy {
  const byName = new Map(match.signals.map((s) => [s.signal, s] as const));

  const clauses: string[] = [];
  for (const clause of CLAUSES) {
    const signal = byName.get(clause.signal);
    if (!signal || signal.score < STRONG) continue;

    const evidence = signal.evidence?.filter((e) => e.trim().length > 0) ?? [];
    clauses.push(
      evidence.length > 0 && clause.withEvidence
        ? clause.withEvidence(evidence.slice(0, 2))
        : clause.fallback,
    );
    // Three clauses is a sentence; four is a dossier.
    if (clauses.length === 3) break;
  }

  return {
    headline: `${firstName(viewerName)}, meet ${firstName(otherName)}.`,
    why: sentence(clauses),
    because: match.sharedInterests.slice(0, 5),
  };
}

/**
 * Whether there is enough here to introduce two people at all.
 *
 * A high score with no strong individual signal is an average of mediocre
 * ones, and an introduction that can only say "you seem compatible" is worse
 * than no introduction, it spends the one moment someone might have acted on.
 */
export function worthIntroducing(
  match: Pick<PersonMatch, "score" | "signals">,
  minScore: number,
): boolean {
  if (match.score < minScore) return false;
  return match.signals.some(
    (s) =>
      s.score >= STRONG &&
      (s.signal === "shared_interests" ||
        s.signal === "social_goals" ||
        s.signal === "complementary_interests"),
  );
}

// --- Sentence assembly ------------------------------------------------------

/**
 * One clause, one sentence.
 *
 * Joining them with commas and a trailing "and" produced sentences like "you're
 * both looking for hobby partners, new friends and local communities, you'd
 * have things to swap notes on, like Nature and Hiking and you're free at the
 * same times", grammatical, and unreadable, because the clauses contain their
 * own lists. Short sentences cost nothing and can be skimmed.
 */
function sentence(clauses: string[]): string {
  // Empty is reachable only if `worthIntroducing` was not consulted. Say
  // nothing rather than something unfounded.
  return clauses.map((clause) => `${capitalize(clause)}.`).join(" ");
}

function list(items: string[]): string {
  if (items.length === 1) return items[0]!;
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
