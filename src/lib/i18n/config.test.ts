import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  localePath,
  preferredLocale,
  splitLocale,
} from "@/lib/i18n/config";

/**
 * The rules that decide which language a request is in.
 *
 * Worth pinning tightly, because every one of them is a way to send somebody
 * to the wrong page: a prefix mistaken for a username, an English page living
 * at two addresses, or a French speaker landing in Dutch because their browser
 * asked for both and the second one won.
 */
describe("reading a language off an address", () => {
  it("takes the prefix when there is one", () => {
    expect(splitLocale("/nl/discover")).toEqual({ locale: "nl", path: "/discover" });
    expect(splitLocale("/fr")).toEqual({ locale: "fr", path: "/" });
  });

  it("leaves an address that names no language alone", () => {
    expect(splitLocale("/discover")).toEqual({ locale: null, path: "/discover" });
    expect(splitLocale("/")).toEqual({ locale: null, path: "/" });
  });

  it("does not mistake a page or a member for a language", () => {
    // Two-letter paths are the dangerous ones. `/no` is a page about saying no
    // to an invitation as far as this function is concerned, not Norwegian.
    expect(splitLocale("/no")).toEqual({ locale: null, path: "/no" });
    expect(splitLocale("/nlisha")).toEqual({ locale: null, path: "/nlisha" });
  });
});

describe("writing an address in a language", () => {
  it("prefixes everything but the default", () => {
    expect(localePath("nl", "/discover")).toBe("/nl/discover");
    expect(localePath("fr", "/")).toBe("/fr");
    expect(localePath(DEFAULT_LOCALE, "/discover")).toBe("/discover");
  });

  it("leaves anything that is not a path of this app untouched", () => {
    expect(localePath("nl", "https://example.com")).toBe("https://example.com");
    expect(localePath("nl", "mailto:hey@bunchy.app")).toBe("mailto:hey@bunchy.app");
    expect(localePath("nl", "#main")).toBe("#main");
  });

  it("round-trips with the reading of one", () => {
    for (const path of ["/", "/discover", "/bunches/board-games"]) {
      expect(splitLocale(localePath("fr", path)).path).toBe(path);
    }
  });
});

describe("guessing from the browser", () => {
  it("honours the order the browser asked in", () => {
    expect(preferredLocale("nl-BE,nl;q=0.9,en;q=0.8")).toBe("nl");
    expect(preferredLocale("en-US,en;q=0.9")).toBe("en");
  });

  it("prefers the higher quality even when it is listed second", () => {
    expect(preferredLocale("de;q=0.5,fr;q=0.9")).toBe("fr");
  });

  it("skips languages this app does not have rather than approximating one", () => {
    expect(preferredLocale("de-DE,de;q=0.9")).toBeNull();
    expect(preferredLocale("")).toBeNull();
    expect(preferredLocale(null)).toBeNull();
  });

  it("reads a region as its language", () => {
    expect(preferredLocale("fr-BE")).toBe("fr");
  });
});
