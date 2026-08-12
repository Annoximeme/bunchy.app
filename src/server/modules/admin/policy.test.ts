import { describe, expect, it } from "vitest";
import { isStaffRole, refusalToActOn } from "@/server/modules/admin/policy";
import type { UserRole } from "@/generated/prisma/enums";

/**
 * The staff authorization matrix.
 *
 * This is the rule that stops one compromised moderator session from locking
 * out every other staff member, so it is covered exhaustively rather than by
 * example. The table below is the whole permission model — if a cell changes,
 * a test fails.
 */

const ROLES: UserRole[] = ["MEMBER", "MODERATOR", "ADMIN"];

describe("isStaffRole", () => {
  it("treats only moderators and admins as staff", () => {
    expect(isStaffRole("MEMBER")).toBe(false);
    expect(isStaffRole("MODERATOR")).toBe(true);
    expect(isStaffRole("ADMIN")).toBe(true);
  });
});

describe("refusalToActOn", () => {
  /** actor role -> target role -> allowed? */
  const EXPECTED: Record<UserRole, Record<UserRole, boolean>> = {
    MEMBER: { MEMBER: false, MODERATOR: false, ADMIN: false },
    MODERATOR: { MEMBER: true, MODERATOR: false, ADMIN: false },
    ADMIN: { MEMBER: true, MODERATOR: true, ADMIN: false },
  };

  for (const actorRole of ROLES) {
    for (const targetRole of ROLES) {
      const allowed = EXPECTED[actorRole][targetRole];
      it(`${actorRole} ${allowed ? "may" : "may not"} act on ${targetRole}`, () => {
        const refusal = refusalToActOn(
          { userId: "actor", role: actorRole },
          { userId: "target", role: targetRole },
        );
        expect(refusal === null).toBe(allowed);
      });
    }
  }

  it("never lets anyone act on their own account, whatever their role", () => {
    for (const role of ROLES) {
      const refusal = refusalToActOn(
        { userId: "same", role },
        { userId: "same", role },
      );
      expect(refusal).toBeTruthy();
      expect(refusal).toMatch(/own account/i);
    }
  });

  it("refuses a plain member even when they somehow reach the service", () => {
    // Defence in depth: the route guard should already have stopped this, but
    // the domain must not rely on that.
    expect(
      refusalToActOn(
        { userId: "member", role: "MEMBER" },
        { userId: "victim", role: "MEMBER" },
      ),
    ).toMatch(/staff/i);
  });

  it("stops a moderator escalating against another moderator", () => {
    expect(
      refusalToActOn(
        { userId: "mod-a", role: "MODERATOR" },
        { userId: "mod-b", role: "MODERATOR" },
      ),
    ).toMatch(/admin/i);
  });

  it("protects admins from every actor, including other admins", () => {
    for (const role of ROLES) {
      expect(
        refusalToActOn(
          { userId: "actor", role },
          { userId: "the-admin", role: "ADMIN" },
        ),
      ).toBeTruthy();
    }
  });
});
