import { describe, expect, it } from "vitest";
import {
  isUsuallyFreeAt,
  proposeSlots,
  type FreeTime,
} from "@/server/modules/availability/slots";

/**
 * Proposing times from two people's usual free hours.
 *
 * The cases worth pinning are the ones a naive implementation gets confidently
 * wrong: a window that means different hours in two zones, a late night that
 * belongs to the day it started on, and four proposals that turn out to be the
 * same Tuesday.
 */

const brussels = (windows: FreeTime["windows"]): FreeTime => ({
  windows,
  timezone: "Europe/Brussels",
});

// A Monday.
const MONDAY_NOON = new Date("2026-09-07T12:00:00Z");

describe("isUsuallyFreeAt", () => {
  it("reads the hour in the member's own zone", () => {
    const evening = new Date("2026-09-07T18:30:00Z"); // 20:30 in Brussels.

    expect(isUsuallyFreeAt(brussels(["WEEKDAY_EVENING"]), evening)).toBe(true);
    expect(
      isUsuallyFreeAt(
        { windows: ["WEEKDAY_EVENING"], timezone: "Asia/Tokyo" },
        evening,
      ),
    ).toBe(false);
  });

  it("keeps weekday and weekend windows apart", () => {
    const saturdayEvening = new Date("2026-09-12T19:00:00Z");

    expect(isUsuallyFreeAt(brussels(["WEEKEND_EVENING"]), saturdayEvening)).toBe(
      true,
    );
    expect(isUsuallyFreeAt(brussels(["WEEKDAY_EVENING"]), saturdayEvening)).toBe(
      false,
    );
  });

  it("counts one in the morning as the night before", () => {
    // 01:00 Tuesday in Brussels is Monday's late night, not Tuesday's.
    const afterMidnight = new Date("2026-09-07T23:00:00Z");

    expect(isUsuallyFreeAt(brussels(["LATE_NIGHT"]), afterMidnight)).toBe(true);
    expect(isUsuallyFreeAt(brussels(["WEEKDAY_MORNING"]), afterMidnight)).toBe(
      false,
    );
  });
});

describe("proposeSlots", () => {
  it("proposes evenings both people are usually free", () => {
    const slots = proposeSlots(
      brussels(["WEEKDAY_EVENING"]),
      brussels(["WEEKDAY_EVENING"]),
      { now: MONDAY_NOON },
    );

    expect(slots).toHaveLength(3);
    for (const slot of slots) {
      expect(isUsuallyFreeAt(brussels(["WEEKDAY_EVENING"]), slot.startsAt)).toBe(
        true,
      );
    }
  });

  it("never proposes two times on the same day", () => {
    const slots = proposeSlots(
      brussels(["WEEKDAY_EVENING", "WEEKDAY_AFTERNOON"]),
      brussels(["WEEKDAY_EVENING", "WEEKDAY_AFTERNOON"]),
      { now: MONDAY_NOON },
    );

    const days = slots.map((slot) => slot.startsAt.toISOString().slice(0, 10));
    expect(new Set(days).size).toBe(days.length);
  });

  it("leaves enough notice that somebody can sleep on it", () => {
    const slots = proposeSlots(
      brussels(["WEEKDAY_EVENING"]),
      brussels(["WEEKDAY_EVENING"]),
      { now: MONDAY_NOON },
    );

    for (const slot of slots) {
      expect(slot.startsAt.getTime() - MONDAY_NOON.getTime()).toBeGreaterThanOrEqual(
        12 * 60 * 60 * 1000,
      );
    }
  });

  it("says nothing rather than guessing when the two never overlap", () => {
    const slots = proposeSlots(
      brussels(["WEEKDAY_MORNING"]),
      brussels(["LATE_NIGHT"]),
      { now: MONDAY_NOON },
    );

    expect(slots).toEqual([]);
  });

  it("says nothing when either of them never answered", () => {
    expect(
      proposeSlots(brussels([]), brussels(["WEEKDAY_EVENING"]), {
        now: MONDAY_NOON,
      }),
    ).toEqual([]);
  });

  it("finds the hours two zones genuinely share", () => {
    // A Brussels evening and a Tokyo late night are seven hours apart and do
    // meet: 23:00 in Brussels is 06:00 in Tokyo, which is nobody's evening, so
    // the honest answer here is that there is nothing to propose.
    const slots = proposeSlots(
      brussels(["WEEKDAY_EVENING"]),
      { windows: ["WEEKDAY_EVENING"], timezone: "Asia/Tokyo" },
      { now: MONDAY_NOON },
    );

    expect(slots).toEqual([]);
  });
});
