import { describe, expect, it } from "vitest";
import {
  bunchChemistry,
  type ChemistryInput,
  type ChemistryMessage,
} from "@/server/modules/bunches/chemistry";

const NOW = new Date("2026-08-12T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

function members(count: number, joined = daysAgo(60)) {
  return Array.from({ length: count }, (_, i) => ({
    profileId: `p${i}`,
    joinedAt: joined,
  }));
}

/** `perMember` messages from each of the first `speakers` members. */
function chatter(speakers: number, perMember: number): ChemistryMessage[] {
  const out: ChemistryMessage[] = [];
  for (let i = 0; i < speakers; i++) {
    for (let n = 0; n < perMember; n++) {
      out.push({ authorId: `p${i}`, createdAt: daysAgo(3) });
    }
  }
  return out;
}

function input(over: Partial<ChemistryInput> = {}): ChemistryInput {
  return {
    members: members(8),
    pairs: [],
    messages: [],
    activities: [],
    now: NOW,
    ...over,
  };
}

describe("a bunch with no history", () => {
  it("says it is too new rather than scoring it zero", () => {
    const result = bunchChemistry(
      input({ members: members(6, daysAgo(2)), messages: [] }),
    );
    expect(result.score).toBeNull();
    expect(result.confidence).toBe("none");
    expect(result.observations[0]).toMatch(/too new/i);
  });

  it("does not claim a dead bunch is merely new once it has aged", () => {
    const result = bunchChemistry(input({ members: members(6), messages: [] }));
    expect(result.score).not.toBeNull();
    expect(result.observations.join(" ")).toMatch(/gone quiet/i);
  });
});

describe("breadth beats volume", () => {
  it("ranks a bunch where everyone speaks above one where two people do", () => {
    const spread = bunchChemistry(
      input({ members: members(8), messages: chatter(8, 3) }),
    );
    const dominated = bunchChemistry(
      input({ members: members(8), messages: chatter(2, 12) }),
    );

    // Same message count either way — only the distribution differs.
    expect(chatter(8, 3)).toHaveLength(chatter(2, 12).length);
    expect(spread.score!).toBeGreaterThan(dominated.score!);
  });

  it("does not reward piling on more messages from the same few people", () => {
    const some = bunchChemistry(
      input({ members: members(8), messages: chatter(2, 10) }),
    );
    const lots = bunchChemistry(
      input({ members: members(8), messages: chatter(2, 100) }),
    );
    // Liveliness saturates, so ten times the volume must not buy a much better
    // score when the same two people are still the only ones talking.
    expect(lots.score! - some.score!).toBeLessThanOrEqual(3);
  });

  it("names the quiet members without naming names", () => {
    const result = bunchChemistry(
      input({ members: members(9), messages: chatter(3, 4) }),
    );
    expect(result.observations.join(" ")).toMatch(/6 members haven't said anything/);
  });

  it("flags a broadcast", () => {
    const result = bunchChemistry(
      input({ members: members(6), messages: [...chatter(1, 20), ...chatter(2, 1).slice(1)] }),
    );
    expect(result.observations.join(" ")).toMatch(/one person/i);
  });
});

describe("size", () => {
  it("treats the whole 5-12 band as a good size", () => {
    const scores = [5, 8, 12].map(
      (n) => bunchChemistry(input({ members: members(n), messages: chatter(n, 2) })).score!,
    );
    const sizeSignal = (n: number) =>
      bunchChemistry(input({ members: members(n), messages: chatter(n, 2) })).signals.find(
        (s) => s.signal === "size",
      )!.score;
    expect([5, 8, 12].map(sizeSignal)).toEqual([1, 1, 1]);
    expect(scores.every((s) => s > 0)).toBe(true);
  });

  it("marks down a bunch that is too small and one that is too big", () => {
    const sizeOf = (n: number) =>
      bunchChemistry(input({ members: members(n) })).signals.find(
        (s) => s.signal === "size",
      )!.score;
    expect(sizeOf(2)).toBeLessThan(1);
    expect(sizeOf(20)).toBeLessThan(1);
    // Too big degrades gently rather than collapsing.
    expect(sizeOf(14)).toBeGreaterThan(0.5);
  });
});

describe("missing signals", () => {
  it("renormalizes rather than treating an absent signal as zero", () => {
    const withActivities = bunchChemistry(
      input({
        members: members(6),
        messages: chatter(6, 2),
        activities: [
          { startsAt: daysAgo(10), cancelled: false, participantIds: ["p0", "p1", "p2", "p3", "p4", "p5"] },
        ],
      }),
    );
    const withoutActivities = bunchChemistry(
      input({ members: members(6), messages: chatter(6, 2) }),
    );

    // Everyone turned up, so including the signal can only help — and its
    // absence must not silently drag the score down as a zero would.
    expect(withActivities.score!).toBeGreaterThanOrEqual(withoutActivities.score!);
    expect(withoutActivities.signals.some((s) => s.signal === "turn_up")).toBe(false);
  });

  it("ignores a cancelled activity nobody could attend", () => {
    const result = bunchChemistry(
      input({
        members: members(6),
        messages: chatter(6, 2),
        activities: [{ startsAt: daysAgo(5), cancelled: true, participantIds: [] }],
      }),
    );
    expect(result.signals.some((s) => s.signal === "turn_up")).toBe(false);
  });

  it("counts a departed author's messages as a voice that was there", () => {
    const result = bunchChemistry(
      input({
        members: members(4),
        messages: [
          { authorId: null, createdAt: daysAgo(2) },
          ...chatter(2, 3),
        ],
      }),
    );
    // Should not throw, and should not credit the null author as a member.
    expect(result.score).not.toBeNull();
    expect(
      result.signals.find((s) => s.signal === "voice")!.reason,
    ).toMatch(/2 of 4/);
  });
});

describe("the score itself", () => {
  it("stays inside 0-100", () => {
    const cases: ChemistryInput[] = [
      input({ members: members(1) }),
      input({ members: members(30), messages: chatter(30, 50) }),
      input({ members: members(8), pairs: [{ score: 1 }], messages: chatter(8, 5) }),
      input({ members: members(8), pairs: [{ score: 0 }] }),
    ];
    for (const c of cases) {
      const { score } = bunchChemistry(c);
      if (score !== null) {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }
    }
  });

  it("reports low confidence until several behavioural signals exist", () => {
    const thin = bunchChemistry(input({ members: members(6), messages: chatter(1, 1) }));
    const rich = bunchChemistry(
      input({
        members: members(6),
        messages: chatter(6, 3),
        activities: [{ startsAt: daysAgo(4), cancelled: false, participantIds: ["p0"] }],
      }),
    );
    expect(thin.confidence).toBe("low");
    expect(rich.confidence).toBe("good");
  });
});
