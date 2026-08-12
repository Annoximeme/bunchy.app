import { describe, expect, it } from "vitest";
import { DeterministicScorer } from "@/server/modules/matching/deterministic";
import type {
  MatchInterest,
  MatchProfile,
  ScoringContext,
} from "@/server/modules/matching/types";
import { INTEREST_BY_SLUG } from "@/lib/interests";

const scorer = new DeterministicScorer();

const context: ScoringContext = {
  // Neutral rarity keeps these tests about the logic, not the corpus.
  interestRarity: () => 0.5,
  now: new Date("2026-01-01T12:00:00Z"),
};

function interest(
  slug: string,
  options: Partial<Pick<MatchInterest, "strength" | "intent">> = {},
): MatchInterest {
  const seed = INTEREST_BY_SLUG.get(slug);
  if (!seed) throw new Error(`Unknown interest in test fixture: ${slug}`);
  return {
    interestId: slug,
    slug,
    label: seed.label,
    category: seed.category,
    strength: options.strength ?? 2,
    intent: options.intent ?? "PRACTICES",
  };
}

function profile(overrides: Partial<MatchProfile> = {}): MatchProfile {
  return {
    profileId: overrides.profileId ?? "p-test",
    displayName: overrides.displayName ?? "Test",
    // `??` would swallow an explicit null, which several tests rely on.
    age: "age" in overrides ? (overrides.age ?? null) : 30,
    location: overrides.location ?? {
      countryCode: "BE",
      regionLabel: "Antwerp region",
      cityLabel: "Antwerp",
      approxLat: 51.225,
      approxLng: 4.425,
    },
    interests: overrides.interests ?? [],
    goals: overrides.goals ?? ["NEW_FRIENDS"],
    availability: overrides.availability ?? ["WEEKEND_AFTERNOON"],
    personality: overrides.personality ?? null,
    bunchIds: overrides.bunchIds ?? [],
    attendedActivityIds: overrides.attendedActivityIds ?? [],
    participationScore: overrides.participationScore ?? 0.5,
  };
}

