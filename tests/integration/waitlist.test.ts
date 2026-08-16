import { afterEach, describe, expect, it } from "vitest";
import { db } from "./db";
import {
  joinWaitlist,
  publicWaitlistCount,
  MIN_PUBLIC_COUNT,
  waitlistEmailSchema,
} from "@/server/modules/waitlist/service";
import { announceLaunch } from "@/server/modules/waitlist/announce";
import {
  applyUnsubscribe,
  signUnsubscribe,
  verifyUnsubscribe,
} from "@/server/email/unsubscribe";
import { setEmailTransport } from "@/server/email";
import type { EmailMessage } from "@/server/email";

/**
 * The waiting list against a real database.
 *
 * It is the only unauthenticated write in the product, the only bulk send, and
 * the one dataset made entirely of addresses from people who are not members
 * and never agreed to anything beyond a single email. The unit tests stub the
 * database and so cannot see the two things that actually matter here: that
 * the unique index makes a second signup a no-op rather than an error, and
 * that unsubscribing really removes the row the announcement would have read.
 */

// The transport override is module-level state, so it has to be handed back or
// it leaks into every integration file that runs after this one.
afterEach(() => setEmailTransport(undefined));

/** Collects what would have been sent. */
function recorder() {
  const sent: EmailMessage[] = [];
  setEmailTransport({
    async send(message) {
      sent.push(message);
    },
  });
  return sent;
}

describe("joining", () => {
  it("stores the address once, however many times it is submitted", async () => {
    await joinWaitlist("Sam@Example.com");
    await joinWaitlist("sam@example.com");
    await joinWaitlist("  SAM@example.com  ");

    const rows = await db.waitlistSignup.findMany();
    expect(rows).toHaveLength(1);
    // Normalised on the way in, or the unique index is decoration: three
    // spellings of one address would occupy three rows and get three emails.
    expect(rows[0]!.email).toBe("sam@example.com");
  });

  it("does not report a repeat signup as an error", async () => {
    // A form that answered "that email is already taken" would turn the
    // coming-soon page into a way of testing whether an address is on the list.
    await joinWaitlist("twice@example.com");
    await expect(joinWaitlist("twice@example.com")).resolves.toBeUndefined();
  });

  it("keeps the original position on a repeat signup", async () => {
    await joinWaitlist("early@example.com");
    const first = await db.waitlistSignup.findUniqueOrThrow({
      where: { email: "early@example.com" },
    });

    await joinWaitlist("early@example.com");
    const again = await db.waitlistSignup.findUniqueOrThrow({
      where: { email: "early@example.com" },
    });

    expect(again.createdAt.getTime()).toBe(first.createdAt.getTime());
  });

  it("refuses something that is not an address", async () => {
    for (const bad of ["", "nope", "a@", "@b.com", "a b@example.com"]) {
      expect(() => waitlistEmailSchema.parse(bad)).toThrow();
    }
    expect(await db.waitlistSignup.count()).toBe(0);
  });
});

describe("the public count", () => {
  it("stays hidden until the list is big enough to be anonymous", async () => {
    for (let i = 0; i < MIN_PUBLIC_COUNT - 1; i++) {
      await joinWaitlist(`person${i}@example.com`);
    }
    expect(await publicWaitlistCount()).toBeNull();

    await joinWaitlist("one-more@example.com");
    expect(await publicWaitlistCount()).toBe(MIN_PUBLIC_COUNT);
  });
});

describe("announcing", () => {
  it("writes to everybody once, and to nobody twice", async () => {
    const sent = recorder();
    await joinWaitlist("a@example.com");
    await joinWaitlist("b@example.com");

    const first = await announceLaunch({ send: true, sleep: async () => {} });
    expect(first).toMatchObject({ sent: 2, failed: 0 });

    // The second run is the one that matters: every row is marked, so there is
    // nothing left to do and nobody is written to again.
    const second = await announceLaunch({ send: true, sleep: async () => {} });
    expect(second).toMatchObject({ sent: 0, pending: 0 });
    expect(sent).toHaveLength(2);
  });

  it("resumes on exactly what an interrupted run did not finish", async () => {
    const sent = recorder();
    for (const email of ["a@example.com", "b@example.com", "c@example.com"]) {
      await joinWaitlist(email);
    }

    await announceLaunch({ send: true, limit: 1, sleep: async () => {} });
    expect(sent).toHaveLength(1);

    await announceLaunch({ send: true, sleep: async () => {} });
    expect(sent).toHaveLength(3);
    expect(new Set(sent.map((m) => m.to)).size).toBe(3);
  });

  it("carries a working unsubscribe link for that recipient alone", async () => {
    const sent = recorder();
    await joinWaitlist("solo@example.com");
    await announceLaunch({ send: true, sleep: async () => {} });

    const token = new URL(sent[0]!.unsubscribeUrl!).searchParams.get("token")!;
    expect(verifyUnsubscribe(token)).toEqual({
      kind: "waitlist",
      email: "solo@example.com",
    });
  });

  it("rehearsing changes nothing at all", async () => {
    const sent = recorder();
    await joinWaitlist("untouched@example.com");

    await announceLaunch({ sleep: async () => {} });

    expect(sent).toHaveLength(0);
    const row = await db.waitlistSignup.findUniqueOrThrow({
      where: { email: "untouched@example.com" },
    });
    expect(row.notifiedAt).toBeNull();
  });
});

describe("unsubscribing", () => {
  it("removes the address, and the announcement then skips it", async () => {
    const sent = recorder();
    await joinWaitlist("leaving@example.com");
    await joinWaitlist("staying@example.com");

    const target = { kind: "waitlist", email: "leaving@example.com" } as const;
    expect(await applyUnsubscribe(target)).toBe("done");

    expect(await db.waitlistSignup.count()).toBe(1);
    await announceLaunch({ send: true, sleep: async () => {} });
    expect(sent.map((m) => m.to)).toEqual(["staying@example.com"]);
  });

  it("treats a second unsubscribe as already done", async () => {
    await joinWaitlist("gone@example.com");
    const target = { kind: "waitlist", email: "gone@example.com" } as const;

    expect(await applyUnsubscribe(target)).toBe("done");
    // The link is in an email they still have. Pressing it again must not
    // produce an error page.
    expect(await applyUnsubscribe(target)).toBe("already");
  });

  it("matches an address whatever case the old link was signed with", async () => {
    await joinWaitlist("MixedCase@Example.com");
    const token = signUnsubscribe({
      kind: "waitlist",
      email: "MixedCase@Example.com",
    });

    expect(await applyUnsubscribe(verifyUnsubscribe(token)!)).toBe("done");
    expect(await db.waitlistSignup.count()).toBe(0);
  });
});

describe("suppressed addresses", () => {
  it("are never written to, even by the announcement", async () => {
    const sent = recorder();
    await joinWaitlist("bounced@example.com");
    await joinWaitlist("fine@example.com");
    await db.emailSuppression.create({
      data: { email: "bounced@example.com", reason: "BOUNCE" },
    });

    const result = await announceLaunch({ send: true, sleep: async () => {} });

    expect(sent.map((m) => m.to)).toEqual(["fine@example.com"]);
    // Still counted as handled and marked: the row is done with, and leaving
    // it pending would make every future run retry an address that cannot
    // receive mail.
    expect(result.sent).toBe(2);
    expect(
      await db.waitlistSignup.count({ where: { notifiedAt: null } }),
    ).toBe(0);
  });
});
