import { describe, expect, it } from "vitest";
import { parseIntent } from "@/server/modules/intent/parse";
import { INTEREST_SEEDS } from "@/lib/interests";
import type { IntentCatalogue } from "@/server/modules/intent/types";

/**
 * The Bunchy Now board turns its horizon filter into a natural-language query
 * and hands it to the intent parser. That makes the exact wording load-bearing:
 * a phrase that reads as neutral to a person can parse into a goal or an
 * interest, and quietly filter the board down to people who happen to match it.
 *
 * This is what happened. "someone to do something with" parses to
 * ACTIVITY_PARTNERS, and the default view hid every member who had not ticked
 * that goal.
 */
const catalogue: IntentCatalogue = {
  interests: INTEREST_SEEDS.map((seed) => ({
    interestId: seed.slug,
    slug: seed.slug,
    label: seed.label,
  })),
};

const HORIZON_QUERIES = [
  "someone free",
  "someone free right now",
  "someone free tonight",
  "someone free this weekend",
];

describe("horizon queries", () => {
  it("carry a time and nothing else", () => {
    for (const query of HORIZON_QUERIES) {
      const intent = parseIntent(query, catalogue, { now: new Date() });
      expect(intent.goals, `"${query}" must not imply a goal`).toEqual([]);
      expect(
        intent.interestSlugs,
        `"${query}" must not imply an interest`,
      ).toEqual([]);
    }
  });

  it("still recognises the time in the ones that name one", () => {
    const tonight = parseIntent("someone free tonight", catalogue, {
      now: new Date(),
    });
    expect(tonight.when).not.toBeNull();
  });

  it("rejects the phrasing that caused the bug", () => {
    // Kept as a live example: this is what a plausible-sounding query does.
    const bad = parseIntent("someone to do something with", catalogue, {
      now: new Date(),
    });
    expect(bad.goals.length).toBeGreaterThan(0);
  });
});
