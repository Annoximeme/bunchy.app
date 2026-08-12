import { describe, expect, it } from "vitest";
import { parseIntent } from "@/server/modules/intent/parse";
import type { IntentCatalogue } from "@/server/modules/intent/types";
import { INTEREST_ALIASES, INTEREST_SEEDS } from "@/lib/interests";

/**
 * The parser is the floor the whole feature set stands on: Instant Bunch, Find
 * Someone and the concierge all turn a sentence into criteria through it. It is
 * also the piece most likely to be quietly wrong, because "tonight" means a
 * different UTC instant in Antwerp than in Tokyo and nothing about the code
 * looks wrong when it gets that backwards.
 *
 * Tests run against the *real* catalogue rather than a fixture, so a rename in
 * the interest list that breaks parsing fails here rather than in production.
 */

const CATALOGUE: IntentCatalogue = {
  interests: INTEREST_SEEDS.map((seed) => ({
    interestId: seed.slug,
    slug: seed.slug,
    label: seed.label,
    aliases: INTEREST_ALIASES[seed.slug],
  })),
};

/** A Wednesday, 15:00 UTC. Mid-week and mid-afternoon so nothing is ambiguous. */
const NOW = new Date("2026-08-12T15:00:00Z");

function parse(text: string, timezone: string | null = "Europe/Brussels") {
  return parseIntent(text, CATALOGUE, { now: NOW, timezone });
}

/**
 * What a clock on the wall in `timezone` reads at that instant.
 *
 * Assertions go through this rather than comparing ISO strings, because the
 * whole point is that these are *local* times: Saturday midnight in Brussels is
 * Friday 22:00 UTC, and a test that checked the UTC date would call correct
 * behaviour a bug.
 */
function local(at: Date, timezone = "Europe/Brussels") {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(at);
}

describe("the examples from the brief", () => {
  it("parses “I want to play Warhammer tonight”", () => {
    const intent = parse("I want to play Warhammer tonight.");

    expect(intent.interestSlugs).toContain("warhammer");
    expect(intent.when?.label).toBe("tonight");
    expect(intent.windows).toContain("WEEKDAY_EVENING");
    expect(intent.topic).toBe("Warhammer");
    // Warhammer is a game you play at a table. Nothing should have guessed online.
    expect(intent.mode).toBeNull();
  });

  it("parses “I want to go hiking Saturday”", () => {
    const intent = parse("I want to go hiking Saturday.");

    expect(intent.interestSlugs).toEqual(["hiking"]);
    expect(intent.when?.label).toBe("Saturday");
    expect(intent.windows).toContain("WEEKEND_AFTERNOON");
    expect(intent.windows.every((w) => w.startsWith("WEEKEND") || w === "LATE_NIGHT")).toBe(true);
  });

  it("parses “I want to meet people who like anime”", () => {
    const intent = parse("I want to meet people who like anime.");

    expect(intent.interestSlugs).toEqual(["anime"]);
    expect(intent.goals).toContain("NEW_FRIENDS");
    // No time was mentioned, so none is invented.
    expect(intent.when).toBeNull();
    expect(intent.windows).toEqual([]);
  });

  it("parses “I want to play Helldivers with people tonight”", () => {
    const intent = parse("I want to play Helldivers with people tonight.");

    // Helldivers is an alias, not an interest of its own.
    expect(intent.interestSlugs).toContain("shooters");
    expect(intent.when?.label).toBe("tonight");
  });

  it("parses “I want to grab drinks this weekend”", () => {
    const intent = parse("I want to grab drinks this weekend.");

    expect(intent.goals).toContain("GOING_OUT");
    expect(intent.when?.label).toBe("this weekend");
  });

  it("parses “Find someone nearby who likes board games”", () => {
    const intent = parse("Find someone nearby who likes board games.");

    // "board games" must win over the shorter "gaming"/"games".
    expect(intent.interestSlugs).toEqual(["board-games"]);
  });

  it("parses “Find a photographer for Saturday”", () => {
    const intent = parse("Find a photographer for Saturday.");

    expect(intent.interestSlugs).toContain("photography");
    expect(intent.when?.label).toBe("Saturday");
  });
});

