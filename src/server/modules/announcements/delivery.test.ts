import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  announcement: { findMany: vi.fn() },
  profile: { findMany: vi.fn() },
  announcementEmail: { create: vi.fn() },
}));
const sendEmail = vi.hoisted(() => vi.fn());

vi.mock("@/server/db/client", () => ({ db }));
vi.mock("@/server/email", () => ({ sendEmail }));
vi.mock("@/server/env", () => ({
  env: () => ({ APP_URL: "https://bunchy.app" }),
}));

const { deliverAnnouncementEmails } = await import(
  "@/server/modules/announcements/delivery"
);

const DAY = 24 * 60 * 60 * 1000;

const ANNOUNCEMENT = {
  id: "a1",
  slug: "privacy-update",
  title: "A change to the privacy policy",
  summary: "What we hold is being described more precisely.",
  body: [{ kind: "paragraph", text: "Here is what changed." }],
  effectiveAt: null as Date | null,
};

function profiles(...ids: string[]) {
  return ids.map((id) => ({ id, user: { email: `${id}@example.com` } }));
}

beforeEach(() => {
  db.announcement.findMany.mockReset().mockResolvedValue([ANNOUNCEMENT]);
  db.profile.findMany.mockReset().mockResolvedValue([]);
  db.announcementEmail.create.mockReset().mockResolvedValue({});
  sendEmail.mockReset().mockResolvedValue(undefined);
});

/**
 * The delivery table is the whole design, so these test the property it exists
 * to provide: a notice somebody is owed goes out exactly once, and a crash in
 * the middle costs a retry rather than a silence.
 */
describe("delivering a critical notice", () => {
  it("mails each recipient and records that it did", async () => {
    db.profile.findMany.mockResolvedValueOnce(profiles("p1", "p2"));

    const result = await deliverAnnouncementEmails();

    expect(result.notices).toBe(2);
    expect(sendEmail).toHaveBeenCalledTimes(2);
    expect(sendEmail.mock.calls[0]![0].to).toBe("p1@example.com");
    expect(db.announcementEmail.create).toHaveBeenCalledTimes(2);
    expect(db.announcementEmail.create.mock.calls[0]![0].data).toEqual({
      announcementId: "a1",
      profileId: "p1",
      kind: "NOTICE",
    });
  });

  it("only considers tiers the delivery table permits", async () => {
    await deliverAnnouncementEmails();
    // Read off DELIVERY rather than hard-coded, so the one place that decides
    // who may be mailed stays the one place.
    expect(db.announcement.findMany.mock.calls[0]![0].where.tier).toEqual({
      in: ["CRITICAL"],
    });
  });

  it("ignores an announcement that is only scheduled", async () => {
    const where = db.announcement.findMany.mock.calls;
    await deliverAnnouncementEmails();
    expect(where[0]![0].where.publishedAt).toMatchObject({ not: null });
    // `lte: now` is what keeps a scheduled notice out of the inbox before its
    // moment. Without it, scheduling would leak the change early by email.
    expect(where[0]![0].where.publishedAt.lte).toBeInstanceOf(Date);
  });

  it("writes no row when the send throws, so the next pass retries", async () => {
    db.profile.findMany.mockResolvedValueOnce(profiles("p1", "p2"));
    sendEmail.mockRejectedValueOnce(new Error("smtp is down"));

    const result = await deliverAnnouncementEmails();

    // One failed, one succeeded. Only the successful one is recorded.
    expect(result.notices).toBe(1);
    expect(db.announcementEmail.create).toHaveBeenCalledTimes(1);
    expect(db.announcementEmail.create.mock.calls[0]![0].data.profileId).toBe("p2");
  });

  it("does not let one bad address stop the rest of the notice", async () => {
    db.profile.findMany.mockResolvedValueOnce(profiles("p1", "p2", "p3"));
    sendEmail.mockRejectedValueOnce(new Error("bad address"));

    await deliverAnnouncementEmails();

    expect(sendEmail).toHaveBeenCalledTimes(3);
  });

  it("asks only for people with a verified address and no row yet", async () => {
    await deliverAnnouncementEmails();

    const where = db.profile.findMany.mock.calls[0]![0].where;
    // An unverified address has never been shown to belong to the person who
    // typed it, and this is the message that must not reach a stranger.
    expect(where.user).toEqual({ emailVerifiedAt: { not: null } });
    // `AND`, not sibling keys: two conditions on the same relation as siblings
    // means the second silently replaces the first.
    expect(where.AND[0]).toEqual({
      announcementEmails: { none: { announcementId: "a1", kind: "NOTICE" } },
    });
  });
});

