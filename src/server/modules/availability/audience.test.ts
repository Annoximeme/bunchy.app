import { describe, expect, it } from "vitest";
import {
  availabilityAudienceCondition,
  visibleStatusCondition,
} from "@/server/modules/availability/service";

/**
 * The audience test is now used in two places — attaching a badge, and choosing
 * who counts as "available" in the first place. These pin the property that
 * made the second one necessary.
 */
describe("availability audience", () => {
  const condition = availabilityAudienceCondition("viewer-1");

  it("never matches on the absence of a rule", () => {
    // Every branch has to be an explicit permission. A condition that matched
    // by default would silently expose everyone the day a branch was mistyped.
    expect(Array.isArray(condition.OR)).toBe(true);
    expect(condition.OR.length).toBeGreaterThan(2);
  });

  it("treats a member with no privacy row as the column default", () => {
    const serialized = JSON.stringify(condition);
    expect(serialized).toContain('"privacy":{"is":null}');
  });

  it("offers EVERYONE, CONNECTIONS and BUNCH_MEMBERS as distinct branches", () => {
    const serialized = JSON.stringify(condition);
    expect(serialized).toContain("EVERYONE");
    expect(serialized).toContain("CONNECTIONS");
    expect(serialized).toContain("BUNCH_MEMBERS");
    // NOBODY is absent on purpose: it is the one setting with no branch, so it
    // can never match.
    expect(serialized).not.toContain("NOBODY");
  });

  it("wraps the same test for status rows without changing it", () => {
    // The two shapes must not drift: one is the other under a `profile` key.
    expect(visibleStatusCondition("viewer-1")).toEqual({ profile: condition });
  });
});
