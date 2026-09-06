import { describe, expect, it } from "vitest";
import { pairGroups } from "@/server/modules/bunches/pairing";
import type { PairScores } from "@/server/modules/bunches/formation";
import type { MatchProfile } from "@/server/modules/matching/types";

/**
 * Scoring an evening between two groups.
 *
 * The case this exists for is the last one: a pairing where everybody clicks
 * except one person, who would spend the evening standing at the edge of the
 * room. It is the thing that actually goes wrong when two groups meet, and it
 * is invisible to an average.
 */

function person(id: string, interests: string[] = []): MatchProfile {
  return {
    profileId: id,
    displayName: id,
    age: 30,
    location: {
      countryCode: "BE",
      regionLabel: null,
      cityLabel: "Antwerp",
      approxLat: null,
      approxLng: null,
    },
    interests: interests.map((slug) => ({
      interestId: slug,
      slug,
      label: slug[0]!.toUpperCase() + slug.slice(1),
      category: "General",
      strength: 2,
      intent: "PRACTICES" as const,
    })),
    goals: [],
    availability: [],
    languages: [],
    timezone: null,
    personality: null,
    bunchIds: [],
    attendedActivityIds: [],
    provenActivityIds: [],
    participationScore: 0.5,
  };
}

/** Scores read from a table, defaulting to a poor pair. */
function scoresFrom(pairs: Record<string, number>): PairScores {
  return {
    get: (a, b) => pairs[`${a}|${b}`] ?? pairs[`${b}|${a}`] ?? 0.1,
  };
}

describe("pairGroups", () => {
  it("says nothing about an empty group", () => {
    const result = pairGroups([person("a")], [], scoresFrom({}));
    expect(result.everyoneHasSomeone).toBe(0);
  });

  it("scores a pairing where everybody has somebody", () => {
    const host = [person("a"), person("b")];
    const guest = [person("x"), person("y")];
    const result = pairGroups(
      host,
      guest,
      scoresFrom({ "a|x": 0.8, "b|y": 0.75, "a|y": 0.6, "b|x": 0.7 }),
    );

    expect(result.everyoneHasSomeone).toBe(75);
    expect(result.reasons).toContain("Everybody would have somebody to talk to");
  });

  it("is dragged down by the one person nobody matches", () => {
    const host = [person("a"), person("b"), person("stranded")];
    const guest = [person("x"), person("y")];
    // Two strong pairs, and one member who matches nobody in the other group.
    const scores = scoresFrom({
      "a|x": 0.9,
      "a|y": 0.85,
      "b|x": 0.88,
      "b|y": 0.9,
      "stranded|x": 0.12,
      "stranded|y": 0.1,
    });

    const result = pairGroups(host, guest, scores);

    // The average is excellent and the answer is still no.
    expect(result.typical).toBeGreaterThan(60);
    expect(result.everyoneHasSomeone).toBeLessThan(20);
  });

  it("names what the two groups have in common", () => {
    const host = [person("a", ["climbing", "chess"])];
    const guest = [person("x", ["climbing"])];

    const result = pairGroups(host, guest, scoresFrom({ "a|x": 0.7 }));

    expect(result.sharedInterests).toEqual(["Climbing"]);
    expect(result.reasons[0]).toContain("climbing");
  });
});
