import { describe, expect, it } from "vitest";
import {
  isValidTimezone,
  timezoneForCountry,
} from "@/server/modules/geo/timezone";

/**
 * The precedence rule saveBasics applies: a valid detected zone wins, an
 * invalid one is discarded, and the country is the fallback.
 *
 * Expressed as the same expression the service uses rather than by calling
 * `saveBasics`, which would need a database — the branch worth pinning is which
 * of the three sources wins, not the write.
 */
function resolveTimezone(
  detected: string | undefined,
  countryCode: string | null,
): string | null {
  return (
    (detected && isValidTimezone(detected) ? detected : null) ??
    timezoneForCountry(countryCode)
  );
}

describe("timezone precedence", () => {
  it("prefers the browser's zone over the country's", () => {
    // Belgium derives cleanly, but someone in Brussels reading this page from
    // Lisbon should still get Lisbon.
    expect(resolveTimezone("Europe/Lisbon", "BE")).toBe("Europe/Lisbon");
  });

  it("fixes the countries a country code cannot resolve", () => {
    // The whole reason this exists: these three derived to null and fell back
    // to UTC, so an evening window meant 18:00 UTC wherever you were.
    expect(timezoneForCountry("US")).toBeNull();
    expect(resolveTimezone("America/Los_Angeles", "US")).toBe(
      "America/Los_Angeles",
    );
    expect(resolveTimezone("Australia/Sydney", "AU")).toBe("Australia/Sydney");
  });

  it("falls back to the country when nothing was detected", () => {
    expect(resolveTimezone(undefined, "BE")).toBe("Europe/Brussels");
  });

  it("discards a zone the runtime does not recognise", () => {
    // Arrives from a client, so it is attacker-controlled text.
    expect(resolveTimezone("Mars/Olympus", "BE")).toBe("Europe/Brussels");
    expect(resolveTimezone("'; drop table profiles --", "BE")).toBe(
      "Europe/Brussels",
    );
  });

  it("stays honestly unknown when neither source can answer", () => {
    expect(resolveTimezone(undefined, "US")).toBeNull();
    expect(resolveTimezone("nonsense", null)).toBeNull();
  });
});
