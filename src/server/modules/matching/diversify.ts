import type { PersonMatch, SignalName } from "@/server/modules/matching/types";

/**
 * Stop every card leading with the same sentence.
 *
 * ## The problem
 *
 * `buildHighlights` picks the strongest reason for a pair, which is correct in
 * isolation and wrong in a column. It only ever sees two people, so it cannot
 * know that it has already said the same thing four times further up. On a real
 * Discover page, "You're both looking for new friends" led five of eight cards.
 *
 * That was survivable while the reason was a bullet under a percentage. It
 * stopped being survivable when the reason became the card's headline: eight
 * people rendered as one sentence repeated, which reads as the product having
 * nothing to say about anybody.
 *
 * ## The rule
 *
 * Two limits, because the repeats have two different causes and one limit fixes
 * only half of it.
 *
 * A reason **string** may lead once. This is the obvious case and it is most of
 * the problem.
 *
 * A **signal** may lead twice. `social_goals` phrases itself from a small set
 * of goals, so it produces sentences that differ by a word or two and are the
 * same observation: "looking for new friends", "looking for new friends and
 * local communities". Deduplicating those on the string alone lets four of them
 * through. Meanwhile `shared_interests` names the actual interests, so two of
 * its sentences are genuinely different information and forcing the second card
 * onto a weaker reason would make the page less useful, not more. Hence two,
 * not one.
 *
 * ## What it never touches
 *
 * `met_well` always leads when it is present. It is the only signal built on
 * what actually happened rather than on what somebody typed, it appears on
 * almost no cards, and it is the single most compelling line the product can
 * print. Rotating it away to avoid a repeat would be trading the best sentence
 * on the page for variety.
 *
 * Nothing is deleted. A displaced reason keeps its place in the list under the
 * headline, so the card still says everything it knew; only the order changes.
 * And ranking is untouched: this reorders sentences within a card, never the
 * cards themselves.
 */

/** How many cards may lead with the same signal before it is held back. */
const MAX_PER_SIGNAL = 2;

function signalOf(match: PersonMatch, reason: string): SignalName | undefined {
  return match.signals.find((s) => s.reason === reason)?.signal;
}

export function diversifyLeads<T extends PersonMatch>(ranked: T[]): T[] {
  const usedReasons = new Set<string>();
  const signalLeads = new Map<SignalName, number>();

  return ranked.map((match) => {
    if (match.highlights.length === 0) return match;

    const options = match.highlights.map((reason) => ({
      reason,
      signal: signalOf(match, reason),
    }));

    // Pinned, for the reason in the note above.
    if (options[0]?.signal === "met_well") {
      usedReasons.add(options[0].reason);
      return match;
    }

    const fresh = options.find((option) => {
      if (usedReasons.has(option.reason)) return false;
      if (!option.signal) return true;
      return (signalLeads.get(option.signal) ?? 0) < MAX_PER_SIGNAL;
    });

    // Everything this person could say has been said. Keep their strongest
    // rather than promoting a weak line purely to be different: a repeated true
    // sentence beats an accurate irrelevance.
    const chosen = fresh ?? options[0]!;

    usedReasons.add(chosen.reason);
    if (chosen.signal) {
      signalLeads.set(chosen.signal, (signalLeads.get(chosen.signal) ?? 0) + 1);
    }

    if (chosen.reason === match.highlights[0]) return match;

    return {
      ...match,
      highlights: [
        chosen.reason,
        ...match.highlights.filter((h) => h !== chosen.reason),
      ],
    };
  });
}
