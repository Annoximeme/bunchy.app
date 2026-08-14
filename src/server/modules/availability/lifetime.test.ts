import { describe, expect, it } from "vitest";
import { CUSTOM_HOURS, HORIZON_KINDS } from "@/server/modules/availability/service";

/**
 * The two rules Bunchy Now added to a feature whose whole point is that
 * everything in it expires.
 */
describe("custom status lifetimes", () => {
  it("offers only a fixed set of durations", () => {
    // An open number field is how "free now" becomes a permanent profile field.
    expect([...CUSTOM_HOURS]).toEqual([1, 3, 6, 12, 24, 48]);
  });
});

describe("horizons", () => {
  it("sorts every horizon kind into exactly one bucket", () => {
    const all = Object.values(HORIZON_KINDS).flat();
    expect(new Set(all).size).toBe(all.length);
  });

  it("puts the spontaneous kinds under 'now' and the slow ones under 'weekend'", () => {
    // The mapping is the product judgement being pinned: somebody filtering
    // "now" wants people who are free this minute, not people free on Sunday.
    expect(HORIZON_KINDS.now).toContain("FREE_NOW");
    expect(HORIZON_KINDS.now).toContain("UP_FOR_SPONTANEOUS");
    expect(HORIZON_KINDS.weekend).toContain("FREE_THIS_WEEKEND");
    expect(HORIZON_KINDS.tonight).toContain("FREE_TONIGHT");
  });
});
