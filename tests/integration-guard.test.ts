import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The guard that stops integration tests running against a real database.
 *
 * This lives in the *unit* suite deliberately. Its whole job is to fire when
 * something goes wrong with how the integration suite is invoked, so it cannot
 * be verified by the integration suite — that one only runs when everything is
 * already correct.
 *
 * The history: the unit config's `tests/**` glob once swept the integration
 * files up and ran them against `bunchy_dev` with none of the integration
 * setup. They truncate between cases, so a thousand rows went into the
 * development database before anyone noticed. The glob was fixed; this exists
 * because a glob is a thing someone can change back.
 */

const ORIGINAL = process.env.DATABASE_URL;

afterEach(() => {
  process.env.DATABASE_URL = ORIGINAL;
  vi.resetModules();
});

describe("the integration database guard", () => {
  it("refuses a URL that is not the test database", async () => {
    process.env.DATABASE_URL =
      "postgresql://bunchy:secret@127.0.0.1:5432/bunchy_dev?schema=public";
    vi.resetModules();

    await expect(import("./integration/db")).rejects.toThrow(
      /must run against bunchy_test/,
    );
  });

  it("does not leak the password when it complains", async () => {
    process.env.DATABASE_URL =
      "postgresql://bunchy:hunter2@127.0.0.1:5432/bunchy_dev?schema=public";
    vi.resetModules();

    await expect(import("./integration/db")).rejects.toThrow(
      expect.objectContaining({
        message: expect.not.stringContaining("hunter2") as unknown as string,
      }),
    );
  });

  it("refuses an unset URL rather than defaulting to something", async () => {
    delete process.env.DATABASE_URL;
    vi.resetModules();

    await expect(import("./integration/db")).rejects.toThrow(
      /must run against bunchy_test/,
    );
  });

  it("allows the test database", async () => {
    process.env.DATABASE_URL =
      "postgresql://bunchy:secret@127.0.0.1:5432/bunchy_test?schema=public";
    vi.resetModules();

    const guarded = await import("./integration/db");
    expect(guarded.db).toBeDefined();
  });
});
