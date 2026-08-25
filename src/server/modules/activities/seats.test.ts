import { describe, expect, it } from "vitest";
import { seatsTaken } from "./service";

/**
 * Capacity is chairs, not accounts.
 *
 * A room that seats eight and a list of eight members who between them bring
 * four friends is a room with four people standing. Counting participants
 * rather than seats is how that happens, so the arithmetic lives in one
 * function and is tested here rather than being repeated at each call site.
 */

describe("seatsTaken", () => {
  it("counts one chair per member with nobody in tow", () => {
    expect(
      seatsTaken([
        { status: "JOINED", guests: 0 },
        { status: "JOINED", guests: 0 },
      ]),
    ).toBe(2);
  });

  it("counts the people being brought", () => {
    expect(
      seatsTaken([
        { status: "JOINED", guests: 2 },
        { status: "JOINED", guests: 0 },
      ]),
      // Two members and two guests is four chairs, not three.
    ).toBe(4);
  });

  it("ignores the waitlist and anyone who left", () => {
    // A waitlisted party is not taking a chair, which is the whole point of
    // being waitlisted, and counting them would keep the activity full.
    expect(
      seatsTaken([
        { status: "JOINED", guests: 1 },
        { status: "WAITLISTED", guests: 3 },
        { status: "LEFT", guests: 2 },
      ]),
    ).toBe(2);
  });

  it("is zero for an activity nobody has joined", () => {
    expect(seatsTaken([])).toBe(0);
  });
});