describe("the reminder before a change lands", () => {
  it("stays quiet when the effective date is far off", async () => {
    db.announcement.findMany.mockResolvedValue([
      { ...ANNOUNCEMENT, effectiveAt: new Date(Date.now() + 30 * DAY) },
    ]);

    await deliverAnnouncementEmails();

    // One query only: the notice. Nothing asked about reminders.
    expect(db.profile.findMany).toHaveBeenCalledTimes(1);
  });

  it("goes out inside the window, and only to people who have not read it", async () => {
    db.announcement.findMany.mockResolvedValue([
      { ...ANNOUNCEMENT, effectiveAt: new Date(Date.now() + 2 * DAY) },
    ]);
    db.profile.findMany
      .mockResolvedValueOnce([]) // nobody left to give notice to
      .mockResolvedValueOnce(profiles("p9"));

    const result = await deliverAnnouncementEmails();

    expect(result.reminders).toBe(1);

    const where = db.profile.findMany.mock.calls[1]![0].where;
    // Somebody who read it has been told; reminding them would be the "designed
    // to pull you back" message /about promises does not exist here.
    expect(where.AND[1].announcementReads).toEqual({
      none: { announcementId: "a1" },
    });
    // And somebody who never got the notice must not have their first contact
    // about it be a nudge.
    expect(where.AND[1].announcementEmails).toEqual({
      some: { announcementId: "a1", kind: "NOTICE" },
    });
    expect(db.announcementEmail.create.mock.calls[0]![0].data.kind).toBe("REMINDER");
  });

  it("stops once the change has already taken effect", async () => {
    db.announcement.findMany.mockResolvedValue([
      { ...ANNOUNCEMENT, effectiveAt: new Date(Date.now() - 1 * DAY) },
    ]);

    await deliverAnnouncementEmails();

    expect(db.profile.findMany).toHaveBeenCalledTimes(1);
  });

  it("says in the subject that the change is coming, not that it is new", async () => {
    db.announcement.findMany.mockResolvedValue([
      { ...ANNOUNCEMENT, effectiveAt: new Date(Date.now() + 1 * DAY) },
    ]);
    db.profile.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(profiles("p9"));

    await deliverAnnouncementEmails();

    expect(sendEmail.mock.calls[0]![0].subject).toMatch(/coming into effect/i);
  });
});

describe("what the message carries", () => {
  it("has no unsubscribe link", async () => {
    db.profile.findMany.mockResolvedValueOnce(profiles("p1"));

    await deliverAnnouncementEmails();

    // Deliberate, and the same reasoning as verification and reset mail: this
    // is not a subscription. An opt-out of being told the terms are changing
    // would be the product withdrawing the commitment it made to get you to
    // sign up. It stays defensible only while one tier can mail, which is
    // asserted in service.test.ts.
    expect(sendEmail.mock.calls[0]![0].unsubscribeUrl).toBeUndefined();
  });

  it("carries the body in full rather than only a link", async () => {
    db.profile.findMany.mockResolvedValueOnce(profiles("p1"));

    await deliverAnnouncementEmails();

    const message = sendEmail.mock.calls[0]![0];
    // A notice that requires signing in to read is a notice that has not been
    // given, and the people most affected are the least likely to be signed in.
    expect(message.text).toContain("Here is what changed.");
    expect(message.text).toContain(
      "What we hold is being described more precisely.",
    );
    expect(message.text).toContain("https://bunchy.app/whats-new/privacy-update");
  });

  it("sends both a text and an html part", async () => {
    db.profile.findMany.mockResolvedValueOnce(profiles("p1"));

    await deliverAnnouncementEmails();

    const message = sendEmail.mock.calls[0]![0];
    expect(message.text.length).toBeGreaterThan(0);
    expect(message.html).toContain("<!doctype html>");
  });
});