describe("time, in the member's own zone", () => {
  it("puts tonight at 18:00 on the member's own clock, not the server's", () => {
    const brussels = parse("play something tonight", "Europe/Brussels");
    const tokyo = parse("play something tonight", "Asia/Tokyo");

    // Same words, same instant, two different UTC answers — and each is 18:00
    // where the member actually is.
    expect(local(brussels.when!.from, "Europe/Brussels")).toBe("Wed 12/08, 18:00");
    expect(local(tokyo.when!.from, "Asia/Tokyo")).toBe("Thu 13/08, 18:00");

    // Tokyo's is the *later* instant, which is the correct and unobvious part:
    // 15:00 UTC is already past midnight there, so the evening they mean is the
    // one now beginning, seventeen hours out.
    expect(tokyo.when!.from.getTime()).toBeGreaterThan(brussels.when!.from.getTime());
  });

  it("never proposes a time that has already passed", () => {
    for (const phrase of ["today", "this morning", "tonight", "this afternoon"]) {
      const intent = parse(`do something ${phrase}`);
      expect(
        intent.when!.from.getTime(),
        `${phrase} must not start in the past`,
      ).toBeGreaterThanOrEqual(NOW.getTime());
    }
  });

  it("says so when it clamped", () => {
    // 15:00 UTC is 17:00 in Brussels — this morning is over.
    const intent = parse("go for a run this morning");
    expect(intent.notes.join(" ")).toContain("already started");
  });

  it("reads a weekday as the next one coming, today included", () => {
    // NOW is a Wednesday, so Wednesday means today and Tuesday means next week.
    expect(local(parse("hiking Wednesday").when!.from)).toBe("Wed 12/08, 17:00");
    expect(local(parse("hiking Thursday").when!.from)).toBe("Thu 13/08, 00:00");
    expect(local(parse("hiking Tuesday").when!.from)).toBe("Tue 18/08, 00:00");
  });

  it("distinguishes this weekend from next weekend", () => {
    expect(local(parse("drinks this weekend").when!.from)).toBe("Sat 15/08, 00:00");
    expect(local(parse("drinks next weekend").when!.from)).toBe("Sat 22/08, 00:00");
  });

  it("distinguishes Friday from next Friday", () => {
    expect(local(parse("board games Friday").when!.from)).toBe("Fri 14/08, 00:00");
    expect(local(parse("board games next Friday").when!.from)).toBe("Fri 21/08, 00:00");
    expect(parse("board games next Friday").when!.label).toBe("Next Friday");
  });

  it("covers both days of a weekend", () => {
    const when = parse("camping this weekend").when!;
    // Saturday 00:00 through Sunday 24:00 local is a 48-hour span.
    expect((when.to.getTime() - when.from.getTime()) / 3_600_000).toBeCloseTo(48, 0);
  });

  it("reads “Friday night” as the evening, not 3am", () => {
    const intent = parse("board games Friday night");
    expect(intent.windows).toContain("WEEKDAY_EVENING");
    expect(intent.windows).not.toContain("LATE_NIGHT");
  });

  it("reads “late tonight” as late night", () => {
    expect(parse("gaming late tonight").windows).toContain("LATE_NIGHT");
  });

  it("treats a bare day as any time that day", () => {
    const intent = parse("hiking Saturday");
    expect(intent.windows).toEqual(
      expect.arrayContaining([
        "WEEKEND_MORNING",
        "WEEKEND_AFTERNOON",
        "WEEKEND_EVENING",
      ]),
    );
  });

  it("says whether a time of day was actually named", () => {
    // The distinction that stops "hiking Saturday" being scheduled for 00:00.
    expect(parse("hiking Saturday").when!.precision).toBe("day");
    expect(parse("drinks this weekend").when!.precision).toBe("day");
    expect(parse("hiking tomorrow").when!.precision).toBe("day");

    expect(parse("play warhammer tonight").when!.precision).toBe("part");
    expect(parse("board games Friday night").when!.precision).toBe("part");
    expect(parse("a run tomorrow morning").when!.precision).toBe("part");
    expect(parse("gaming late tonight").when!.precision).toBe("part");
  });

  it("falls back to UTC for a member with no zone", () => {
    // Not a guess dressed as a fact: with no zone we say so by using UTC, the
    // same fallback `sharedHours` makes.
    const intent = parse("play something tonight", null);
    expect(intent.when!.from.toISOString()).toBe("2026-08-12T18:00:00.000Z");
  });
});

