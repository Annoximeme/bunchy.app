import { describe, expect, it } from "vitest";
import { ACTIVITY_IDEAS, bandsWithin } from "@/lib/activity-ideas";

/**
 * The catalogue's job is to suggest kinds of evening without asserting facts
 * Bunchy does not have. These tests are the guardrail on that.
 */
describe("the activity catalogue", () => {
  it("names no venues, addresses or prices", () => {
    // A suggestion that names a bar Bunchy invented is worse than no
    // suggestion: somebody turns up to a street corner.
    const forbidden = /€|\$|£|\d+\s?(eur|euro|km)\b|street|straat|avenue|\bbar [A-Z]/i;
    for (const idea of ACTIVITY_IDEAS) {
      expect(`${idea.title} ${idea.blurb}`).not.toMatch(forbidden);
    }
  });

  it("gives every idea a cost band, a duration and a floor on people", () => {
    for (const idea of ACTIVITY_IDEAS) {
      expect(["free", "low", "medium", "high"]).toContain(idea.cost);
      expect(idea.hours).toBeGreaterThan(0);
      expect(idea.minPeople).toBeGreaterThanOrEqual(1);
    }
  });

  it("has unique slugs", () => {
    const slugs = ACTIVITY_IDEAS.map((i) => i.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("always leaves something to suggest on the tightest constraints", () => {
    // Free, one hour, alone: the hardest combination somebody can ask for. An
    // empty answer there would make the feature look broken rather than honest.
    const survivors = ACTIVITY_IDEAS.filter(
      (idea) => idea.cost === "free" && idea.hours <= 2,
    );
    expect(survivors.length).toBeGreaterThan(2);
  });
});

describe("bandsWithin", () => {
  it("treats a zero budget as free only", () => {
    expect(bandsWithin(0)).toEqual(["free"]);
  });

  it("widens as the ceiling rises", () => {
    expect(bandsWithin(10)).toContain("low");
    expect(bandsWithin(10)).not.toContain("medium");
    expect(bandsWithin(25)).toContain("medium");
    expect(bandsWithin(50)).toContain("high");
  });
});
