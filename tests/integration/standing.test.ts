import { describe, expect, it } from "vitest";
import { db } from "./db";
import {
  chooseTitle,
  recomputeBunchStanding,
  recomputeStanding,
  standingFor,
} from "@/server/modules/standing/service";

/**
 * Standing, against the rows it is derived from.
 *
 * The unit tests argue with the economy. These check the two things only a
 * database can show: that recomputing is idempotent, and that points come back
 * out when the evidence underneath them goes away.
 */

let counter = 0;
const DAY = 86_400_000;

async function member(tag: string) {
  const unique = `${tag}${counter++}`;
  const user = await db.user.create({
    data: {
      email: `${unique}@integration.test`,
      profile: {
        create: {
          username: unique,
          displayName: tag,
          onboardingStage: "COMPLETE",
          privacy: { create: {} },
        },
      },
    },
    select: { profile: { select: { id: true } } },
  });
  return user.profile!.id;
}

/** An evening that happened, with everybody named tapped in at it. */
async function evening(
  organizerId: string,
  attendees: string[],
  options: { daysAgo?: number; bunchId?: string } = {},
) {
  const at = new Date(Date.now() - (options.daysAgo ?? 7) * DAY);
  return db.activity.create({
    data: {
      title: "Board games",
      description: "An evening of board games in a quiet bar around the corner.",
      startsAt: at,
      mode: "OFFLINE",
      cityLabel: "Antwerp",
      maxParticipants: 8,
      organizerId,
      ...(options.bunchId ? { bunchId: options.bunchId } : {}),
      checkInOpenedAt: at,
      participants: {
        create: [
          { profileId: organizerId, status: "JOINED", checkedInAt: at },
          ...attendees.map((profileId) => ({
            profileId,
            status: "JOINED" as const,
            checkedInAt: at,
          })),
        ],
      },
    },
    select: { id: true },
  });
}

describe("what earns points", () => {
  it("pays for turning up, and says so with a title", async () => {
    const host = await member("host");
    const guest = await member("guest");
    for (const daysAgo of [7, 14, 21]) {
      await evening(host, [guest], { daysAgo });
    }

    const standing = await recomputeStanding(guest);

    expect(standing.points.TURNING_UP).toBe(30);
    expect(standing.titles).toContain("turns-up");
    expect(standing.total).toBe(standing.points.TURNING_UP);
  });

  it("pays a host only once other people came", async () => {
    const host = await member("host");
    const one = await member("one");
    const two = await member("two");

    await evening(host, [one], { daysAgo: 7 });
    expect((await recomputeStanding(host)).points.HOSTING).toBe(0);

    await evening(host, [one, two], { daysAgo: 14 });
    expect((await recomputeStanding(host)).points.HOSTING).toBe(25);
  });

  it("pays for an introduction both sides accepted", async () => {
    const introducer = await member("introducer");
    const one = await member("one");
    const two = await member("two");
    await db.memberIntroduction.create({
      data: {
        introducerId: introducer,
        oneId: one,
        otherId: two,
        status: "ACCEPTED",
        oneAccepted: true,
        otherAccepted: true,
        respondedAt: new Date(Date.now() - DAY),
      },
    });

    const standing = await recomputeStanding(introducer);
    expect(standing.points.INTRODUCING).toBe(40);
    expect(standing.titles).toContain("introducer");
  });

  it("pays nothing for an introduction still waiting on an answer", async () => {
    const introducer = await member("introducer");
    const one = await member("one");
    const two = await member("two");
    await db.memberIntroduction.create({
      data: { introducerId: introducer, oneId: one, otherId: two },
    });

    expect((await recomputeStanding(introducer)).points.INTRODUCING).toBe(0);
  });
});

describe("recomputing", () => {
  it("is idempotent, so an overlapping job cannot inflate anybody", async () => {
    const host = await member("host");
    const guest = await member("guest");
    await evening(host, [guest]);

    const first = await recomputeStanding(guest);
    const second = await recomputeStanding(guest);
    const third = await recomputeStanding(guest);

    expect(second.total).toBe(first.total);
    expect(third.total).toBe(first.total);
    expect(
      await db.memberTrackPoints.count({ where: { profileId: guest } }),
    ).toBe(5);
  });

  it("takes points back when the evening is cancelled", async () => {
    const host = await member("host");
    const guest = await member("guest");
    const activity = await evening(host, [guest]);

    expect((await recomputeStanding(guest)).points.TURNING_UP).toBe(10);

    await db.activity.update({
      where: { id: activity.id },
      data: { status: "CANCELLED" },
    });

    // No compensating write, no ledger to unwind: the rows changed, so the
    // arithmetic changed.
    expect((await recomputeStanding(guest)).points.TURNING_UP).toBe(0);
  });

  it("keeps the date a title was first earned, and lapses one that stops being true", async () => {
    const host = await member("host");
    const series = await db.activitySeries.create({
      data: {
        title: "Thursday night",
        description: "Every Thursday, same bar, same people.",
        cadence: "WEEKLY",
        nextAt: new Date(Date.now() + 3 * DAY),
        organizerId: host,
      },
      select: { id: true },
    });

    await recomputeStanding(host);
    const earned = await db.earnedTitle.findUniqueOrThrow({
      where: { profileId_key: { profileId: host, key: "runs-a-weekly-night" } },
      select: { earnedAt: true, lapsedAt: true },
    });
    expect(earned.lapsedAt).toBeNull();

    await db.activitySeries.update({
      where: { id: series.id },
      data: { endedAt: new Date() },
    });
    await recomputeStanding(host);

    const after = await db.earnedTitle.findUniqueOrThrow({
      where: { profileId_key: { profileId: host, key: "runs-a-weekly-night" } },
      select: { earnedAt: true, lapsedAt: true },
    });
    // Still true that they once did, and no longer shown as current.
    expect(after.lapsedAt).not.toBeNull();
    expect(after.earnedAt.getTime()).toBe(earned.earnedAt.getTime());
    expect((await standingFor(host)).titles).not.toContain("runs-a-weekly-night");
  });
});

