import { describe, expect, it } from "vitest";
import {
  MIN_HOSTED_TO_SHOW,
  hostLine,
  type HostStats,
} from "@/server/modules/activities/hosting";

const stats = (hosted: number, attended: number): HostStats => ({
  hosted,
  attended,
});

/**
 * The sentence is the whole public surface of this feature, so what it refuses
 * to say matters as much as what it says.
 */
describe("the host line", () => {
  it("says nothing at all for somebody new", () => {
    // Not "0 evenings hosted". A zero is a mark against somebody for being
    // new, which is the opposite of what this is for.
    expect(hostLine(stats(0, 0))).toBeNull();
    expect(hostLine(stats(MIN_HOSTED_TO_SHOW - 1, 0))).toBeNull();
  });

  it("speaks once there is something to say", () => {
    expect(hostLine(stats(3, 3))).toBe(
      "Has arranged 3 evenings, and people turned up to all of them.",
    );
  });

  it("states a partial turnout plainly rather than as a rate", () => {
    // Not "67%". A percentage invites comparison and reads as a score; two
    // counts read as what happened.
    const line = hostLine(stats(6, 4))!;
    expect(line).toBe("Has arranged 6 evenings, and people turned up to 4.");
    expect(line).not.toMatch(/%/);
  });

  it("does not editorialise when nobody came", () => {
    // No apology, no warning, no "but". The fact is the fact, and dressing it
    // up either way would be the product taking a view on a member.
    expect(hostLine(stats(4, 0))).toBe("Has arranged 4 evenings.");
  });

  it("never produces a score, a level or a rank", () => {
    for (const [h, a] of [[3, 0], [5, 2], [9, 9], [40, 31]] as const) {
      const line = hostLine(stats(h, a))!;
      expect(line).not.toMatch(/level|tier|rank|score|pts|xp|badge/i);
    }
  });
});
