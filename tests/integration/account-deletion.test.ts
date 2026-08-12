import { describe, expect, it } from "vitest";
import { db } from "./db";
import { hashPassword } from "@/server/auth/password";
import { deleteAccount } from "@/server/modules/account/delete";
import { exportAccount } from "@/server/modules/account/export";

/**
 * Deleting an account must erase the person without taking things from anyone
 * else. Every assertion here is a property of the schema's cascade rules, so a
 * mocked database could not tell us whether any of it is true.
 */

const PASSWORD = "integration-password-1234";

async function member(tag: string) {
  const user = await db.user.create({
    data: {
      email: `${tag}@integration.test`,
      passwordHash: await hashPassword(PASSWORD),
      birthYear: 1995,
      profile: {
        create: {
          username: tag,
          displayName: tag,
          onboardingStage: "COMPLETE",
          privacy: { create: {} },
        },
      },
    },
    select: { id: true, profile: { select: { id: true } } },
  });
  return { userId: user.id, profileId: user.profile!.id };
}

describe("deleting an account", () => {
  it("requires the right password, and survives a wrong one", async () => {
    const leaver = await member("leaver");

    await expect(deleteAccount(leaver.userId, "not-the-password")).rejects.toThrow();
    expect(await db.user.count({ where: { id: leaver.userId } })).toBe(1);

    await deleteAccount(leaver.userId, PASSWORD);
    expect(await db.user.count({ where: { id: leaver.userId } })).toBe(0);
    expect(await db.profile.count({ where: { id: leaver.profileId } })).toBe(0);
  });

  it("leaves the bunch conversation intact with the author detached", async () => {
    const leaver = await member("author");
    const other = await member("reader");

    const bunch = await db.bunch.create({
      data: {
        slug: "shared", name: "Shared", description: "d",
        memberships: {
          create: [
            { profileId: leaver.profileId, role: "OWNER", status: "ACTIVE" },
            { profileId: other.profileId, role: "MEMBER", status: "ACTIVE" },
          ],
        },
      },
      select: { id: true },
    });
    const message = await db.bunchMessage.create({
      data: { bunchId: bunch.id, authorId: leaver.profileId, body: "still here" },
      select: { id: true },
    });

    await deleteAccount(leaver.userId, PASSWORD);

    const surviving = await db.bunchMessage.findUnique({ where: { id: message.id } });
    expect(surviving).not.toBeNull();
    expect(surviving!.body).toBe("still here");
    expect(surviving!.authorId).toBeNull();
  });

  it("hands a solely-owned bunch to the longest-standing member", async () => {
    const leaver = await member("owner");
    const heir = await member("heir");

    const bunch = await db.bunch.create({
      data: {
        slug: "handover", name: "Handover", description: "d",
        memberships: {
          create: [
            { profileId: leaver.profileId, role: "OWNER", status: "ACTIVE" },
            { profileId: heir.profileId, role: "MEMBER", status: "ACTIVE" },
          ],
        },
      },
      select: { id: true },
    });

    const result = await deleteAccount(leaver.userId, PASSWORD);

    expect(result.bunchesHandedOver).toBe(1);
    const owner = await db.bunchMembership.findFirst({
      where: { bunchId: bunch.id, role: "OWNER" },
      select: { profileId: true },
    });
    expect(owner!.profileId).toBe(heir.profileId);
  });

  it("removes a bunch nobody else was in", async () => {
    const leaver = await member("solo");
    const bunch = await db.bunch.create({
      data: {
        slug: "empty", name: "Empty", description: "d",
        memberships: { create: [{ profileId: leaver.profileId, role: "OWNER", status: "ACTIVE" }] },
      },
      select: { id: true },
    });

    const result = await deleteAccount(leaver.userId, PASSWORD);

    expect(result.bunchesRemoved).toBe(1);
    expect(await db.bunch.count({ where: { id: bunch.id } })).toBe(0);
  });

  it("tells participants before their plans disappear", async () => {
    const organizer = await member("organizer");
    const attendee = await member("attendee");

    await db.activity.create({
      data: {
        title: "Board games", description: "d",
        startsAt: new Date(Date.now() + 7 * 86_400_000),
        mode: "OFFLINE", organizerId: organizer.profileId, maxParticipants: 8,
        participants: { create: [{ profileId: attendee.profileId, status: "JOINED" }] },
      },
    });

    const result = await deleteAccount(organizer.userId, PASSWORD);

    expect(result.activitiesCancelled).toBe(1);
    expect(result.participantsNotified).toBe(1);
    const notice = await db.notification.findFirst({
      where: { profileId: attendee.profileId, type: "ACTIVITY_CHANGED" },
      select: { title: true },
    });
    expect(notice!.title).toContain("Board games");
  });

  it("keeps a report the leaver filed, without their name on it", async () => {
    const reporter = await member("reporter");
    const subject = await member("subject");

    const report = await db.report.create({
      data: {
        reporterId: reporter.profileId, targetType: "PROFILE",
        targetId: subject.profileId, reportedProfileId: subject.profileId,
        reason: "HARASSMENT", details: "kept for review",
      },
      select: { id: true },
    });

    await deleteAccount(reporter.userId, PASSWORD);

    // Otherwise reporting and deleting would quietly clear the queue.
    const surviving = await db.report.findUnique({ where: { id: report.id } });
    expect(surviving).not.toBeNull();
    expect(surviving!.reporterId).toBeNull();
    expect(surviving!.reportedProfileId).toBe(subject.profileId);
    expect(surviving!.details).toBe("kept for review");
  });
});

describe("exporting an account", () => {
  it("includes what the member wrote and none of the secrets", async () => {
    const me = await member("exporter");
    const bunch = await db.bunch.create({
      data: {
        slug: "mine", name: "Mine", description: "d",
        memberships: { create: [{ profileId: me.profileId, role: "OWNER", status: "ACTIVE" }] },
        messages: { create: [{ authorId: me.profileId, body: "a thing I said" }] },
      },
      select: { id: true },
    });
    expect(bunch.id).toBeTruthy();

    const data = await exportAccount(me.userId);
    const serialized = JSON.stringify(data);

    expect(data.account.email).toBe("exporter@integration.test");
    expect(data.bunchMessages.map((m) => m.body)).toContain("a thing I said");
    expect(serialized).not.toContain("passwordHash");
    expect(serialized).not.toContain("approxLat");
    expect(serialized).not.toContain(PASSWORD);
  });
});
