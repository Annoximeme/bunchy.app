import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * `resolveReferrer` is the only part of referrals with rules worth asserting:
 * what it accepts, and — more importantly — the two cases where it must refuse.
 * The database is stubbed so these stay unit tests.
 */

const findUnique = vi.fn();
vi.mock("@/server/db/client", () => ({
  db: { profile: { findUnique: (...args: unknown[]) => findUnique(...args) } },
}));

const { resolveReferrer } = await import("@/server/modules/profile/referrals");

beforeEach(() => {
  findUnique.mockReset();
});

describe("resolveReferrer", () => {
  it("returns null for a missing code without touching the database", async () => {
    expect(await resolveReferrer(undefined)).toBeNull();
    expect(await resolveReferrer(null)).toBeNull();
    expect(await resolveReferrer("")).toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("rejects malformed codes before querying", async () => {
    for (const bad of ["ab", "!!!!!!!!", "a-b-c-d", "x".repeat(40)]) {
      expect(await resolveReferrer(bad)).toBeNull();
    }
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("normalizes case and whitespace, because links get retyped", async () => {
    findUnique.mockResolvedValue({ id: "p1", user: { status: "ACTIVE" } });
    expect(await resolveReferrer("  abc12xyz ")).toBe("p1");
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { referralCode: "ABC12XYZ" } }),
    );
  });

  it("returns null for an unrecognised code rather than throwing", async () => {
    findUnique.mockResolvedValue(null);
    // A mistyped invite link must never block a signup — losing attribution is
    // a rounding error, refusing the account is not.
    expect(await resolveReferrer("ZZZZZZZZ")).toBeNull();
  });

  it("refuses a suspended or banned member's link", async () => {
    for (const status of ["SUSPENDED", "BANNED", "DEACTIVATED"]) {
      findUnique.mockResolvedValue({ id: "p1", user: { status } });
      // Otherwise a ban is routed around by inviting fresh accounts.
      expect(await resolveReferrer("ABC12XYZ")).toBeNull();
    }
  });
});
