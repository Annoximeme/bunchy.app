import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Unsubscribing has to work for anybody holding a link we sent, and for nobody
 * else. Both halves are tested here, plus the pairing rule the templates rely
 * on: a message either carries the visible link *and* the one-click header, or
 * neither.
 */

const deleteMany = vi.fn();
const findProfile = vi.fn();
const upsert = vi.fn();
const transaction = vi.fn();

vi.mock("@/server/db/client", () => ({
  db: {
    waitlistSignup: { deleteMany: (...a: unknown[]) => deleteMany(...a) },
    profile: { findUnique: (...a: unknown[]) => findProfile(...a) },
    notificationPreference: { upsert: (...a: unknown[]) => upsert(...a) },
    $transaction: (...a: unknown[]) => transaction(...a),
  },
}));

const {
  signUnsubscribe,
  verifyUnsubscribe,
  unsubscribeLink,
  unsubscribeOneClick,
  applyUnsubscribe,
} = await import("@/server/email/unsubscribe");

const { notificationEmail, waitlistLaunchEmail, passwordResetEmail } =
  await import("@/server/email/templates");

beforeEach(() => {
  deleteMany.mockReset().mockResolvedValue({ count: 1 });
  findProfile.mockReset().mockResolvedValue({ id: "p1" });
  upsert.mockReset().mockReturnValue({});
  transaction.mockReset().mockResolvedValue([]);
});

describe("tokens", () => {
  it("round-trips a waitlist address", () => {
    const target = { kind: "waitlist", email: "sam@example.com" } as const;
    expect(verifyUnsubscribe(signUnsubscribe(target))).toEqual(target);
  });

  it("round-trips a profile", () => {
    const target = { kind: "notifications", profileId: "prof_123" } as const;
    expect(verifyUnsubscribe(signUnsubscribe(target))).toEqual(target);
  });

  it("keeps the whole address, dots and all", () => {
    // The payload is dot-delimited and an address is full of dots. Splitting
    // naively truncates `a.b@example.co.uk` to `a`, and the unsubscribe then
    // silently removes nobody.
    const email = "first.last@mail.example.co.uk";
    const token = signUnsubscribe({ kind: "waitlist", email });
    expect(verifyUnsubscribe(token)).toEqual({ kind: "waitlist", email });
  });

  it("refuses a token with a tampered payload", () => {
    const token = signUnsubscribe({
      kind: "waitlist",
      email: "sam@example.com",
    });
    const [, signature] = token.split(".");
    const forged = `${Buffer.from("u1.w.victim@example.com", "utf8").toString("base64url")}.${signature}`;

    expect(verifyUnsubscribe(forged)).toBeNull();
  });

  it("refuses junk rather than throwing", () => {
    for (const bad of ["", "nope", "a.b.c", "....", "!!!.???"]) {
      expect(() => verifyUnsubscribe(bad)).not.toThrow();
      expect(verifyUnsubscribe(bad)).toBeNull();
    }
  });

  it("refuses a token from a different version of the format", () => {
    const payload = Buffer.from("u0.w.sam@example.com", "utf8").toString(
      "base64url",
    );
    // Even correctly signed, an old version must not be honoured, that is the
    // entire point of the prefix.
    const token = signUnsubscribe({ kind: "waitlist", email: "x" });
    expect(verifyUnsubscribe(`${payload}.${token.split(".")[1]}`)).toBeNull();
  });

  it("gives each address its own token", () => {
    const a = signUnsubscribe({ kind: "waitlist", email: "a@example.com" });
    const b = signUnsubscribe({ kind: "waitlist", email: "b@example.com" });
    expect(a).not.toBe(b);
    // One person's link must not remove another's, which is why the launch
    // send renders per recipient rather than once.
    expect(verifyUnsubscribe(a)).toEqual({
      kind: "waitlist",
      email: "a@example.com",
    });
  });
});

describe("urls", () => {
  it("sends humans to a page and clients to the endpoint", () => {
    const target = { kind: "waitlist", email: "sam@example.com" } as const;
    expect(unsubscribeLink(target)).toContain("/unsubscribe?token=");
    expect(unsubscribeOneClick(target)).toContain("/api/unsubscribe?token=");
  });

  it("carries a token both endpoints accept", () => {
    const target = { kind: "notifications", profileId: "p1" } as const;
    for (const url of [unsubscribeLink(target), unsubscribeOneClick(target)]) {
      const token = new URL(url).searchParams.get("token")!;
      expect(verifyUnsubscribe(token)).toEqual(target);
    }
  });
});

describe("applying it", () => {
  it("takes a waitlist address off the list entirely", async () => {
    expect(
      await applyUnsubscribe({ kind: "waitlist", email: "Sam@Example.com" }),
    ).toBe("done");
    // Lowercased on the way in, or a capitalised address in an old email
    // matches nothing and the unsubscribe silently does nothing.
    expect(deleteMany).toHaveBeenCalledWith({
      where: { email: "sam@example.com" },
    });
  });

  it("reports an address that is already gone as handled, not broken", async () => {
    deleteMany.mockResolvedValue({ count: 0 });
    expect(
      await applyUnsubscribe({ kind: "waitlist", email: "sam@example.com" }),
    ).toBe("already");
  });

  it("turns off email for every notification type at once", async () => {
    await applyUnsubscribe({ kind: "notifications", profileId: "p1" });

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(upsert.mock.calls.length).toBeGreaterThan(1);
    for (const [call] of upsert.mock.calls) {
      expect(call.update).toEqual({ email: false });
      expect(call.create.email).toBe(false);
    }
  });

  it("never switches an in-app notification on as a side effect", async () => {
    // The created row has to carry the same in-app default the settings screen
    // draws. Turning email off must not quietly enable every suggestion type.
    await applyUnsubscribe({ kind: "notifications", profileId: "p1" });
    const created = upsert.mock.calls.map(([c]) => c.create.inApp);
    expect(created).toContain(false);
  });

  it("does not blow up on a profile that no longer exists", async () => {
    findProfile.mockResolvedValue(null);
    expect(
      await applyUnsubscribe({ kind: "notifications", profileId: "gone" }),
    ).toBe("already");
    expect(transaction).not.toHaveBeenCalled();
  });
});

describe("which emails offer it", () => {
  it("puts both the header URL and a visible link on bulk mail", () => {
    const email = waitlistLaunchEmail("https://bunchy.app/signup", {
      kind: "waitlist",
      email: "sam@example.com",
    });

    expect(email.unsubscribeUrl).toContain("/api/unsubscribe?token=");
    // Visible in both parts, because the header is honoured by three clients
    // and read by none of the others.
    expect(email.html).toContain("/unsubscribe?token=");
    expect(email.text).toContain("/unsubscribe?token=");
  });

  it("offers it on notification mail", () => {
    const email = notificationEmail({
      title: "Sam replied",
      settingsUrl: "https://bunchy.app/profile",
      unsubscribe: { kind: "notifications", profileId: "p1" },
    });
    expect(email.unsubscribeUrl).toBeTruthy();
    expect(email.html).toContain("Unsubscribe");
  });

  it("offers it nowhere on a password reset", () => {
    // Not a subscription. Offering somebody locked out of their account a way
    // to opt out of the message that lets them back in is a trap.
    const email = passwordResetEmail("https://bunchy.app/reset?token=x");
    expect(email.unsubscribeUrl).toBeUndefined();
    expect(email.html).not.toContain("Unsubscribe");
  });
});
