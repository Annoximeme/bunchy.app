import { describe, expect, it } from "vitest";
import {
  proposeBunches,
  type PairScores,
} from "@/server/modules/bunches/formation";
import type { MatchProfile } from "@/server/modules/matching/types";

function person(id: string, interests: string[] = [], city = "Antwerp"): MatchProfile {
  return {
    profileId: id,
    displayName: id,
    age: 30,
    location: { countryCode: "BE", regionLabel: null, cityLabel: city, approxLat: null, approxLng: null },
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
    personality: null,
    bunchIds: [],
    attendedActivityIds: [],
    participationScore: 0.5,
  };
}

/** Pair scores from an explicit table; anything unlisted is `fallback`. */
function table(entries: Array<[string, string, number]>, fallback = 0.1): PairScores {
  const map = new Map<string, number>();
  for (const [a, b, s] of entries) {
    map.set(`${a}|${b}`, s);
    map.set(`${b}|${a}`, s);
  }
  return { get: (a, b) => map.get(`${a}|${b}`) ?? fallback };
}

/** Everyone scores `s` with everyone. */
function uniform(s: number): PairScores {
  return { get: () => s };
}

describe("proposeBunches", () => {
  it("forms nothing from a pool too small to make a bunch", () => {
    const pool = [person("a"), person("b"), person("c")];
    expect(proposeBunches(pool, uniform(0.9)).proposals).toEqual([]);
  });

  it("forms a group when the pool is compatible and big enough", () => {
    const pool = ["a", "b", "c", "d", "e", "f"].map((id) => person(id, ["hiking"]));
    const [proposal] = proposeBunches(pool, uniform(0.8)).proposals;

    expect(proposal).toBeDefined();
    expect(proposal!.members.length).toBeGreaterThanOrEqual(5);
    expect(proposal!.cohesion).toBe(80);
    expect(proposal!.commonInterests).toContain("Hiking");
  });

  it("refuses to build a group nobody in it actually fits", () => {
    const pool = ["a", "b", "c", "d", "e", "f"].map((id) => person(id));
    expect(proposeBunches(pool, uniform(0.2)).proposals).toEqual([]);
  });

  it("rejects a star: one popular person and strangers around them", () => {
    // `hub` matches everyone; the spokes match nobody but the hub. That is a
    // great recommendation list and a terrible bunch.
    const pool = ["hub", "s1", "s2", "s3", "s4", "s5"].map((id) => person(id));
    const scores = table([
      ["hub", "s1", 0.95],
      ["hub", "s2", 0.95],
      ["hub", "s3", 0.95],
      ["hub", "s4", 0.95],
      ["hub", "s5", 0.95],
    ]);

    expect(proposeBunches(pool, scores).proposals).toEqual([]);
  });

  it("admits on the weakest link, so no pair is left below the floor", () => {
    const pool = ["a", "b", "c", "d", "e", "f", "g"].map((id) => person(id));
    const { proposals } = proposeBunches(pool, uniform(0.7), { floor: 0.6 });
    for (const proposal of proposals) {
      expect(proposal.weakestPair).toBeGreaterThanOrEqual(60);
    }
  });

  it("never puts the same person in two proposals", () => {
    const pool = Array.from({ length: 20 }, (_, i) => person(`p${i}`, ["gaming"]));
    const { proposals } = proposeBunches(pool, uniform(0.8), { maxProposals: 3 });

    const seen = new Set<string>();
    for (const proposal of proposals) {
      for (const member of proposal.members) {
        expect(seen.has(member.profileId)).toBe(false);
        seen.add(member.profileId);
      }
    }
    expect(proposals.length).toBeGreaterThan(1);
  });

  it("starts from the person with the fewest options, not the most", () => {
    // `lonely` fits only three people. A greedy pass seeded on the most
    // connected member would fill up elsewhere and strand them.
    const pool = ["lonely", "a", "b", "c", "d", "e", "f", "g"].map((id) => person(id));
    const scores = table(
      [
        ["lonely", "a", 0.8],
        ["lonely", "b", 0.8],
        ["lonely", "c", 0.8],
        ["lonely", "d", 0.8],
        ["a", "b", 0.8], ["a", "c", 0.8], ["a", "d", 0.8],
        ["b", "c", 0.8], ["b", "d", 0.8], ["c", "d", 0.8],
        ["e", "f", 0.9], ["e", "g", 0.9], ["f", "g", 0.9],
      ],
      0.1,
    );

    const [first] = proposeBunches(pool, scores, { minSize: 5, targetSize: 5 }).proposals;
    expect(first).toBeDefined();
    expect(first!.members.map((m) => m.profileId)).toContain("lonely");
  });

  it("reports who it could not place instead of returning nothing", () => {
    // `stranded` fits nobody. Before, seeding on them abandoned the whole pass
    // and the five people who *would* have formed a bunch got nothing.
    const ids = ["stranded", "a", "b", "c", "d", "e"];
    const pool = ids.map((id) => person(id));
    const scores = table(
      ids
        .filter((id) => id !== "stranded")
        .flatMap((a, i, rest) =>
          rest.slice(i + 1).map((b) => [a, b, 0.8] as [string, string, number]),
        ),
      0.1,
    );

    const { proposals, unplaced } = proposeBunches(pool, scores, {
      minSize: 5,
      targetSize: 5,
    });

    expect(unplaced).toEqual(["stranded"]);
    expect(proposals).toHaveLength(1);
    expect(proposals[0]!.members.map((m) => m.profileId)).not.toContain("stranded");
  });

  it("reports each member's fit with the rest of the group", () => {
    const pool = ["a", "b", "c", "d", "e"].map((id) => person(id));
    const scores = table(
      [
        ["a", "b", 0.9], ["a", "c", 0.9], ["a", "d", 0.9], ["a", "e", 0.9],
        ["b", "c", 0.6], ["b", "d", 0.6], ["b", "e", 0.6],
        ["c", "d", 0.6], ["c", "e", 0.6], ["d", "e", 0.6],
      ],
      0.1,
    );
    const [proposal] = proposeBunches(pool, scores, { minSize: 5, targetSize: 5, floor: 0.5 }).proposals;

    const a = proposal!.members.find((m) => m.profileId === "a")!;
    const b = proposal!.members.find((m) => m.profileId === "b")!;
    expect(a.fit).toBeGreaterThan(b.fit);
  });

  it("explains itself in sentences a human can check", () => {
    const pool = ["a", "b", "c", "d", "e"].map((id) => person(id, ["climbing"], "Ghent"));
    const [proposal] = proposeBunches(pool, uniform(0.75), { minSize: 5, targetSize: 5 }).proposals;

    expect(proposal!.rationale.join(" ")).toMatch(/climbing/i);
    expect(proposal!.rationale.join(" ")).toMatch(/Ghent/);
    expect(proposal!.rationale.join(" ")).toMatch(/not in any bunch yet/);
    expect(proposal!.suggestedName).toBe("Climbing in Ghent");
  });

  it("only names a city the whole group actually shares", () => {
    const pool = [
      person("a", ["gaming"], "Antwerp"),
      person("b", ["gaming"], "Antwerp"),
      person("c", ["gaming"], "Antwerp"),
      person("d", ["gaming"], "Antwerp"),
      person("e", ["gaming"], "Tokyo"),
    ];
    const [proposal] = proposeBunches(pool, uniform(0.8), {
      minSize: 5,
      targetSize: 5,
    }).proposals;

    // Naming this "Gaming in Tokyo" because one member is enumerated first is
    // worse than naming it nothing.
    expect(proposal!.suggestedName).toBe("Gaming");
    expect(proposal!.rationale.join(" ")).not.toMatch(/Everyone is around/);
  });

  it("names the city when everyone really is in it", () => {
    const pool = ["a", "b", "c", "d", "e"].map((id) => person(id, ["gaming"], "Antwerp"));
    const [proposal] = proposeBunches(pool, uniform(0.8), {
      minSize: 5,
      targetSize: 5,
    }).proposals;

    expect(proposal!.suggestedName).toBe("Gaming in Antwerp");
    expect(proposal!.rationale.join(" ")).toMatch(/Everyone is around Antwerp/);
  });

  it("counts an interest as common only when half the group holds it", () => {
    const pool = [
      person("a", ["chess"]),
      person("b", ["chess"]),
      person("c", ["chess"]),
      person("d", ["baking"]),
      person("e", ["pottery"]),
    ];
    const [proposal] = proposeBunches(pool, uniform(0.8), { minSize: 5, targetSize: 5 }).proposals;

    expect(proposal!.commonInterests).toEqual(["Chess"]);
  });
});
