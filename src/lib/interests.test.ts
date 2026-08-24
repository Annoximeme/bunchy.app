import { describe, expect, it } from "vitest";
import { INTEREST_SEEDS, interestInSentence } from "@/lib/interests";

/**
 * Interest labels, as they read inside a sentence.
 *
 * The seven labels below are the reason this function exists. Discover builds
 * its reasons out of interest labels and lower-cased all of them, which is
 * right for eighty-two of the eighty-nine and produced "Programming and ai go
 * well together" for the rest, on the most-read page in the product.
 */

/** Every seeded label whose capitals carry meaning. */
const CARRY_CAPITALS = [
  "RPGs",
  "Dungeons & Dragons",
  "AI",
  "PC building",
  "3D printing",
  "TV",
  "DIY",
];

describe("interestInSentence", () => {
  it.each(CARRY_CAPITALS)("leaves %s alone", (label) => {
    expect(interestInSentence(label)).toBe(label);
  });

  it.each(["Gaming", "Board games", "Hiking", "Live music"])(
    "lowers %s, which is ordinary prose",
    (label) => {
      expect(interestInSentence(label)).toBe(label.toLowerCase());
    },
  );

  it("touches exactly those seven of the seeded labels and no others", () => {
    // The count is asserted rather than the list, so adding an interest with
    // capitals is a deliberate act that shows up here rather than a silent
    // widening of the exception.
    const preserved = INTEREST_SEEDS.filter(
      (seed) => interestInSentence(seed.label) !== seed.label.toLowerCase(),
    ).map((seed) => seed.label);

    expect(preserved.sort()).toEqual([...CARRY_CAPITALS].sort());
  });

  it("is safe on an empty label", () => {
    // Custom interests come from members, and the slugifier can be handed
    // anything. This must not throw on the way to rendering a sentence.
    expect(() => interestInSentence("")).not.toThrow();
    expect(interestInSentence("")).toBe("");
  });

  it("lowers a single ordinary word and keeps a single capital letter", () => {
    // The rule looks at everything after the first character, so a one-letter
    // label has nothing to inspect and falls through to lowering. That is the
    // right answer for "A" and there is no real label of that shape.
    expect(interestInSentence("Chess")).toBe("chess");
    expect(interestInSentence("VR")).toBe("VR");
  });
});
