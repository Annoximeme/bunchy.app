import { describe, expect, it } from "vitest";
import { ageFrom } from "@/server/modules/profile/serialize";

/**
 * The bug this pins: age was a subtraction of years, which is right after
 * someone's birthday and a year too high before it — so roughly half of all
 * members saw an age that was not theirs.
 */
describe("ageFrom", () => {
  const august2026 = new Date("2026-08-13T12:00:00.000Z");

  it("does not count a birthday that has not happened yet", () => {
    // Born November 1992: 33 in August 2026, not 34.
    expect(ageFrom(1992, 11, august2026)).toBe(33);
  });

  it("counts a birthday that has passed", () => {
    expect(ageFrom(1992, 3, august2026)).toBe(34);
  });

  it("treats the birth month itself as reached", () => {
    // The day is deliberately not stored, so this is the one ambiguous month.
    // Counting it as reached is the choice that never understates an adult's
    // age on a platform with a minimum age.
    expect(ageFrom(1992, 8, august2026)).toBe(34);
  });

  it("falls back to the year alone when no month was given", () => {
    // Everyone who joined before the month was asked for.
    expect(ageFrom(1992, null, august2026)).toBe(34);
  });

  it("has no age without a birth year", () => {
    expect(ageFrom(null, 5, august2026)).toBeNull();
    expect(ageFrom(null, null, august2026)).toBeNull();
  });

  it("rolls over correctly across a year boundary", () => {
    const january = new Date("2027-01-02T00:00:00.000Z");
    expect(ageFrom(1992, 11, january)).toBe(34);
    expect(ageFrom(1992, 1, january)).toBe(35);
  });
});
