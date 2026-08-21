import { describe, expect, it } from "vitest";
import { diversifyLeads } from "@/server/modules/matching/diversify";
import type { PersonMatch, SignalName } from "@/server/modules/matching/types";

/**
 * The case these exist for is the real Discover page that prompted the change:
 * eight cards, five of them leading with "You're both looking for new friends".
 */

function match(
  id: string,
  reasons: [SignalName, string][],
): PersonMatch {
  return {
    profileId: id,
    score: 80,
    signals: reasons.map(([signal, reason]) => ({
      signal,
      score: 0.8,
      weight: 1,
      reason,
    })),
    highlights: reasons.map(([, reason]) => reason),
    sharedInterests: [],
    complementaryInterests: [],
  };
}

const GOALS = "You're both looking for new friends";
const GOALS_2 = "You're both looking for new friends and local communities";

describe("diversifying the lead reason", () => {
  it("stops the same sentence leading twice", () => {
    const out = diversifyLeads([
      match("a", [["social_goals", GOALS], ["availability", "Both free weekday evenings"]]),
      match("b", [["social_goals", GOALS], ["location", "Both around Antwerp"]]),
    ]);

    expect(out[0]!.highlights[0]).toBe(GOALS);
    expect(out[1]!.highlights[0]).toBe("Both around Antwerp");
  });

  it("holds back a signal after two cards, even when the wording differs", () => {
    // The half a string comparison misses: these are three different sentences
    // and one observation.
    const out = diversifyLeads([
      match("a", [["social_goals", GOALS], ["availability", "Both free Thursdays"]]),
      match("b", [["social_goals", GOALS_2], ["location", "Both around Antwerp"]]),
      match("c", [["social_goals", "You're both looking for hobby partners"], ["personality", "Similar styles"]]),
    ]);

    expect(out[0]!.highlights[0]).toBe(GOALS);
    expect(out[1]!.highlights[0]).toBe(GOALS_2);
    // Third one is pushed off goals entirely.
    expect(out[2]!.highlights[0]).toBe("Similar styles");
  });

  it("lets genuinely different interests through, which is why the cap is two", () => {
    const out = diversifyLeads([
      match("a", [["shared_interests", "You both like Gaming and Programming"]]),
      match("b", [["shared_interests", "You both like Hiking and Photography"]]),
    ]);

    expect(out[0]!.highlights[0]).toBe("You both like Gaming and Programming");
    expect(out[1]!.highlights[0]).toBe("You both like Hiking and Photography");
  });

  it("never displaces having actually met", () => {
    const met = "You have met before, and it went well for both of you";
    const out = diversifyLeads([
      match("a", [["met_well", met], ["social_goals", GOALS]]),
      match("b", [["met_well", met], ["location", "Both around Antwerp"]]),
    ]);

    // Both keep it, repeat and all. It is the best sentence the product has and
    // it appears on almost no cards.
    expect(out[0]!.highlights[0]).toBe(met);
    expect(out[1]!.highlights[0]).toBe(met);
  });

  it("keeps the strongest reason when everything has been said", () => {
    const out = diversifyLeads([
      match("a", [["social_goals", GOALS]]),
      match("b", [["social_goals", GOALS]]),
      match("c", [["social_goals", GOALS]]),
    ]);

    // A repeated true sentence beats promoting an accurate irrelevance, and
    // this person has nothing else to say.
    expect(out[2]!.highlights[0]).toBe(GOALS);
  });

  it("loses nothing, it only reorders", () => {
    const out = diversifyLeads([
      match("a", [["social_goals", GOALS], ["availability", "Both free Thursdays"]]),
      match("b", [["social_goals", GOALS], ["location", "Both around Antwerp"]]),
    ]);

    expect([...out[1]!.highlights].sort()).toEqual([GOALS, "Both around Antwerp"].sort());
  });

  it("never reorders the cards themselves", () => {
    const out = diversifyLeads([
      match("a", [["social_goals", GOALS]]),
      match("b", [["social_goals", GOALS]]),
      match("c", [["location", "Both around Antwerp"]]),
    ]);

    expect(out.map((m) => m.profileId)).toEqual(["a", "b", "c"]);
  });

  it("fixes the page that prompted this", () => {
    // Eight cards, five of them leading on goals.
    const page = [
      match("1", [["social_goals", GOALS], ["complementary_interests", "You could get them into programming"]]),
      match("2", [["shared_interests", "You both like Strategy games"], ["social_goals", GOALS]]),
      match("3", [["social_goals", GOALS], ["personality", "Similar styles, you both prefer small groups"]]),
      match("4", [["social_goals", GOALS_2], ["availability", "Both free weekday evenings"]]),
      match("5", [["social_goals", GOALS], ["location", "Both around Antwerp"]]),
      match("6", [["social_goals", GOALS_2], ["complementary_interests", "You could get them into hiking"]]),
      match("7", [["social_goals", GOALS], ["personality", "You both go for real conversations"]]),
      match("8", [["social_goals", GOALS], ["availability", "Both free weekend afternoons"]]),
    ];

    const leads = diversifyLeads(page).map((m) => m.highlights[0]!);
    const goalLeads = leads.filter((l) => l.startsWith("You're both looking for"));

    expect(goalLeads.length).toBeLessThanOrEqual(2);
    // And no sentence appears twice.
    expect(new Set(leads).size).toBe(leads.length);
  });
});
