import { describe, expect, it } from "vitest";
import { checkInWindow, needsConfirmation } from "@/server/modules/activities/turnout";

/**
 * The two rules that decide whether anybody is asked anything.
 *
 * Both are pure, and both are the sort of thing that would otherwise be
 * discovered wrong by a member: an anxious notification about a coffee for
 * two, or a check-in button that can be pressed a week early from the sofa.
 */

describe("needsConfirmation", () => {
  it("leaves a small evening alone", () => {
    expect(needsConfirmation({ seatsTaken: 2, waitlisted: 0 })).toBe(false);
    expect(needsConfirmation({ seatsTaken: 3, waitlisted: 0 })).toBe(false);
  });

  it("asks once seats are scarce enough to matter", () => {
    expect(needsConfirmation({ seatsTaken: 4, waitlisted: 0 })).toBe(true);
  });

  it("always asks when somebody is waiting for a seat", () => {
    // Two people and one waiting is the case where an unconfirmed seat costs
    // a specific, identifiable person their evening.
    expect(needsConfirmation({ seatsTaken: 2, waitlisted: 1 })).toBe(true);
  });
});

describe("checkInWindow", () => {
  const startsAt = new Date("2026-09-10T18:00:00Z");

  it("is closed until the host opens it", () => {
    expect(
      checkInWindow({ startsAt, checkInOpenedAt: null }, startsAt).open,
    ).toBe(false);
    expect(
      checkInWindow({ startsAt, checkInOpenedAt: null }, startsAt).reason,
    ).toBe("not_opened");
  });

  it("opens shortly before the start, not whenever the host pressed it", () => {
    const opened = new Date("2026-09-10T16:30:00Z");
    // The host arrived early and opened it. Tapping in an hour before the
    // start is still too early: a check-in is meant to record being there.
    expect(
      checkInWindow({ startsAt, checkInOpenedAt: opened }, new Date("2026-09-10T16:45:00Z"))
        .open,
    ).toBe(false);
    expect(
      checkInWindow({ startsAt, checkInOpenedAt: opened }, new Date("2026-09-10T17:45:00Z"))
        .open,
    ).toBe(true);
  });

  it("closes well after the evening has ended", () => {
    const opened = new Date("2026-09-10T18:00:00Z");
    expect(
      checkInWindow({ startsAt, checkInOpenedAt: opened }, new Date("2026-09-10T22:00:00Z"))
        .open,
    ).toBe(true);
    expect(
      checkInWindow({ startsAt, checkInOpenedAt: opened }, new Date("2026-09-11T09:00:00Z"))
        .open,
    ).toBe(false);
  });
});
