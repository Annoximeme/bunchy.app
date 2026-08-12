import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { LEGAL, legalReviewComplete } from "@/lib/legal";

/**
 * The policy pages describe what the code does. Two things can rot: the
 * placeholders can survive into production, and the copy can drift from the
 * behaviour it claims. This catches the first and pins the load-bearing claims
 * of the second.
 */
describe("who operates Bunchy", () => {
  it("names a real person, with no placeholders left", () => {
    const placeholder = Object.entries(LEGAL).find(
      ([, value]) => typeof value === "string" && value.startsWith("TODO_"),
    );
    expect(placeholder).toBeUndefined();
    expect(LEGAL.operator).toBe("Gianni Goossens");
  });

  it("publishes no postal address", () => {
    // The operator is a sole trader; a registered address is a home address.
    // The GDPR wants identity and contact details, and an email that reaches a
    // person satisfies the latter. If a street ever appears in here, that was
    // probably not deliberate.
    const values = Object.values(LEGAL).filter((v) => typeof v === "string");
    for (const value of values) {
      expect(value).not.toMatch(/\b\d{1,4}\s+\w+(straat|laan|weg|street|road|avenue)\b/i);
    }
  });

  it("keeps “details filled in” separate from “reviewed by a lawyer”", () => {
    // Conflating them would let a complete-looking page imply a review that
    // has not happened. Flip lawyerReviewed once one has.
    expect(legalReviewComplete()).toBe(false);
  });
});

describe("the policy matches the code", () => {
  const privacy = readFileSync("src/app/(legal)/privacy/page.tsx", "utf8");

  it("states the same session lifetime the auth layer enforces", () => {
    const session = readFileSync("src/server/auth/session.ts", "utf8");
    expect(session).toContain("30 * 24 * 60 * 60 * 1000");
    expect(privacy).toContain("30 days");
  });

  it("states the same minimum age the schema enforces", () => {
    const schemas = readFileSync("src/server/modules/profile/schemas.ts", "utf8");
    expect(schemas).toContain("CURRENT_YEAR - 16");
    expect(privacy).toContain("16 or over");
  });

  it("claims no page-view tracking, and the taxonomy has none", async () => {
    // Checked against the values, not the file: the module's doc comment names
    // these very events as the ones deliberately absent.
    const { ANALYTICS_EVENTS } = await import(
      "@/server/modules/analytics/events"
    );
    for (const name of Object.values(ANALYTICS_EVENTS)) {
      expect(name).not.toMatch(/page|view|duration|scroll|session/i);
    }
    expect(privacy).toContain("No page views");
  });

  it("claims location is coarsened on write, and it is", () => {
    const precision = readFileSync("src/server/modules/geo/precision.ts", "utf8");
    expect(precision).toMatch(/snapToGrid/);
    expect(privacy).toContain("snap the coordinates to a coarse grid");
  });
});
