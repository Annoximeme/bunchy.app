import { describe, expect, it } from "vitest";
import {
  isValidTimezone,
  offsetHours,
  sharedHours,
  timezoneForCountry,
  windowInUtc,
} from "@/server/modules/geo/timezone";

// A fixed instant in northern-hemisphere summer, so DST-observing zones are
// at their summer offset and the numbers below are checkable by hand.
const SUMMER = new Date("2026-07-15T12:00:00Z");
const WINTER = new Date("2026-01-15T12:00:00Z");

describe("offsetHours", () => {
  it("reads a zone's current offset", () => {
    expect(offsetHours("Europe/Brussels", SUMMER)).toBe(2); // CEST
    expect(offsetHours("Europe/Brussels", WINTER)).toBe(1); // CET
    expect(offsetHours("Asia/Tokyo", SUMMER)).toBe(9); // no DST
    expect(offsetHours("UTC", SUMMER)).toBe(0);
  });

  it("handles half-hour zones", () => {
    expect(offsetHours("Asia/Kolkata", SUMMER)).toBe(5.5);
  });

  it("falls back to UTC for a missing or nonsense zone", () => {
    expect(offsetHours(null)).toBe(0);
    expect(offsetHours("Mars/Olympus_Mons")).toBe(0);
  });
});

describe("windowInUtc", () => {
  it("shifts a local window into UTC", () => {
    // 18:00-23:00 in Brussels (+2) is 16:00-21:00 UTC.
    expect(windowInUtc("WEEKDAY_EVENING", "Europe/Brussels", SUMMER)).toEqual([
      { start: 16, end: 21 },
    ]);
  });

  it("splits a window that crosses midnight UTC", () => {
    // 18:00-23:00 in Tokyo (+9) is 09:00-14:00 UTC, no split.
    expect(windowInUtc("WEEKDAY_EVENING", "Asia/Tokyo", SUMMER)).toEqual([
      { start: 9, end: 14 },
    ]);
    // 06:00-12:00 in Tokyo is 21:00-03:00 UTC, split at midnight.
    expect(windowInUtc("WEEKDAY_MORNING", "Asia/Tokyo", SUMMER)).toEqual([
      { start: 21, end: 24 },
      { start: 0, end: 3 },
    ]);
  });
});

describe("sharedHours", () => {
  const evening = ["WEEKDAY_EVENING" as const];

  it("is the bug this module exists for: same label, no shared hour", () => {
    const overlap = sharedHours(
      { windows: evening, timezone: "Europe/Brussels" },
      { windows: evening, timezone: "Asia/Tokyo" },
      SUMMER,
    );
    // Brussels evening is 16:00-21:00 UTC, Tokyo evening is 09:00-14:00 UTC.
    // The old label comparison called this a perfect match.
    expect(overlap).toBe(0);
  });

  it("gives full overlap to two people in the same zone", () => {
    const overlap = sharedHours(
      { windows: evening, timezone: "Europe/Brussels" },
      { windows: evening, timezone: "Europe/Brussels" },
      SUMMER,
    );
    // Five hours a night, five weeknights.
    expect(overlap).toBe(25);
  });

  it("finds the partial overlap between neighbouring zones", () => {
    const overlap = sharedHours(
      { windows: evening, timezone: "Europe/London" },   // 17:00-22:00 UTC
      { windows: evening, timezone: "Europe/Brussels" }, // 16:00-21:00 UTC
      SUMMER,
    );
    // Four hours in common, five weeknights.
    expect(overlap).toBe(20);
  });

  it("does not count a weekday evening against a weekend evening", () => {
    const overlap = sharedHours(
      { windows: ["WEEKDAY_EVENING"], timezone: "Europe/Brussels" },
      { windows: ["WEEKEND_EVENING"], timezone: "Europe/Brussels" },
      SUMMER,
    );
    expect(overlap).toBe(0);
  });

  it("treats an unknown zone as UTC rather than refusing to answer", () => {
    const overlap = sharedHours(
      { windows: evening, timezone: null },
      { windows: evening, timezone: null },
      SUMMER,
    );
    expect(overlap).toBe(25);
  });

  it("scales with how many windows two people share", () => {
    const one = sharedHours(
      { windows: ["WEEKDAY_EVENING"], timezone: "UTC" },
      { windows: ["WEEKDAY_EVENING"], timezone: "UTC" },
      SUMMER,
    );
    const two = sharedHours(
      { windows: ["WEEKDAY_EVENING", "WEEKEND_EVENING"], timezone: "UTC" },
      { windows: ["WEEKDAY_EVENING", "WEEKEND_EVENING"], timezone: "UTC" },
      SUMMER,
    );
    expect(two).toBeGreaterThan(one);
  });
});

describe("timezoneForCountry", () => {
  it("resolves countries with exactly one zone", () => {
    expect(timezoneForCountry("BE")).toBe("Europe/Brussels");
    expect(timezoneForCountry("jp")).toBe("Asia/Tokyo");
  });

  it("refuses to guess for countries with several", () => {
    // A wrong zone is confidently wrong; null falls back to UTC and stays
    // obviously unknown.
    expect(timezoneForCountry("US")).toBeNull();
    expect(timezoneForCountry("AU")).toBeNull();
    expect(timezoneForCountry("RU")).toBeNull();
    expect(timezoneForCountry(null)).toBeNull();
  });

  it("only names zones this runtime actually recognises", () => {
    for (const code of ["BE", "NL", "FR", "DE", "GB", "JP", "IN", "NZ", "ZA"]) {
      const zone = timezoneForCountry(code)!;
      expect(isValidTimezone(zone), `${code} -> ${zone}`).toBe(true);
    }
  });
});
