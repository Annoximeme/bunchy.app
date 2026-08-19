import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  announcement: { upsert: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
}));
const recordModerationEvent = vi.hoisted(() => vi.fn());

vi.mock("@/server/db/client", () => ({ db }));
vi.mock("@/server/modules/admin/audit", () => ({ recordModerationEvent }));

const { DELIVERY, publishAnnouncement, stateOf } = await import(
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

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/**
 * Three states carried in one column, and the rules that keep them honest.
 *
 * Scheduling is the feature that makes the promise keepable in practice: the
 * person who can write a notice properly is rarely at a keyboard at the moment
 * it should go out. It also opens two ways to break the promise quietly, and
 * both are closed here.
 */
describe("scheduling and drafts", () => {
  it("saves a draft without writing to the audit trail", async () => {
    await publishAnnouncement(ACTOR, { ...BASE, tier: "NOTABLE", publishAt: null });

    expect(db.announcement.upsert).toHaveBeenCalledOnce();
    expect(db.announcement.upsert.mock.calls[0]![0].create.publishedAt).toBeNull();
    // The trail records what reached members. A draft reaches nobody, and
    // logging every save would bury the entries that matter.
    expect(recordModerationEvent).not.toHaveBeenCalled();
  });

  it("lets a draft be critical without a reason, because it has not gone out", async () => {
    await expect(
      publishAnnouncement(ACTOR, { ...BASE, tier: "CRITICAL", publishAt: null }),
    ).resolves.toBeDefined();
  });

  it("still demands the reason when that same draft publishes", async () => {
    await expect(
      publishAnnouncement(ACTOR, { ...BASE, tier: "CRITICAL" }),
    ).rejects.toThrow(/say why/i);
  });

  it("accepts a publish date in the future and marks it scheduled", async () => {
    const when = new Date(Date.now() + 2 * DAY);
    await publishAnnouncement(ACTOR, { ...BASE, tier: "NOTABLE", publishAt: when });

    expect(db.announcement.upsert.mock.calls[0]![0].create.publishedAt).toEqual(when);
    expect(recordModerationEvent.mock.calls[0]![0].metadata).toMatchObject({
      scheduled: true,
    });
  });

  it("refuses to backdate the record of when members were told", async () => {
    await expect(
      publishAnnouncement(ACTOR, {
        ...BASE,
        tier: "NOTABLE",
        publishAt: new Date(Date.now() - 2 * DAY),
      }),
    ).rejects.toThrow(/backdating/i);
    expect(db.announcement.upsert).not.toHaveBeenCalled();
  });

  it("treats a publish date a few seconds old as publishing now", async () => {
    // The composer posts a wall-clock value. Somebody who sets 09:00 and
    // presses the button at 09:00:30 is publishing now, not backdating.
    await expect(
      publishAnnouncement(ACTOR, {
        ...BASE,
        tier: "NOTABLE",
        publishAt: new Date(Date.now() - 15_000),
      }),
    ).resolves.toBeDefined();
  });

  /**
   * The hole scheduling opens, and the reason `effectiveAt` is compared
   * against the publish moment rather than against now.
   */
  it("refuses a change that would take effect before the notice arrives", async () => {
    await expect(
      publishAnnouncement(ACTOR, {
        ...BASE,
        tier: "NOTABLE",
        // Scheduled for Friday, effective Thursday. Both dates are in the
        // future, so a check written against today would wave this through and
        // the notice would land after the change it was announcing.
        publishAt: new Date(Date.now() + 5 * DAY),
        effectiveAt: new Date(Date.now() + 4 * DAY),
      }),
    ).rejects.toThrow(/before a change takes effect/i);
    expect(db.announcement.upsert).not.toHaveBeenCalled();
  });

  it("allows the same two dates the right way round", async () => {
    await expect(
      publishAnnouncement(ACTOR, {
        ...BASE,
        tier: "NOTABLE",
        publishAt: new Date(Date.now() + 4 * DAY),
        effectiveAt: new Date(Date.now() + 5 * DAY),
      }),
    ).resolves.toBeDefined();
  });

  it("defaults to the public changelog and records the choice", async () => {
    await publishAnnouncement(ACTOR, { ...BASE, tier: "NOTABLE" });
    expect(db.announcement.upsert.mock.calls[0]![0].create.publicVisible).toBe(true);

    recordModerationEvent.mockClear();
    db.announcement.upsert.mockClear();

    await publishAnnouncement(ACTOR, {
      ...BASE,
      tier: "NOTABLE",
      publicVisible: false,
    });
    expect(db.announcement.upsert.mock.calls[0]![0].create.publicVisible).toBe(false);
    expect(recordModerationEvent.mock.calls[0]![0].metadata).toMatchObject({
      publicVisible: false,
    });
  });
});

describe("reading the state off the column", () => {
  const now = new Date("2026-08-19T12:00:00Z");

  it("calls a null publish date a draft", () => {
    expect(stateOf(null, now)).toBe("draft");
  });

  it("calls a future publish date scheduled", () => {
    expect(stateOf(new Date(now.getTime() + HOUR), now)).toBe("scheduled");
  });

  it("calls a past publish date published", () => {
    expect(stateOf(new Date(now.getTime() - HOUR), now)).toBe("published");
  });
});
