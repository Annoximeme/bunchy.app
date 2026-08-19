import { describe, expect, it } from "vitest";
import {
  composeIntroduction,
  worthIntroducing,
} from "@/server/modules/discovery/introduction-copy";
import type { PersonMatch, SignalResult } from "@/server/modules/matching/types";

/**
 * An introduction is the most load-bearing sentence in the product: it is
 * Bunchy telling one member something about another, unprompted. §5 forbids
 * fabricating compatibility and §23 forbids leaking anything private, and both
 * are enforced here by the copy having no vocabulary of its own, it can only
 * repeat evidence a signal actually produced.
 *
 * These tests are mostly attempts to make it lie.
 */

function signal(
  name: SignalResult["signal"],
  score: number,
  evidence?: string[],
): SignalResult {
  return { signal: name, score, weight: 1, ...(evidence ? { evidence } : {}) };
}

function match(overrides: Partial<PersonMatch> = {}): PersonMatch {
  return {
    profileId: "p1",
    score: 88,
    signals: [],
    highlights: [],
    sharedInterests: [],
    complementaryInterests: [],
    ...overrides,
  };
}

describe("what it says", () => {
  it("names both people by first name", () => {
    const copy = composeIntroduction("Sarah de Vries", "Milan Janssens", match({
      signals: [signal("shared_interests", 0.9, ["Warhammer"])],
    }));

    expect(copy.headline).toBe("Sarah, meet Milan.");
  });

  it("repeats the evidence the scorer actually produced", () => {
    const copy = composeIntroduction("Sarah", "Milan", match({
      signals: [
        signal("shared_interests", 0.9, ["Strategy games", "Gaming"]),
        signal("social_goals", 0.8, ["Gaming friends"]),
      ],
    }));

    // One clause per sentence: joining them with commas produced sentences
    // whose own lists ran into each other.
    expect(copy.why).toBe(
      "You're both into Strategy games and Gaming. You're both looking for gaming friends.",
    );
  });

  it("stops at three clauses", () => {
    const copy = composeIntroduction("Sarah", "Milan", match({
      signals: [
        signal("shared_interests", 0.9, ["Gaming"]),
        signal("social_goals", 0.9, ["New friends"]),
        signal("availability", 0.9),
        signal("personality", 0.9),
        signal("location", 0.9),
        signal("history", 0.9),
      ],
    }));

    // Four reasons is a dossier, not an introduction.
    expect(copy.why.match(/\./g)?.length).toBe(3);
    expect(copy.why).toContain("You're free at the same times");
    expect(copy.why).not.toContain("same area");
  });

  it("reads as a sentence with one reason", () => {
    const copy = composeIntroduction("Sarah", "Milan", match({
      signals: [signal("shared_interests", 0.9, ["Hiking"])],
    }));
    expect(copy.why).toBe("You're both into Hiking.");
  });
});

describe("what it refuses to say", () => {
  it("says nothing about a signal that scored badly", () => {
    const copy = composeIntroduction("Sarah", "Milan", match({
      signals: [
        signal("shared_interests", 0.9, ["Gaming"]),
        // They are nowhere near each other and never free at the same time.
        signal("location", 0.05),
        signal("availability", 0.1),
      ],
    }));

    expect(copy.why).toBe("You're both into Gaming.");
    expect(copy.why).not.toContain("area");
    expect(copy.why).not.toContain("free");
  });

  it("says nothing at all when no signal fired", () => {
    const copy = composeIntroduction("Sarah", "Milan", match({ signals: [] }));
    expect(copy.why).toBe("");
  });

  it("never claims a shared interest that is not in the evidence", () => {
    const copy = composeIntroduction("Sarah", "Milan", match({
      signals: [signal("shared_interests", 0.9, ["Hiking"])],
      sharedInterests: ["Hiking"],
    }));

    // The only interest anywhere in the output is the one that was passed in.
    expect(copy.why).toContain("Hiking");
    expect(copy.because).toEqual(["Hiking"]);
    expect(copy.why).not.toMatch(/Warhammer|Gaming|Cooking/);
  });

  it("does not claim identical goals when the signal only says they fit", () => {
    // High score, no overlapping labels: this happens for goals that
    // complement each other rather than match.
    const copy = composeIntroduction("Sarah", "Milan", match({
      signals: [signal("social_goals", 0.8, [])],
    }));

    expect(copy.why).toBe("What you're each looking for lines up.");
    expect(copy.why).not.toContain("both looking for");
  });

  it("does not guess who would teach whom", () => {
    // The signal's evidence is "the interest worth naming" and its direction
    // varies by pairing, so a "they could teach you X" phrasing would be a coin
    // flip stated as a fact.
    const copy = composeIntroduction("Sarah", "Milan", match({
      signals: [signal("complementary_interests", 0.8, ["Photography"])],
    }));

    expect(copy.why).toBe("You'd have things to swap notes on, like Photography.");
    expect(copy.why).not.toMatch(/teach|curious|show you/);
  });

  it("carries nothing but interests and goals", () => {
    // Age, location detail and anything behind a privacy switch are not
    // available to this function at all, it is given a match, not a profile.
    const copy = composeIntroduction("Sarah", "Milan", match({
      signals: [
        signal("shared_interests", 0.9, ["Gaming"]),
        signal("age", 0.95),
        signal("location", 0.95),
      ],
      sharedInterests: ["Gaming"],
    }));

    const everything = `${copy.headline} ${copy.why} ${copy.because.join(" ")}`;
    expect(everything).not.toMatch(/\d/);
    expect(everything).not.toContain("@");
  });
});

describe("whether to introduce at all", () => {
  it("wants a real reason, not just a good average", () => {
    // 82% built from a pile of mediocre signals. An introduction that can only
    // say "you seem compatible" spends the one moment someone might act on.
    const bland = match({
      score: 82,
      signals: [
        signal("availability", 0.65),
        signal("location", 0.7),
        signal("age", 0.9),
        signal("personality", 0.62),
      ],
    });

    expect(worthIntroducing(bland, 75)).toBe(false);
  });

  it("introduces on a strong interest match", () => {
    expect(
      worthIntroducing(
        match({ score: 80, signals: [signal("shared_interests", 0.7, ["Gaming"])] }),
        75,
      ),
    ).toBe(true);
  });

  it("respects the score floor", () => {
    const strong = match({
      score: 60,
      signals: [signal("shared_interests", 0.95, ["Gaming"])],
    });
    expect(worthIntroducing(strong, 75)).toBe(false);
  });
});
