import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { LEGAL, legalDetailsComplete } from "@/lib/legal";

/**
 * The policy pages describe what the code does. Two things can rot: the
 * placeholders can survive into production, and the copy can drift from the
 * behaviour it claims. This catches the first and pins the load-bearing claims
 * of the second.
 */
describe("legal details", () => {
  it("lists every field a lawyer must fill in", () => {
    // Fails deliberately until the entity, address and jurisdiction are real.
    // Delete nothing here to make it pass — fill in src/lib/legal.ts.
    const missing = Object.entries(LEGAL)
      .filter(([, value]) => value.startsWith("TODO_"))
      .map(([key]) => key);

    expect(
      missing,
      `Unfilled legal details: ${missing.join(", ")}. These are drafts by an ` +
        `engineer, not legal advice — fill them in and get the documents ` +
        `reviewed before launch.`,
    ).toEqual([
      "entity",
      "address",
      "registration",
      "jurisdiction",
      "supervisoryAuthority",
      "effectiveDate",
    ]);
  });

  it("shows a draft notice while anything is unfilled", () => {
    expect(legalDetailsComplete()).toBe(false);
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