describe("DeterministicScorer", () => {
  it("scores a strong match higher than a weak one", async () => {
    const subject = profile({
      profileId: "subject",
      interests: [interest("gaming", { strength: 3 }), interest("ai"), interest("movies")],
      goals: ["GAMING_FRIENDS", "NEW_FRIENDS"],
      availability: ["WEEKDAY_EVENING", "WEEKEND_EVENING"],
    });

    const strong = profile({
      profileId: "strong",
      interests: [interest("gaming", { strength: 3 }), interest("ai"), interest("movies")],
      goals: ["GAMING_FRIENDS", "NEW_FRIENDS"],
      availability: ["WEEKDAY_EVENING", "WEEKEND_EVENING"],
    });

    const weak = profile({
      profileId: "weak",
      age: 61,
      interests: [interest("gardening"), interest("birdwatching")],
      goals: ["BUSINESS_PARTNERS"],
      availability: ["WEEKDAY_MORNING"],
      location: {
        countryCode: "JP",
        regionLabel: "Tokyo",
        cityLabel: "Tokyo",
        approxLat: 35.675,
        approxLng: 139.675,
      },
    });

    const [strongMatch, weakMatch] = await scorer.scorePeople(
      subject,
      [strong, weak],
      context,
    );

    expect(strongMatch!.score).toBeGreaterThan(weakMatch!.score);
    expect(strongMatch!.score).toBeGreaterThan(80);
    expect(weakMatch!.score).toBeLessThan(45);
  });

  it("keeps scores inside 0-100", async () => {
    const empty = profile({ profileId: "a", goals: [], availability: [] });
    const other = profile({ profileId: "b", goals: [], availability: [] });
    const [match] = await scorer.scorePeople(empty, [other], context);
    expect(match!.score).toBeGreaterThanOrEqual(0);
    expect(match!.score).toBeLessThanOrEqual(100);
  });

  /**
   * The case the product brief calls out by name. These two share no interest
   * at all, so any scorer built on tag intersection ranks them near zero — and
   * gets the answer wrong, because they have an obvious afternoon together.
   */
  it("matches an experienced photographer with someone curious about photography", async () => {
    const photographer = profile({
      profileId: "photographer",
      displayName: "Photographer",
      interests: [
        interest("photography", { strength: 3, intent: "PRACTICES" }),
        interest("city-walks", { strength: 2, intent: "PRACTICES" }),
      ],
      goals: ["HOBBY_PARTNERS", "LOCAL_COMMUNITIES"],
      availability: ["WEEKEND_AFTERNOON"],
    });

    const learner = profile({
      profileId: "learner",
      displayName: "Learner",
      interests: [
        interest("hiking", { strength: 3, intent: "PRACTICES" }),
        interest("photography", { strength: 2, intent: "CURIOUS" }),
      ],
      goals: ["HOBBY_PARTNERS", "NEW_FRIENDS"],
      availability: ["WEEKEND_AFTERNOON"],
    });

    // Someone with an identical-looking profile but nothing to offer or learn.
    const strangerInAnotherWorld = profile({
      profileId: "unrelated",
      interests: [interest("investing"), interest("marketing")],
      goals: ["BUSINESS_PARTNERS"],
      availability: ["WEEKDAY_MORNING"],
    });

    const [learnerMatch, unrelatedMatch] = await scorer.scorePeople(
      photographer,
      [learner, strangerInAnotherWorld],
      context,
    );

    expect(learnerMatch!.score).toBeGreaterThan(unrelatedMatch!.score + 20);
    expect(learnerMatch!.complementaryInterests.length).toBeGreaterThan(0);

    const complementary = learnerMatch!.signals.find(
      (s) => s.signal === "complementary_interests",
    );
    expect(complementary).toBeDefined();
    expect(complementary!.score).toBeGreaterThan(0.5);
  });

  it("rewards the teach/learn asymmetry over two identical practitioners", () => {
    const teacher = profile({
      profileId: "teacher",
      interests: [interest("photography", { strength: 3, intent: "PRACTICES" })],
    });
    const curious = profile({
      profileId: "curious",
      interests: [interest("photography", { strength: 3, intent: "CURIOUS" })],
    });
    const mirror = profile({
      profileId: "mirror",
      interests: [interest("photography", { strength: 3, intent: "PRACTICES" })],
    });

    const complementaryScore = scorer
      .score(teacher, curious, context)
      .signals.find((s) => s.signal === "complementary_interests")!.score;
    const mirrorScore = scorer
      .score(teacher, mirror, context)
      .signals.find((s) => s.signal === "complementary_interests")!.score;

    expect(complementaryScore).toBeGreaterThan(mirrorScore);
  });

  it("does not reduce to counting shared tags", () => {
    // Four shared interests, but nothing else lines up.
    const manyTagsNoFit = scorer.score(
      profile({
        profileId: "a",
        age: 22,
        goals: ["STUDY_PARTNERS"],
        availability: ["WEEKDAY_MORNING"],
        interests: [
          interest("music"),
          interest("movies"),
          interest("food"),
          interest("travel"),
        ],
      }),
      profile({
        profileId: "b",
        age: 58,
        goals: ["BUSINESS_PARTNERS"],
        availability: ["LATE_NIGHT"],
        interests: [
          interest("music"),
          interest("movies"),
          interest("food"),
          interest("travel"),
        ],
        location: {
          countryCode: "AU",
          regionLabel: "New South Wales",
          cityLabel: "Sydney",
          approxLat: -33.875,
          approxLng: 151.225,
        },
      }),
      context,
    );

    // Two shared interests, but everything else fits.
    const fewTagsGoodFit = scorer.score(
      profile({
        profileId: "c",
        age: 29,
        goals: ["HOBBY_PARTNERS", "LOCAL_COMMUNITIES"],
        availability: ["WEEKEND_AFTERNOON", "WEEKDAY_EVENING"],
        interests: [interest("board-games", { strength: 3 }), interest("coffee")],
      }),
      profile({
        profileId: "d",
        age: 31,
        goals: ["HOBBY_PARTNERS", "LOCAL_COMMUNITIES"],
        availability: ["WEEKEND_AFTERNOON", "WEEKDAY_EVENING"],
        interests: [interest("board-games", { strength: 3 }), interest("coffee")],
      }),
      context,
    );

    expect(fewTagsGoodFit.score).toBeGreaterThan(manyTagsNoFit.score);
  });

  it("weighs distance less for online-first people than for place-bound ones", () => {
    const onlineTraits = {
      introversionExtraversion: 40,
      spontaneityPlanning: 50,
      competitiveRelaxed: 50,
      deepCasual: 50,
      onlineOffline: 5,
      smallLargeGroups: 40,
      nightMorning: 30,
    };
    const offlineTraits = { ...onlineTraits, onlineOffline: 95 };

    const farAway = {
      countryCode: "PL",
      regionLabel: "Masovia",
      cityLabel: "Warsaw",
      approxLat: 52.225,
      approxLng: 21.025,
    };

    const onlinePair = scorer.score(
      profile({
        profileId: "on-a",
        personality: onlineTraits,
        goals: ["GAMING_FRIENDS"],
        interests: [interest("gaming", { strength: 3 })],
      }),
      profile({
        profileId: "on-b",
        personality: onlineTraits,
        goals: ["GAMING_FRIENDS"],
        interests: [interest("gaming", { strength: 3 })],
        location: farAway,
      }),
      context,
    );

    const offlinePair = scorer.score(
      profile({
        profileId: "off-a",
        personality: offlineTraits,
        goals: ["LOCAL_COMMUNITIES", "GOING_OUT"],
        interests: [interest("gaming", { strength: 3 })],
      }),
      profile({
        profileId: "off-b",
        personality: offlineTraits,
        goals: ["LOCAL_COMMUNITIES", "GOING_OUT"],
        interests: [interest("gaming", { strength: 3 })],
        location: farAway,
      }),
      context,
    );

    // Same distance penalty, but it should cost the offline pair much more.
    expect(onlinePair.score).toBeGreaterThan(offlinePair.score);
  });

  it("treats missing data as unknown rather than incompatible", () => {
    const complete = profile({
      profileId: "complete",
      interests: [interest("hiking", { strength: 3 })],
      goals: ["HOBBY_PARTNERS"],
      availability: ["WEEKEND_AFTERNOON"],
      personality: {
        introversionExtraversion: 50,
        spontaneityPlanning: 50,
        competitiveRelaxed: 50,
        deepCasual: 50,
        onlineOffline: 70,
        smallLargeGroups: 40,
        nightMorning: 50,
      },
    });

    const sparse = profile({
      profileId: "sparse",
      age: null,
      interests: [interest("hiking", { strength: 3 })],
      goals: [],
      availability: [],
      personality: null,
    });

    const match = scorer.score(complete, sparse, context);
    const signalNames = match.signals.map((s) => s.signal);

    expect(signalNames).not.toContain("personality");
    expect(signalNames).not.toContain("availability");
    expect(signalNames).not.toContain("age");
    // Still a respectable score: they genuinely share a strong interest.
    expect(match.score).toBeGreaterThan(40);
  });

  it("explains every recommendation it makes", () => {
    const match = scorer.score(
      profile({
        profileId: "a",
        interests: [interest("warhammer", { strength: 3 }), interest("strategy-games")],
        goals: ["HOBBY_PARTNERS"],
        availability: ["WEEKEND_AFTERNOON"],
      }),
      profile({
        profileId: "b",
        interests: [interest("warhammer", { strength: 3 }), interest("board-games")],
        goals: ["HOBBY_PARTNERS"],
        availability: ["WEEKEND_AFTERNOON"],
      }),
      context,
    );

    expect(match.highlights.length).toBeGreaterThan(0);
    for (const highlight of match.highlights) {
      expect(highlight.trim().length).toBeGreaterThan(0);
    }
    expect(match.sharedInterests).toContain("Warhammer");
  });

  it("ranks rare shared interests above generic ones", () => {
    const rarityAware: ScoringContext = {
      ...context,
      interestRarity: (id) => (id === "warhammer" ? 1 : 0.05),
    };

    const subject = profile({
      profileId: "subject",
      interests: [interest("warhammer", { strength: 3 }), interest("music", { strength: 3 })],
    });

    const nicheMatch = scorer.score(
      subject,
      profile({ profileId: "niche", interests: [interest("warhammer", { strength: 3 })] }),
      rarityAware,
    );
    const genericMatch = scorer.score(
      subject,
      profile({ profileId: "generic", interests: [interest("music", { strength: 3 })] }),
      rarityAware,
    );

    expect(nicheMatch.score).toBeGreaterThan(genericMatch.score);
  });
});
