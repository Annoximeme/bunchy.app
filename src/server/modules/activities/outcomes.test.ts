import { describe, expect, it } from "vitest";
import { resolveMetSomeone } from "@/server/modules/activities/outcomes";

/**
 * The rule that keeps the success metric honest. Everything else in this module
 * is a database call; this is the judgement.
 */
describe("resolveMetSomeone", () => {
  it("records the answer from someone who went", () => {
    expect(resolveMetSomeone(true, true)).toBe(true);
    expect(resolveMetSomeone(true, false)).toBe(false);
  });

  it("stays null for someone who went but was not asked yet", () => {
    // The first tap answers "did you go"; the second question has not been
    // shown. Null is "unanswered", not "no".
    expect(resolveMetSomeone(true, undefined)).toBeNull();
  });

  it("never records a meeting answer for someone who did not go", () => {
    // A false here would later read as "went and met nobody", which would drag
    // down the one number the product is built to move.
    expect(resolveMetSomeone(false, false)).toBeNull();
    expect(resolveMetSomeone(false, true)).toBeNull();
    expect(resolveMetSomeone(false, undefined)).toBeNull();
  });
});
