import type { UserRole } from "@/generated/prisma/enums";

/**
 * The staff permission model, as pure functions.
 *
 * Deliberately free of any database or request dependency. This is the rule
 * that stops one compromised moderator session from locking out every other
 * staff member, so it should be testable exhaustively and in isolation — a
 * security policy you need a running Postgres to exercise is a security policy
 * that quietly stops being exercised.
 *
 * `guard.ts` layers the request-bound checks on top of this.
 */

export const STAFF_ROLES = ["MODERATOR", "ADMIN"] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export function isStaffRole(role: UserRole): role is StaffRole {
  return (STAFF_ROLES as readonly UserRole[]).includes(role);
}

export interface Principal {
  userId: string;
  role: UserRole;
}

/**
 * Whether one account may take a moderation action against another.
 *
 * Returns null when allowed, or the reason it is refused.
 *
 * The matrix:
 *
 * | actor \ target | MEMBER | MODERATOR | ADMIN |
 * |----------------|--------|-----------|-------|
 * | MEMBER         |   no   |    no     |  no   |
 * | MODERATOR      |  yes   |    no     |  no   |
 * | ADMIN          |  yes   |   yes     |  no   |
 *
 * Nobody, at any rank, may act on their own account — otherwise an admin can
 * demote themselves into a state nobody can restore, and a suspended staff
 * member can lift their own suspension.
 */
export function refusalToActOn(
  actor: Principal,
  target: Principal,
): string | null {
  if (actor.userId === target.userId) {
    return "You can't apply that to your own account.";
  }
  if (!isStaffRole(actor.role)) {
    return "Only staff can do that.";
  }
  if (target.role === "ADMIN") {
    return "Admins can't be actioned from the dashboard.";
  }
  if (actor.role !== "ADMIN" && target.role === "MODERATOR") {
    return "Only an admin can action a moderator.";
  }
  return null;
}
