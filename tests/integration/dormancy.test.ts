import { describe, expect, it } from "vitest";
import { db } from "./db";
import {
  askToBeRehomed,
  closeQuietBunch,
  hasHandUp,
  noticeQuietBunches,
} from "@/server/modules/bunches/dormancy";
import { proposeBunchesForPool } from "@/server/modules/bunches/formation-pool";

/**
 * A bunch that has stopped, and the people still in it.
 *
 * The property that matters most is the last one: somebody sitting in a dead
 * group was invisible to the formation pool, which selects members in no
 * active bunch. Being stuck was the thing that kept them stuck.
 */

let counter = 0;
const DAY = 24 * 60 * 60 * 1000;

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
          privacy: { create: { discoverable: true } },
        },
      },
    },
    select: { profile: { select: { id: true } } },
  });
  return user.profile!.id;
}

async function bunchOf(members: string[], options: { ageDays: number; lastMessageDays?: number }) {
  const created = new Date(Date.now() - options.ageDays * DAY);
  return db.bunch.create({
    data: {
      slug: `quiet-${counter++}`,
      name: "The Tuesday Lot",
      description: "A group that used to meet on Tuesdays to play board games.",
      visibility: "PUBLIC",
      createdAt: created,
      memberships: {
        create: members.map((profileId, index) => ({
          profileId,
          role: index === 0 ? ("OWNER" as const) : ("MEMBER" as const),
          status: "ACTIVE" as const,
        })),
      },
      ...(options.lastMessageDays === undefined
        ? {}
        : {
            messages: {
              create: {
                body: "See you Tuesday",
                authorId: members[0]!,
                createdAt: new Date(Date.now() - options.lastMessageDays * DAY),
              },
            },
          }),
    },
    select: { id: true, slug: true },
  });
}

describe("noticing a bunch has stopped", () => {
  it("tells everybody in it, once", async () => {
    const members = await Promise.all([member("a"), member("b"), member("c")]);
    const bunch = await bunchOf(members, { ageDays: 200, lastMessageDays: 60 });

    expect(await noticeQuietBunches()).toBe(1);
    for (const profileId of members) {
      const notices = await db.notification.findMany({
        where: { profileId, type: "BUNCH_QUIET" },
      });
      expect(notices).toHaveLength(1);
    }

    // Never twice, however often the job runs.
    expect(await noticeQuietBunches()).toBe(0);
    void bunch;
  });

  it("leaves a bunch that is still talking alone", async () => {
    const members = await Promise.all([member("a"), member("b")]);
    await bunchOf(members, { ageDays: 200, lastMessageDays: 3 });

    expect(await noticeQuietBunches()).toBe(0);
  });

  it("does not count the product's own system messages as life", async () => {
    const members = await Promise.all([member("a"), member("b")]);
    const bunch = await bunchOf(members, { ageDays: 200, lastMessageDays: 60 });
    await db.bunchMessage.create({
      data: { bunchId: bunch.id, kind: "SYSTEM", body: "Someone joined the bunch." },
    });

    expect(await noticeQuietBunches()).toBe(1);
  });
});

describe("a way on", () => {
  it("puts somebody in the formation pool without making them leave", async () => {
    // Enough people for the pool to actually propose something, all of them
    // stuck in the same dead group.
    const members = await Promise.all(
      Array.from({ length: 6 }, (_, i) => member(`m${i}`)),
    );
    await bunchOf(members, { ageDays: 200, lastMessageDays: 60 });

    const before = await proposeBunchesForPool();
    expect(before.poolSize).toBe(0);

    for (const profileId of members) await askToBeRehomed(profileId);

    const after = await proposeBunchesForPool();
    expect(after.poolSize).toBe(6);
    // And they are still in the old bunch, which is the point.
    expect(
      await db.bunchMembership.count({ where: { profileId: members[0], status: "ACTIVE" } }),
    ).toBe(1);
    expect(await hasHandUp(members[0]!)).toBe(true);
  });

  it("lets any member close it once the notice has gone out, and nobody before", async () => {
    const members = await Promise.all([member("owner"), member("member")]);
    const bunch = await bunchOf(members, { ageDays: 200, lastMessageDays: 60 });

    // Before the notice, ordinary rules: this is not the way to archive a
    // working group.
    await expect(closeQuietBunch(bunch.id, members[1]!)).rejects.toThrow();

    await noticeQuietBunches();
    await closeQuietBunch(bunch.id, members[1]!);

    const closed = await db.bunch.findUniqueOrThrow({
      where: { id: bunch.id },
      select: { archivedAt: true },
    });
    expect(closed.archivedAt).not.toBeNull();

    // The other member is told by the person who did it, not by silence.
    const told = await db.notification.count({
      where: { profileId: members[0]!, title: "The Tuesday Lot was closed" },
    });
    expect(told).toBe(1);
  });

  it("is not a stranger's to close", async () => {
    const members = await Promise.all([member("a"), member("b")]);
    const bunch = await bunchOf(members, { ageDays: 200, lastMessageDays: 60 });
    await noticeQuietBunches();

    const stranger = await member("stranger");
    await expect(closeQuietBunch(bunch.id, stranger)).rejects.toThrow();
  });
});
