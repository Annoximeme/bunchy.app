import { describe, expect, it } from "vitest";
import { hashPassword, needsRehash, verifyPassword } from "@/server/auth/password";

/**
 * The parts of password hashing that are not "does it round-trip".
 *
 * The round trip is the easy half and would pass with a hash function that had
 * no cost at all. What is worth asserting is the behaviour on input that was
 * not produced by `hashPassword`: a stored hash is data, and this function
 * reads its own cost parameters out of it.
 */
describe("verifyPassword", () => {
  it("accepts a password it hashed", async () => {
    const stored = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("correct horse battery staple", stored)).toBe(true);
  });

  it("rejects the wrong password", async () => {
    const stored = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("Correct horse battery staple", stored)).toBe(false);
  });

  it("normalises unicode, so the same typed password matches either encoding", async () => {
    // é as one code point, then as e + combining acute.
    const stored = await hashPassword("café password");
    expect(await verifyPassword("café password", stored)).toBe(true);
  });

  it.each([
    ["not a hash at all", "hunter2"],
    ["wrong prefix", "bcrypt$32768$8$1$c2FsdA==$a2V5"],
    ["non-numeric cost", "scrypt$lots$8$1$c2FsdA==$a2V5"],
    ["empty salt", "scrypt$32768$8$1$$a2V5"],
  ])("returns false rather than throwing on %s", async (_case, stored) => {
    await expect(verifyPassword("hunter2", stored)).resolves.toBe(false);
  });

  /**
   * The ceiling on the cost parameters.
   *
   * scrypt needs 128 * N * r bytes, and those come out of the stored string. A
   * row asking for gigabytes would otherwise be honoured on the next login
   * attempt against that account, a denial of service written into one field,
   * needing no traffic to trigger.
   */
  it("refuses a hash whose parameters ask for absurd memory", async () => {
    // 128 * 2^21 * 8 = 2GB. Chosen because it is a size the machine might
    // actually hand over, an implausibly huge value is the easy case, since
    // the allocation simply fails. This one succeeds and then thrashes.
    const absurd = `scrypt$${2 ** 21}$8$1$c2FsdA==$a2V5`;
    const started = Date.now();
    await expect(verifyPassword("hunter2", absurd)).resolves.toBe(false);
    // Refused on the parameters rather than attempted: deriving at that cost
    // takes far longer than this, if it returns at all.
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it("refuses an absurd parallelisation factor", async () => {
    await expect(verifyPassword("hunter2", `scrypt$32768$8$99999$c2FsdA==$a2V5`)).resolves.toBe(
      false,
    );
  });
});

describe("needsRehash", () => {
  it("is false for a hash at the current parameters", async () => {
    expect(needsRehash(await hashPassword("hunter2"))).toBe(false);
  });

  it("is true for one made with weaker parameters", () => {
    expect(needsRehash("scrypt$16384$8$1$c2FsdA==$a2V5")).toBe(true);
  });

  it("is true for anything it cannot read", () => {
    expect(needsRehash("not a hash")).toBe(true);
  });
});