describe("being told about a title", () => {
  it("says nothing on the first computation, however much history there is", async () => {
    const host = await member("host");
    const guest = await member("guest");
    for (const daysAgo of [7, 14, 21]) await evening(host, [guest], { daysAgo });

    // The first recompute produces "turns up" out of evenings that already
    // happened. Announcing those would hand somebody a pile of notifications
    // about things they did months ago.
    await recomputeStanding(guest);
    expect(
      await db.notification.count({ where: { profileId: guest, type: "TITLE_EARNED" } }),
    ).toBe(0);
  });

  it("says so once when a new one is earned, and never again", async () => {
    const host = await member("host");
    const guest = await member("guest");
    await evening(host, [guest], { daysAgo: 7 });
    await recomputeStanding(guest);

    // Two more evenings, which crosses the threshold for "turns up".
    await evening(host, [guest], { daysAgo: 14 });
    await evening(host, [guest], { daysAgo: 21 });
    await recomputeStanding(guest);

    const told = await db.notification.findMany({
      where: { profileId: guest, type: "TITLE_EARNED" },
      select: { title: true },
    });
    expect(told).toHaveLength(1);
    expect(told[0]!.title).toContain("Turns up");

    // The job runs hourly and writes the same rows every time.
    await recomputeStanding(guest);
    await recomputeStanding(guest);
    expect(
      await db.notification.count({ where: { profileId: guest, type: "TITLE_EARNED" } }),
    ).toBe(1);
  });
});

describe("wearing a title", () => {
  it("refuses one that was never earned", async () => {
    const someone = await member("someone");
    await recomputeStanding(someone);

    await expect(chooseTitle(someone, "knows-everybody")).rejects.toThrow();
    await expect(chooseTitle(someone, "not-a-title")).rejects.toThrow();
  });

  it("accepts one that was, and can be taken off again", async () => {
    const host = await member("host");
    const guest = await member("guest");
    for (const daysAgo of [7, 14, 21]) await evening(host, [guest], { daysAgo });
    await recomputeStanding(guest);

    await chooseTitle(guest, "turns-up");
    expect((await standingFor(guest)).displayedTitleKey).toBe("turns-up");

    await chooseTitle(guest, null);
    expect((await standingFor(guest)).displayedTitleKey).toBeNull();
  });
});

describe("what a bunch has done", () => {
  it("counts an evening once two people tapped in, and never a solo one", async () => {
    const owner = await member("owner");
    const other = await member("other");
    const bunch = await db.bunch.create({
      data: {
        slug: `standing-${counter++}`,
        name: "The Tuesday Lot",
        description: "A group that meets on Tuesdays to play board games.",
        visibility: "PUBLIC",
        memberships: {
          create: [
            { profileId: owner, role: "OWNER", status: "ACTIVE" },
            { profileId: other, role: "MEMBER", status: "ACTIVE" },
          ],
        },
      },
      select: { id: true },
    });

    await evening(owner, [], { bunchId: bunch.id, daysAgo: 30 });
    expect((await recomputeBunchStanding(bunch.id)).eveningsHeld).toBe(0);

    await evening(owner, [other], { bunchId: bunch.id, daysAgo: 20 });
    await evening(owner, [other], { bunchId: bunch.id, daysAgo: 10 });
    await evening(owner, [other], { bunchId: bunch.id, daysAgo: 3 });

    const standing = await recomputeBunchStanding(bunch.id);
    expect(standing.eveningsHeld).toBe(3);
    expect(standing.titleKey).toBe("getting-going");
    expect(standing.weeksRunning).toBeGreaterThan(0);
    expect(standing.attendance).toEqual([
      { profileId: owner, evenings: 3 },
      { profileId: other, evenings: 3 },
    ]);
  });
});

describe("browsing by what a bunch has done", () => {
  it("lists only groups that have met, most first", async () => {
    const owner = await member("owner");
    const other = await member("other");

    async function bunchWith(name: string, evenings: number) {
      const bunch = await db.bunch.create({
        data: {
          slug: `browse-${counter++}`,
          name,
          description: "A group that meets to do a thing together, regularly.",
          visibility: "PUBLIC",
          memberships: {
            create: [
              { profileId: owner, role: "OWNER", status: "ACTIVE" },
              { profileId: other, role: "MEMBER", status: "ACTIVE" },
            ],
          },
        },
        select: { id: true },
      });
      for (let i = 0; i < evenings; i++) {
        await evening(owner, [other], { bunchId: bunch.id, daysAgo: 5 + i * 7 });
      }
      await recomputeBunchStanding(bunch.id);
      return bunch.id;
    }

    const busy = await bunchWith("The busy one", 4);
    const quiet = await bunchWith("The quiet one", 1);
    const never = await bunchWith("Never met", 0);

    const { browseBunches } = await import("@/server/modules/bunches/service");
    const listed = await browseBunches(owner, undefined, 24, "record");
    const ids = listed.map((bunch) => bunch.id);

    expect(ids).toEqual([busy, quiet]);
    // A bunch with nothing behind it is not ranked last, it is not in this
    // view at all.
    expect(ids).not.toContain(never);
    expect(listed[0]!.titleKey).toBe("getting-going");
  });
});
