import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  announcement: { upsert: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
}));
const recordModerationEvent = vi.hoisted(() => vi.fn());

vi.mock("@/server/db/client", () => ({ db }));
vi.mock("@/server/modules/admin/audit", () => ({ recordModerationEvent }));

const { DELIVERY, publishAnnouncement } = await import(
  "@/server/modules/announcements/service"
);

const ACTOR = {
  userId: "u1",
  displayName: "Gianni",
  email: "gianni@example.com",
  role: "ADMIN",
} as never;

const BASE = {
  slug: "privacy-update",
  title: "A change to the privacy policy",
  summary: "What we hold is being described more precisely.",
  body: [{ kind: "paragraph" as const, text: "Here is what changed." }],
};

beforeEach(() => {
  db.announcement.upsert.mockReset();
  db.announcement.upsert.mockResolvedValue({ id: "a1", slug: BASE.slug });
  recordModerationEvent.mockReset();
});

/**
 * The two refusals are the feature.
 *
 * Privacy §14 and Terms §14 promise a member is told *before* a change takes
 * effect. That promise is only worth the sentence if the code can refuse to
 * break it, so these are not validation niceties — they are the mechanism.
 */
describe("publishing an announcement", () => {
  it("refuses an effective date that has already passed", async () => {
    await expect(
      publishAnnouncement(ACTOR, {
        ...BASE,
        tier: "NOTABLE",
        effectiveAt: new Date(Date.now() - 60_000),
      }),
    ).rejects.toThrow(/before a change takes effect/i);

    // Nothing written, nothing announced. A refused publish must not leave a
    // half-published row behind.
    expect(db.announcement.upsert).not.toHaveBeenCalled();
    expect(recordModerationEvent).not.toHaveBeenCalled();
  });

  it("accepts a date in the future", async () => {
    await publishAnnouncement(ACTOR, {
      ...BASE,
      tier: "NOTABLE",
      effectiveAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    expect(db.announcement.upsert).toHaveBeenCalledOnce();
  });

  it("accepts no date at all", async () => {
    await publishAnnouncement(ACTOR, { ...BASE, tier: "NOTED" });
    expect(db.announcement.upsert).toHaveBeenCalledOnce();
  });

  it("refuses to interrupt everybody without a reason on the record", async () => {
    await expect(
      publishAnnouncement(ACTOR, { ...BASE, tier: "CRITICAL" }),
    ).rejects.toThrow(/say why/i);
    expect(db.announcement.upsert).not.toHaveBeenCalled();
  });

  it("takes a critical announcement once a reason is given", async () => {
    await publishAnnouncement(ACTOR, {
      ...BASE,
      tier: "CRITICAL",
      reason: "Materially affects what we hold about members.",
    });
    expect(db.announcement.upsert).toHaveBeenCalledOnce();
  });

  it("writes the reach into the audit trail, not just the title", async () => {
    await publishAnnouncement(ACTOR, {
      ...BASE,
      tier: "CRITICAL",
      reason: "Policy change.",
    });

    const entry = recordModerationEvent.mock.calls[0]![0];
    expect(entry.action).toBe("ANNOUNCEMENT_PUBLISHED");
    expect(entry.reason).toBe("Policy change.");
    // Whether it interrupted everybody is the fact worth being able to audit.
    expect(entry.metadata).toMatchObject({ tier: "CRITICAL", interrupts: true });
  });
});

describe("the delivery table", () => {
  it("lets exactly one tier interrupt anybody", () => {
    // /about promises there are no notifications designed to pull you back.
    // That promise survives only while a single tier can push, and that tier is
    // reserved for rights, data and availability. If a second tier ever gets a
    // banner, the sentence on /about has to change in the same commit.
    const interrupting = Object.entries(DELIVERY)
      .filter(([, route]) => route.banner)
      .map(([tier]) => tier);

    expect(interrupting).toEqual(["CRITICAL"]);
  });

  it("lets exactly one tier send email", () => {
    const mailing = Object.entries(DELIVERY)
      .filter(([, route]) => route.mayEmail)
      .map(([tier]) => tier);

    expect(mailing).toEqual(["CRITICAL"]);
  });

  it("keeps everything findable", () => {
    // Nothing is published and then hidden. The archive is the half of the
    // promise that stays checkable afterwards.
    expect(Object.values(DELIVERY).every((route) => route.whatsNew)).toBe(true);
  });
});
