import { describe, expect, it } from "vitest";
import { hasGoneQuiet, QUIET_AFTER_DAYS } from "@/server/modules/bunches/dormancy";

/**
 * When a group counts as having stopped.
 *
 * The rule is worth arguing with in a test rather than discovering by sending
 * five people a notification about a group they are meeting on Thursday.
 */

const NOW = new Date("2026-09-06T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(NOW.getTime() - days * DAY);
const inDays = (days: number) => new Date(NOW.getTime() + days * DAY);

const base = {
  createdAt: daysAgo(200),
  lastMessageAt: daysAgo(60),
  lastActivityAt: null,
  nextActivityAt: null,
  activeMembers: 5,
};

describe("hasGoneQuiet", () => {
  it("is true when nothing has been said or done for six weeks", () => {
    expect(hasGoneQuiet(base, NOW)).toBe(true);
  });

  it("is false while somebody is still talking", () => {
    expect(
      hasGoneQuiet({ ...base, lastMessageAt: daysAgo(QUIET_AFTER_DAYS - 1) }, NOW),
    ).toBe(false);
  });

  it("is false when something is coming up, however quiet the chat", () => {
    // A group that arranges an evening and says nothing in between is one of
    // the healthier shapes this product has, not a dead one.
    expect(
      hasGoneQuiet({ ...base, nextActivityAt: inDays(3) }, NOW),
    ).toBe(false);
  });

  it("counts an evening that happened as a sign of life", () => {
    expect(
      hasGoneQuiet({ ...base, lastActivityAt: daysAgo(10) }, NOW),
    ).toBe(false);
  });

  it("leaves a brand new bunch alone", () => {
    expect(
      hasGoneQuiet(
        { ...base, createdAt: daysAgo(3), lastMessageAt: null },
        NOW,
      ),
    ).toBe(false);
  });

  it("says nothing to a bunch of one", () => {
    // There is no group here to have ended, and telling its only member it has
    // gone quiet would be telling them something about themselves.
    expect(hasGoneQuiet({ ...base, activeMembers: 1 }, NOW)).toBe(false);
  });

  it("treats a bunch nobody ever spoke in as quiet, once it is old enough", () => {
    expect(
      hasGoneQuiet({ ...base, lastMessageAt: null, createdAt: daysAgo(90) }, NOW),
    ).toBe(true);
  });
});
