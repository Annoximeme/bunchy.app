/**
 * What is this person actually asking for?
 *
 * A deterministic router, for the same reasons the intent parser is one: it
 * cannot invent a capability the product does not have, it cannot be talked
 * into anything, and it works with no key and no network.
 *
 * The set of answers is closed and small. That is a feature, a concierge that
 * appears to understand anything, then produces something plausible and wrong
 * for the nine requests out of ten it cannot serve, is worse than one that says
 * "I can do these five things" and does them properly.
 *
 * Note what is *not* here: nothing that writes. Classification decides which
 * question to answer, never which action to take, because the concierge has no
 * write capability at all, see `service.ts`.
 */

export type AskKind =
  /** "I want to play Warhammer tonight", "find someone to hike with" */
  | "find_people"
  /** "what groups are there for board games" */
  | "find_bunches"
  /** "what's happening this weekend", "anything on tonight" */
  | "find_activities"
  /** "who's around right now" */
  | "whos_up"
  /** "why am I seeing these people", "how does matching work" */
  | "explain"
  /** "what can you do" */
  | "help"
  /** Understood as a request, but not one this product serves. */
  | "unknown";

export interface Ask {
  kind: AskKind;
  /** Confidence is not a probability, it is whether a phrase actually matched. */
  matched: boolean;
}

/**
 * Phrases that decide a kind, longest and most specific first.
 *
 * Deliberately keyed on the *verb* of the sentence rather than its nouns: "what
 * bunches like board games are there" and "find someone who likes board games"
 * share every noun and want completely different answers.
 */
const RULES: ReadonlyArray<{ kind: AskKind; patterns: RegExp[] }> = [
  {
    kind: "help",
    patterns: [
      /\bwhat can you (do|help)/,
      /\bhow (do|does) (you|this|bunchy) work/,
      /\bwhat are you\b/,
      /^\s*help\s*$/,
    ],
  },
  {
    kind: "explain",
    patterns: [
      /\bwhy (am i|are these|is this|did you)\b/,
      /\bhow (are|is) (these|this|my) (match|recommend|suggest)/,
      /\bhow does matching\b/,
      /\bwhere do (these|my) (match|suggestion|recommend)/,
    ],
  },
  {
    kind: "whos_up",
    patterns: [
      /\bwho'?s (up|around|free|about|online)\b/,
      /\banyone (up|around|free)\b/,
      /\bwho is (up|around|free)\b/,
    ],
  },
  {
    kind: "find_activities",
    patterns: [
      /\bwhat'?s (happening|on|going on)\b/,
      /\banything (on|happening|to do)\b/,
      /\b(find|show|any) (me )?(an? )?(activit|event)/,
      /\bwhat can i do\b/,
      /\bthings to do\b/,
    ],
  },
  {
    kind: "find_bunches",
    patterns: [
      /\b(find|show|any|what|which|are there) .{0,20}\bbunch(es)?\b/,
      /\bgroups? (for|about|around)\b/,
      /\bjoin a (bunch|group)\b/,
    ],
  },
  {
    kind: "find_people",
    patterns: [
      /\bfind (me )?(someone|somebody|people|a person)\b/,
      /\bwho (likes|is into|plays|does)\b/,
      /\bi (want|would like|'d like|wanna) to\b/,
      /\blooking for (someone|people|a )/,
      /\bsomeone to\b/,
      /\bmeet (people|someone|new people)\b/,
      /\bstart a (bunch|group)\b/,
    ],
  },
];

export function classify(text: string): Ask {
  const lower = text.toLowerCase().trim();
  if (lower.length === 0) return { kind: "unknown", matched: false };

  for (const rule of RULES) {
    if (rule.patterns.some((pattern) => pattern.test(lower))) {
      return { kind: rule.kind, matched: true };
    }
  }

  // Nothing matched a verb. A bare noun phrase, "board games", "hiking
  // Saturday", is overwhelmingly a request to find people for it, which is
  // also the answer that degrades most gracefully when the guess is wrong:
  // it shows real people and an honest empty state rather than a wrong answer.
  return { kind: "find_people", matched: false };
}
