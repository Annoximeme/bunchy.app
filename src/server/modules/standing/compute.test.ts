import { describe, expect, it } from "vitest";
import {
  computeStanding,
  weekKey,
  type CheckIn,
  type StandingInput,
} from "@/server/modules/standing/compute";

/**
 * The economy, argued with here rather than in production.
 *
 * Two properties matter more than the arithmetic: nothing can be earned by one
 * person on their own, and no amount of effort in one week is worth more than
 * a busy week of turning up. Everything else is tuning.
 */

const MONDAY = new Date("2026-09-07T19:00:00Z");
const days = (n: number) => new Date(MONDAY.getTime() + n * 86_400_000);

function checkIn(at: Date, options: Partial<CheckIn> = {}): CheckIn {
  return {
    activityId: `a-${at.toISOString()}`,
    at,
    bunchId: options.bunchId ?? null,
    seriesId: options.seriesId ?? null,
    cityLabel: options.cityLabel ?? "Antwerp",
    ...options,
  };
}

function input(overrides: Partial<StandingInput> = {}): StandingInput {
  return {
    checkIns: [],
    hosted: [],
    introductionsAccepted: [],
    runsSomethingWeekly: false,
    ...overrides,
  };
}

describe("weekKey", () => {
  it("puts a whole week under one key", () => {
    expect(weekKey(days(0))).toBe(weekKey(days(3)));
  });

  it("separates one week from the next", () => {
    expect(weekKey(days(0))).not.toBe(weekKey(days(7)));
  });

  it("keeps the turn of the year in the right week", () => {
    // 31 December 2026 is a Thursday, so it belongs to the last week of 2026
    // and 1 January 2027 belongs to the same one.
    expect(weekKey(new Date("2026-12-31T12:00:00Z"))).toBe(
      weekKey(new Date("2027-01-01T12:00:00Z")),
    );
  });
});

describe("what earns nothing", () => {
  it("gives a member with no corroborated anything a standing of zero", () => {
    const standing = computeStanding(input());
    expect(standing.total).toBe(0);
    expect(standing.titles).toEqual([]);
  });

  it("pays a host nothing when nobody else turned up", () => {
    const standing = computeStanding(
      input({ hosted: [{ activityId: "a", at: MONDAY, othersCheckedIn: 1 }] }),
    );
    expect(standing.points.HOSTING).toBe(0);
  });
});

describe("the weekly ceiling", () => {
  it("stops a farm in its tracks", () => {
    // Ten check-ins in one week, which two people with two accounts could
    // produce in an afternoon.
    const farmed = computeStanding(
      input({
        checkIns: Array.from({ length: 10 }, (_, i) =>
          checkIn(new Date(MONDAY.getTime() + i * 3_600_000)),
        ),
      }),
    );
    // Three honest evenings in the same week.
    const honest = computeStanding(
      input({ checkIns: [checkIn(days(0)), checkIn(days(2)), checkIn(days(4))] }),
    );

    expect(farmed.points.TURNING_UP).toBe(honest.points.TURNING_UP);
  });

  it("still rewards somebody who keeps turning up for months", () => {
    const overWeeks = computeStanding(
      input({
        checkIns: [checkIn(days(0)), checkIn(days(7)), checkIn(days(14))],
      }),
    );
    const oneWeek = computeStanding(
      input({ checkIns: [checkIn(days(0)), checkIn(days(1)), checkIn(days(2))] }),
    );

    // Same number of evenings, and the same points: the ceiling never punishes
    // a busy week, it only refuses to pay more for one.
    expect(overWeeks.points.TURNING_UP).toBe(oneWeek.points.TURNING_UP);
  });
});

describe("keeping something going", () => {
  it("counts an occurrence of a standing arrangement", () => {
    const standing = computeStanding(
      input({ checkIns: [checkIn(MONDAY, { bunchId: "b", seriesId: "s" })] }),
    );
    expect(standing.points.KEEPING_GOING).toBeGreaterThan(0);
  });

  it("counts coming back to the same group after a gap", () => {
    const standing = computeStanding(
      input({
        checkIns: [
          checkIn(days(0), { bunchId: "b" }),
          checkIn(days(30), { bunchId: "b" }),
        ],
      }),
    );
    expect(standing.points.KEEPING_GOING).toBeGreaterThan(0);
  });

  it("does not count two evenings in the same fortnight as still going", () => {
    const standing = computeStanding(
      input({
        checkIns: [
          checkIn(days(0), { bunchId: "b" }),
          checkIn(days(5), { bunchId: "b" }),
        ],
      }),
    );
    expect(standing.points.KEEPING_GOING).toBe(0);
  });
});

describe("somewhere new", () => {
  it("does not pay for the first group anybody meets", () => {
    const standing = computeStanding(
      input({ checkIns: [checkIn(MONDAY, { bunchId: "b" })] }),
    );
    expect(standing.points.SOMEWHERE_NEW).toBe(0);
  });

  it("pays for the second group, and for a new part of the world", () => {
    const standing = computeStanding(
      input({
        checkIns: [
          checkIn(days(0), { bunchId: "one" }),
          checkIn(days(7), { bunchId: "two" }),
          checkIn(days(14), { bunchId: "two", cityLabel: "Ghent" }),
        ],
      }),
    );
    expect(standing.points.SOMEWHERE_NEW).toBe(40);
  });
});

describe("titles", () => {
  it("arrive with the points that earned them", () => {
    const standing = computeStanding(
      input({
        checkIns: [checkIn(days(0)), checkIn(days(7)), checkIn(days(14))],
      }),
    );
    expect(standing.titles).toContain("turns-up");
  });

  it("include the one that describes a state rather than a history", () => {
    const standing = computeStanding(input({ runsSomethingWeekly: true }));
    expect(standing.titles).toContain("runs-a-weekly-night");
  });

  it("are not handed out for an empty profile", () => {
    expect(computeStanding(input()).titles).toEqual([]);
  });
});
