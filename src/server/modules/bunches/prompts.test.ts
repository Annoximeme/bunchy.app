import { describe, expect, it } from "vitest";
import {
  CHALLENGES,
  ICEBREAKERS,
  findChallenge,
  nextIcebreaker,
} from "@/server/modules/bunches/prompts";
import { INTEREST_SEEDS } from "@/lib/interests";

/**
 * The bank is the safety mechanism, so the tests are mostly about the bank
 * rather than the selection function: every question was written by a person,
 * and these check that the set stays inside the lines §11 draws.
 */

describe("what the questions are allowed to be about", () => {
  const everything = ICEBREAKERS.map((p) => p.text.toLowerCase());

  it("asks nothing about the subjects strangers should not be asked about", () => {
    // Relationships, family, money, health, religion, politics, address.
    // Matched on word boundaries: a plain substring check flagged "learned"
    // for containing "earn", which is the sort of false positive that gets a
    // guardrail deleted rather than fixed.
    const off = [
      "partner", "partners", "girlfriend", "boyfriend", "married", "dating", "single",
      "kids", "children", "family", "parents",
      "salary", "earn", "earnings", "wage", "rent", "mortgage",
      "religion", "church", "pray", "vote", "politics", "political",
      "illness", "diagnosis", "therapy", "medication",
      "address", "postcode", "neighbourhood",
    ];
    for (const text of everything) {
      for (const word of off) {
        expect(text, `"${text}" asks about ${word}`).not.toMatch(
          new RegExp(`\\b${word}\\b`),
        );
      }
      expect(text).not.toContain("where do you live");
    }
  });

  it("asks nothing that needs a photo, a purchase or going somewhere alone", () => {
    for (const text of everything) {
      expect(text).not.toMatch(/post a (photo|picture)|send a pic|buy |spend €|go alone/);
    }
  });

  it("has no right answer", () => {
    // A question with a correct answer is a quiz, and a quiz has a loser.
    for (const text of everything) {
      expect(text).not.toMatch(/how many|what year|who invented|capital of/);
    }
  });

  it("is answerable in a sentence", () => {
    for (const prompt of ICEBREAKERS) {
      expect(prompt.text.length, prompt.key).toBeLessThan(120);
      expect(prompt.text.endsWith("?"), prompt.key).toBe(true);
    }
  });

  it("has unique keys, because they are stored to avoid repeats", () => {
    const keys = ICEBREAKERS.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("only references interests that exist", () => {
    const real = new Set(INTEREST_SEEDS.map((i) => i.slug));
    for (const prompt of ICEBREAKERS) {
      for (const slug of prompt.interests ?? []) {
        expect(real.has(slug), `${prompt.key} references "${slug}"`).toBe(true);
      }
    }
  });

  it("keeps enough general questions for a bunch about nothing in particular", () => {
    const general = ICEBREAKERS.filter((p) => !p.interests?.length);
    expect(general.length).toBeGreaterThanOrEqual(10);
  });
});

describe("choosing one", () => {
  it("prefers a question about what the bunch is actually into", () => {
    const chosen = nextIcebreaker(["warhammer"], [], () => 0);
    expect(chosen?.interests).toContain("warhammer");
  });

  it("falls back to a general question when nothing matches", () => {
    // Yoga has no keyed question in the bank.
    const chosen = nextIcebreaker(["yoga"], [], () => 0);
    expect(chosen).not.toBeNull();
    // It must reach for a general question rather than invent a yoga one.
    expect(chosen!.interests ?? []).toEqual([]);
  });

  it("never repeats one the bunch has already had", () => {
    const asked: string[] = [];
    for (let i = 0; i < ICEBREAKERS.length; i++) {
      const chosen = nextIcebreaker(["gaming"], asked, () => 0);
      expect(chosen, `ran out after ${i}`).not.toBeNull();
      expect(asked).not.toContain(chosen!.key);
      asked.push(chosen!.key);
    }
  });

  it("says nothing rather than repeating once the bank is used up", () => {
    const all = ICEBREAKERS.map((p) => p.key);
    // A bunch that has answered thirty questions needs to go and do something.
    expect(nextIcebreaker(["gaming"], all)).toBeNull();
  });

  it("stays inside the pool whatever the picker returns", () => {
    for (const index of [-5, 0, 999]) {
      const chosen = nextIcebreaker(["gaming"], [], () => index);
      expect(chosen).not.toBeNull();
      expect(ICEBREAKERS).toContain(chosen!);
    }
  });
});

describe("challenges", () => {
  it("can each be finished in one sitting by talking", () => {
    for (const challenge of CHALLENGES) {
      expect(challenge.description.length, challenge.key).toBeLessThan(140);
      // Nothing that needs a streak, a daily return or a purchase.
      const text = `${challenge.title} ${challenge.description}`.toLowerCase();
      expect(text).not.toMatch(/every day|daily|streak|each day|in a row|points|score|leaderboard|first to/);
    }
  });

  it("has unique keys", () => {
    const keys = CHALLENGES.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("looks up by key and refuses an unknown one", () => {
    expect(findChallenge("three-in-common")?.title).toContain("three things");
    expect(findChallenge("definitely-not-real")).toBeUndefined();
  });
});
