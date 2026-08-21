import { describe, expect, it } from "vitest";
import {
  lifecycleOf,
  type LifecycleFacts,
} from "@/server/modules/bunches/lifecycle";

const NOW = new Date("2026-03-05T12:00:00Z"); // a Thursday
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const facts = (over: Partial<LifecycleFacts> = {}): LifecycleFacts => ({
  memberCount: 4,
  maxMembers: 8,
  ...over,
});

describe("what a bunch says about itself", () => {
  it("leads with what is happening soonest", () => {
    // A bunch with an evening on Thursday is that, whether or not it also has
    // two spare seats.
    const soon = lifecycleOf(
      facts({ nextActivityAt: new Date(NOW.getTime() + 30 * 60_000), maxMembers: 5 }),
      NOW,
    );
    expect(soon.label).toBe("starting in 30 min");
    expect(soon.tone).toBe("live");
  });

  it("reads the clock in the units a person would", () => {
    const cases: Array<[number, string]> = [
      [-30 * 60_000, "happening now"],
      [45 * 60_000, "starting in 45 min"],
      [3 * HOUR, "starting in 3 hours"],
      [10 * HOUR, "on tonight"],
      [30 * HOUR, "on tomorrow"],
      [3 * DAY, "on Sunday"],
    ];
    for (const [offset, expected] of cases) {
      expect(
        lifecycleOf(facts({ nextActivityAt: new Date(NOW.getTime() + offset) }), NOW)
          .label,
      ).toBe(expected);
    }
  });

  it("puts a standing arrangement above how full it is", () => {
    const l = lifecycleOf(
      facts({ nextSeriesAt: new Date(NOW.getTime() + 7 * DAY), memberCount: 7, maxMembers: 8 }),
      NOW,
    );
    expect(l.label).toBe("Next: Thursday");
  });

  it("says full plainly", () => {
    expect(lifecycleOf(facts({ memberCount: 8, maxMembers: 8 }), NOW).label).toBe(
      "Full",
    );
  });

  it("counts remaining seats rather than counting down", () => {
    // Seats left is information. A countdown would be urgency, which is the
    // thing this feature must not become.
    const l = lifecycleOf(facts({ memberCount: 7, maxMembers: 8 }), NOW);
    expect(l.label).toBe("1 spot left");
    expect(l.label).not.toMatch(/hurry|last|only|!/i);
  });

  it("describes a small bunch as itself, not as a shortfall", () => {
    // "2 so far", never "needs 4 more". A bunch of two is a bunch of two.
    const l = lifecycleOf(facts({ memberCount: 2, maxMembers: 8 }), NOW);
    expect(l.label).toBe("2 so far");
    expect(l.label).not.toMatch(/need|more|only|short/i);
  });

  it("mentions a track record only once there is a plural", () => {
    // "Met once" is not a track record and reads as faint praise.
    expect(lifecycleOf(facts({ completedCount: 1 }), NOW).label).toBe("4 of 8");
    expect(lifecycleOf(facts({ completedCount: 5 }), NOW).label).toBe("Met 5 times");
  });

  it("falls back to something plain", () => {
    expect(lifecycleOf(facts(), NOW).label).toBe("4 of 8");
  });

  it("ignores an evening that is long past or far away", () => {
    expect(
      lifecycleOf(facts({ nextActivityAt: new Date(NOW.getTime() - 5 * DAY) }), NOW)
        .label,
    ).toBe("4 of 8");
    expect(
      lifecycleOf(facts({ nextActivityAt: new Date(NOW.getTime() + 40 * DAY) }), NOW)
        .label,
    ).toBe("4 of 8");
  });

  it("never speaks to a person or counts consecutive anything", () => {
    const all = [
      facts({ nextActivityAt: new Date(NOW.getTime() + HOUR) }),
      facts({ nextSeriesAt: new Date(NOW.getTime() + 2 * DAY) }),
      facts({ memberCount: 8, maxMembers: 8 }),
      facts({ memberCount: 7, maxMembers: 8 }),
      facts({ memberCount: 1 }),
      facts({ completedCount: 9 }),
      facts(),
    ].map((f) => lifecycleOf(f, NOW).label);

    for (const label of all) {
      // No second person, no streaks, no scores. Every state is a fact about
      // the group, phrased as the group.
      expect(label).not.toMatch(/\byou\b|\byour\b/i);
      expect(label).not.toMatch(/streak|in a row|consecutive|level|xp|points/i);
    }
  });
});
