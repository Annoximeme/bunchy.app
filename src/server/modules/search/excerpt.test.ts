import { describe, expect, it } from "vitest";
import { excerpt } from "./service";

/**
 * A result list shows a window of the message, not the message.
 */

describe("excerpt", () => {
  it("returns a short message whole, with no ellipses to explain", () => {
    expect(excerpt("See you at eight.", "eight")).toBe("See you at eight.");
  });

  it("windows a long message around the match", () => {
    const body = `${"a".repeat(200)} Bar Bassin ${"b".repeat(200)}`;
    const result = excerpt(body, "Bassin");
    expect(result).toContain("Bar Bassin");
    expect(result.startsWith("…")).toBe(true);
    expect(result.endsWith("…")).toBe(true);
    expect(result.length).toBeLessThan(body.length);
  });

  it("does not mark a trim it did not make", () => {
    const body = `Bar Bassin ${"b".repeat(200)}`;
    expect(excerpt(body, "Bar").startsWith("…")).toBe(false);
  });

  it("matches regardless of case, the way the query does", () => {
    const body = `${"a".repeat(200)} Bar Bassin ${"b".repeat(200)}`;
    expect(excerpt(body, "bassin")).toContain("Bar Bassin");
  });

  it("falls back to the opening when the match is not in the body", () => {
    // Reachable when the database matched on a column this is not summarising.
    expect(excerpt("Nothing relevant here.", "zzz")).toBe("Nothing relevant here.");
  });
});
