import { describe, expect, it } from "vitest";
import {
  advanceToFuture,
  nextOccurrence,
} from "@/server/modules/activities/series";

/**
 * The arithmetic, on its own.
 *
 * Every bug a recurring-event system has is in this function, so it is pure and
 * exported for exactly this reason. The rest of the module is database work.
 */

const at = (iso: string) => new Date(iso);

describe("stepping a cadence forward", () => {
  it("adds seven days for weekly", () => {
    expect(nextOccurrence(at("2026-03-05T19:00:00Z"), "WEEKLY").toISOString()).toBe(
      "2026-03-12T19:00:00.000Z",
    );
  });

  it("adds fourteen days for biweekly", () => {
    expect(
      nextOccurrence(at("2026-03-05T19:00:00Z"), "BIWEEKLY").toISOString(),
    ).toBe("2026-03-19T19:00:00.000Z");
  });

  it("keeps the same weekday every week for a year", () => {
    // The property that matters to a member: our Thursday stays a Thursday.
    let cursor = at("2026-01-01T19:00:00Z");
    const weekday = cursor.getUTCDay();
    for (let i = 0; i < 52; i += 1) {
      cursor = nextOccurrence(cursor, "WEEKLY");
      expect(cursor.getUTCDay()).toBe(weekday);
    }
  });

  it("moves a month for monthly", () => {
    expect(
      nextOccurrence(at("2026-03-10T19:00:00Z"), "MONTHLY").toISOString(),
    ).toBe("2026-04-10T19:00:00.000Z");
  });

  it("clamps the 31st onto a 30-day month instead of skipping it", () => {
    // The classic bug: naive month arithmetic turns 31 March into 1 May.
    expect(
      nextOccurrence(at("2026-03-31T19:00:00Z"), "MONTHLY").toISOString(),
    ).toBe("2026-04-30T19:00:00.000Z");
  });

  it("clamps into February, including a leap year", () => {
    expect(
      nextOccurrence(at("2026-01-31T19:00:00Z"), "MONTHLY").toISOString(),
    ).toBe("2026-02-28T19:00:00.000Z");
    expect(
      nextOccurrence(at("2028-01-31T19:00:00Z"), "MONTHLY").toISOString(),
    ).toBe("2028-02-29T19:00:00.000Z");
  });

  it("does not climb back to the 31st once clamped", () => {
    // A ritual that alternates between the 30th and the 31st is not a ritual
    // anybody can plan around.
    const april = nextOccurrence(at("2026-03-31T19:00:00Z"), "MONTHLY");
    const may = nextOccurrence(april, "MONTHLY");
    expect(may.getUTCDate()).toBe(30);
  });

  it("crosses a year boundary", () => {
    expect(
      nextOccurrence(at("2026-12-20T19:00:00Z"), "MONTHLY").toISOString(),
    ).toBe("2027-01-20T19:00:00.000Z");
  });

  it("keeps the time of day", () => {
    for (const cadence of ["WEEKLY", "BIWEEKLY", "MONTHLY"] as const) {
      const next = nextOccurrence(at("2026-03-05T20:30:00Z"), cadence);
      expect(next.getUTCHours()).toBe(20);
      expect(next.getUTCMinutes()).toBe(30);
    }
  });
});

describe("catching a neglected series up", () => {
  const now = at("2026-06-01T12:00:00Z");

  it("skips every evening that has already been and gone", () => {
    // A series untouched for two months must not backfill eight activities
    // that never happened.
    const caught = advanceToFuture(at("2026-04-02T19:00:00Z"), "WEEKLY", now);
    expect(caught.getTime()).toBeGreaterThan(now.getTime());
    // And lands on the first one after now, not some arbitrary later week.
    expect(caught.toISOString()).toBe("2026-06-04T19:00:00.000Z");
  });

  it("leaves a future date alone", () => {
    const future = at("2026-07-01T19:00:00Z");
    expect(advanceToFuture(future, "WEEKLY", now).toISOString()).toBe(
      future.toISOString(),
    );
  });

  it("preserves the weekday while catching up", () => {
    const original = at("2026-04-02T19:00:00Z");
    const caught = advanceToFuture(original, "WEEKLY", now);
    expect(caught.getUTCDay()).toBe(original.getUTCDay());
  });

  it("terminates rather than spinning on a corrupt date", () => {
    // Not a limit anybody reaches, a guard. A nextAt from 1970 with a weekly
    // cadence would otherwise loop nearly three thousand times.
    const caught = advanceToFuture(at("1970-01-01T19:00:00Z"), "WEEKLY", now, 5);
    expect(caught.getTime()).toBeLessThan(now.getTime());
  });
});