describe("group size", () => {
  it("reads “a group of five” as five", () => {
    expect(parse("board games with a group of five").groupSize).toBe(5);
  });

  it("reads “4 of us” as four", () => {
    expect(parse("4 of us want to play padel").groupSize).toBe(4);
  });

  it("counts the member in when they say “with 3 people”", () => {
    const intent = parse("hiking with 3 people on Saturday");
    expect(intent.groupSize).toBe(4);
    expect(intent.notes.join(" ")).toContain("including you");
  });

  it("leaves it unset rather than guessing", () => {
    expect(parse("I want to go hiking Saturday").groupSize).toBeNull();
  });
});

describe("online or in person", () => {
  it("takes the member's word for it", () => {
    expect(parse("play warhammer online tonight").mode).toBe("ONLINE");
    expect(parse("play chess in person tonight").mode).toBe("OFFLINE");
  });

  it("guesses online only for interests that live there, and admits it", () => {
    const intent = parse("play some shooters tonight");
    expect(intent.mode).toBe("ONLINE");
    expect(intent.notes.join(" ")).toContain("Assumed online");
  });

  it("does not guess for an interest that could be either", () => {
    expect(parse("board games on Saturday").mode).toBeNull();
    expect(parse("hiking on Saturday").mode).toBeNull();
  });

  it("does not guess when the interests disagree", () => {
    // Gaming is online-first, hiking is not. Picking one would be a coin toss.
    expect(parse("gaming and hiking").mode).toBeNull();
  });
});

describe("what it does not know", () => {
  it("reads an unknown game as gaming, and says so", () => {
    const intent = parse("Find someone to play Zomboid with tonight.");

    expect(intent.topic).toBe("Zomboid");
    expect(intent.interestSlugs).toContain("gaming");
    expect(intent.notes.join(" ")).toContain("Zomboid");
  });

  it("keeps the member's capitalisation for the topic", () => {
    expect(parse("play RimWorld tonight").topic).toBe("RimWorld");
  });

  it("does not overrule a real interest with the word after “play”", () => {
    const intent = parse("play board games tonight");
    expect(intent.topic).toBe("Board games");
    expect(intent.interestSlugs).toEqual(["board-games"]);
  });

  it("reports terms it could not ground rather than dropping them", () => {
    const intent = parse("I want to go bouldering with my colleagues tonight");
    // "bouldering" is an alias for climbing, so it is understood…
    expect(intent.interestSlugs).toContain("climbing");
    // …and the part it could not use is admitted to.
    expect(intent.unrecognised).toContain("colleagues");
  });

  it("says nothing at all rather than something wrong", () => {
    const intent = parse("hello");
    expect(intent.interestSlugs).toEqual([]);
    expect(intent.when).toBeNull();
    expect(intent.goals).toEqual([]);
    expect(intent.topic).toBeNull();
  });

  it("never returns an interest outside the catalogue", () => {
    const slugs = new Set(CATALOGUE.interests.map((i) => i.slug));
    for (const text of [
      "I want to play Warhammer tonight",
      "find someone for underwater basket weaving",
      "quantum tobogganing this weekend near Ghent",
      "play Zomboid",
    ]) {
      for (const slug of parse(text).interestSlugs) {
        expect(slugs.has(slug), `${slug} is not a real interest`).toBe(true);
      }
    }
  });
});

describe("place", () => {
  it("picks up a named place without scanning it for interests", () => {
    const intent = parse("board games near Ghent this weekend");
    expect(intent.placeHint).toBe("Ghent");
    expect(intent.unrecognised).not.toContain("ghent");
  });

  it("is not fooled by “in person”", () => {
    const intent = parse("board games in person this weekend");
    expect(intent.placeHint).toBeNull();
    expect(intent.mode).toBe("OFFLINE");
  });

  it("leaves it null when no place is named", () => {
    expect(parse("board games this weekend").placeHint).toBeNull();
  });
});

describe("the raw request survives", () => {
  it("keeps what the member typed, verbatim", () => {
    const text = "I want to play Warhammer tonight.";
    expect(parse(text).raw).toBe(text);
  });
});
