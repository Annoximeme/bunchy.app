import { describe, expect, it } from "vitest";
import { classify } from "@/server/modules/concierge/classify";

/**
 * The router decides which question gets answered, so getting it wrong means
 * confidently answering something nobody asked. These pin the distinctions that
 * are easy to lose — particularly the ones where two requests share every noun
 * and differ only in the verb.
 */

describe("routing a request", () => {
  it("sends people-shaped requests to people", () => {
    for (const text of [
      "I want to play Warhammer tonight",
      "Find someone to go hiking with",
      "find me people who like anime",
      "looking for someone to play Fortnite with",
      "who likes board games",
      "I'd like to meet new people",
    ]) {
      expect(classify(text).kind, text).toBe("find_people");
    }
  });

  it("sends activity-shaped requests to activities", () => {
    for (const text of [
      "what's happening this weekend",
      "anything on tonight",
      "show me activities near me",
      "what can I do on Saturday",
      "things to do this week",
    ]) {
      expect(classify(text).kind, text).toBe("find_activities");
    }
  });

  it("sends bunch-shaped requests to bunches", () => {
    for (const text of [
      "find me a bunch for board games",
      "what bunches are there for hiking",
      "are there any bunches near me",
      "groups for photography",
      "I want to join a bunch",
    ]) {
      expect(classify(text).kind, text).toBe("find_bunches");
    }
  });

  it("tells the same nouns apart by their verb", () => {
    // Identical subject matter, three different answers.
    expect(classify("find someone who likes board games").kind).toBe("find_people");
    expect(classify("what bunches are there for board games").kind).toBe("find_bunches");
    expect(classify("anything on for board games this weekend").kind).toBe(
      "find_activities",
    );
  });

  it("recognises a question about who is around", () => {
    for (const text of ["who's up?", "who is free tonight", "anyone around right now"]) {
      expect(classify(text).kind, text).toBe("whos_up");
    }
  });

  it("recognises a question about the recommendations themselves", () => {
    for (const text of [
      "why am I seeing these people",
      "how does matching work",
      "where do my suggestions come from",
    ]) {
      expect(classify(text).kind, text).toBe("explain");
    }
  });

  it("recognises someone asking what it can do", () => {
    for (const text of ["what can you do", "help", "how does bunchy work"]) {
      expect(classify(text).kind, text).toBe("help");
    }
  });
});

describe("when nothing matches", () => {
  it("falls back to finding people, and admits it was a guess", () => {
    const ask = classify("board games");

    // The fallback is chosen because it degrades well: it shows real people or
    // an honest empty state, never a fabricated answer.
    expect(ask.kind).toBe("find_people");
    expect(ask.matched).toBe(false);
  });

  it("marks a genuine match as matched", () => {
    expect(classify("what's happening this weekend").matched).toBe(true);
  });

  it("treats an empty request as unknown rather than guessing", () => {
    expect(classify("   ").kind).toBe("unknown");
  });
});

describe("specificity", () => {
  it("prefers the more specific rule when two could apply", () => {
    // "what can you do" is about the assistant; "what can I do" is about the
    // member's evening. One word apart.
    expect(classify("what can you do").kind).toBe("help");
    expect(classify("what can i do tonight").kind).toBe("find_activities");
  });

  it("reads 'why' as a question about matching, not a search", () => {
    expect(classify("why am I seeing these people").kind).toBe("explain");
    expect(classify("find me people").kind).toBe("find_people");
  });
});
