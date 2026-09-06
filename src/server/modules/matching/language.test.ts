import { describe, expect, it } from "vitest";
import { DeterministicScorer } from "@/server/modules/matching/deterministic";
import { languageSignal } from "@/server/modules/matching/signals";
import type {
  MatchLanguage,
  MatchProfile,
  ScoringContext,
} from "@/server/modules/matching/types";

/**
 * The signal that decides whether two people can talk at all.
 *
 * The case this exists for is the one at the bottom: two members with the same
 * obsession, the same free evenings and the same tram stop, who share no
 * language. Before this signal the scorer ranked that pair in the nineties,
 * which is the most confident a recommender can be about an introduction that
 * cannot go anywhere.
 */

const scorer = new DeterministicScorer();

const context: ScoringContext = {
  interestRarity: () => 0.5,
  now: new Date("2026-01-01T12:00:00Z"),
};

function profile(
  profileId: string,
  languages: MatchLanguage[],
  overrides: Partial<MatchProfile> = {},
): MatchProfile {
  return {
    profileId,
    displayName: profileId,
    age: 30,
    location: {
      countryCode: "BE",
      regionLabel: "Antwerp region",
      cityLabel: "Antwerp",
      approxLat: 51.225,
      approxLng: 4.425,
    },
    interests: [],
    goals: ["NEW_FRIENDS"],
    availability: ["WEEKEND_AFTERNOON"],
    languages,
    timezone: "Europe/Brussels",
    personality: null,
    bunchIds: [],
    attendedActivityIds: [],
    provenActivityIds: [],
    participationScore: 0.5,
    ...overrides,
  };
}

const fluent = (code: string): MatchLanguage => ({ code, fluency: "FLUENT" });

describe("languageSignal", () => {
  it("says nothing when either side has not answered", () => {
    expect(languageSignal(profile("a", []), profile("b", [fluent("nl")]))).toBeNull();
    expect(languageSignal(profile("a", [fluent("nl")]), profile("b", []))).toBeNull();
  });

  it("scores two fluent speakers of the same language at the top", () => {
    const result = languageSignal(
      profile("a", [fluent("nl"), fluent("en")]),
      profile("b", [fluent("nl")]),
    );

    expect(result?.score).toBe(1);
    expect(result?.reason).toBe("You both speak Nederlands");
  });

  it("is only as strong as whoever is struggling", () => {
    const both = languageSignal(
      profile("a", [fluent("fr")]),
      profile("b", [fluent("fr")]),
    );
    const oneLearning = languageSignal(
      profile("a", [fluent("fr")]),
      profile("b", [{ code: "fr", fluency: "LEARNING" }]),
    );

    expect(oneLearning!.score).toBeLessThan(both!.score);
    // And it says so, because "we can talk, slowly" is exactly the thing the
    // person deciding whether to write needs to know in advance.
    expect(oneLearning?.reason).toContain("still learning");
  });

  it("takes the best shared language rather than the first", () => {
    const result = languageSignal(
      profile("a", [{ code: "nl", fluency: "LEARNING" }, fluent("en")]),
      profile("b", [fluent("nl"), fluent("en")]),
    );

    expect(result?.score).toBe(1);
    expect(result?.evidence).toEqual(["English"]);
  });

  it("returns a real zero, with no reason, when they share nothing", () => {
    const result = languageSignal(
      profile("a", [fluent("nl")]),
      profile("b", [fluent("ja")]),
    );

    expect(result?.score).toBe(0);
    expect(result?.reason).toBeUndefined();
  });
});

describe("the scorer's language penalty", () => {
  it("sinks an otherwise identical pair who cannot speak to each other", async () => {
    const subject = profile("subject", [fluent("nl")]);
    const canTalk = profile("can-talk", [fluent("nl")]);
    const cannot = profile("cannot", [fluent("ja")]);

    const [talking, silent] = await scorer.scorePeople(
      subject,
      [canTalk, cannot],
      context,
    );

    expect(talking!.score).toBeGreaterThan(silent!.score);
  });

  it("leaves a pair alone when neither has answered", async () => {
    const subject = profile("subject", []);
    const candidate = profile("candidate", []);

    const [match] = await scorer.scorePeople(subject, [candidate], context);

    expect(match!.signals.some((s) => s.signal === "language")).toBe(false);
  });
});
