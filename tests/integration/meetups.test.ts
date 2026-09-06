import { describe, expect, it } from "vitest";
import { db } from "./db";
import {
  meetupsForActivity,
  proposeMeetup,
  respondToMeetup,
  withdrawMeetup,
} from "@/server/modules/bunches/meetups";
import { joinActivity } from "@/server/modules/activities/service";

/**
 * Two bunches at one evening.
 *
 * Consent twice is the property worth defending: a moderator of the host bunch
 * opens the evening, a moderator of the guest bunch accepts, and every member
 * still decides for themselves whether to take a seat. Nothing merges, and a
 * private bunch cannot be asked at all.
 */

let counter = 0;

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

async function bunch(
  name: string,
  visibility: "PUBLIC" | "PRIVATE" = "PUBLIC",
): Promise<{ id: string; owner: string; member: string }> {
  const owner = await member(`${name}-owner`);
  const plain = await member(`${name}-member`);
  const created = await db.bunch.create({
    data: {
      slug: `${name}-${counter++}`,
      name,
      description: "A group of people who meet up to do a thing together.",
      visibility,
      countryCode: "BE",
      memberships: {
        create: [
          { profileId: owner, role: "OWNER", status: "ACTIVE" },
          { profileId: plain, role: "MEMBER", status: "ACTIVE" },
        ],
      },
    },
    select: { id: true },
  });
  return { id: created.id, owner, member: plain };
}

async function evening(hostBunchId: string, organizerId: string) {
  const activity = await db.activity.create({
    data: {
      title: "Board games",
      description: "An evening of board games in a quiet bar around the corner.",
      startsAt: new Date(Date.now() + 5 * 86_400_000),
      mode: "OFFLINE",
      maxParticipants: 8,
      organizerId,
      bunchId: hostBunchId,
      participants: { create: { profileId: organizerId, status: "JOINED" } },
    },
    select: { id: true },
  });
  return activity.id;
}

describe("asking another bunch along", () => {
  it("is a moderator's to do, not a member's", async () => {
    const host = await bunch("host");
    const guest = await bunch("guest");
    const activityId = await evening(host.id, host.owner);

    await expect(
      proposeMeetup(activityId, guest.id, host.member),
    ).rejects.toThrow();
    await expect(
      proposeMeetup(activityId, guest.id, host.owner),
    ).resolves.toBeTruthy();
  });

  it("asks the other bunch's moderators, and nobody else yet", async () => {
    const host = await bunch("host");
    const guest = await bunch("guest");
    const activityId = await evening(host.id, host.owner);

    await proposeMeetup(activityId, guest.id, host.owner, "Room for six.");

    expect(await db.notification.count({ where: { profileId: guest.owner } })).toBe(1);
    // Their members hear nothing until their own bunch has said yes.
    expect(await db.notification.count({ where: { profileId: guest.member } })).toBe(0);
  });

  it("cannot reach a private bunch", async () => {
    const host = await bunch("host");
    const secret = await bunch("secret", "PRIVATE");
    const activityId = await evening(host.id, host.owner);

    await expect(
      proposeMeetup(activityId, secret.id, host.owner),
    ).rejects.toThrow();
  });

  it("cannot be asked twice", async () => {
    const host = await bunch("host");
    const guest = await bunch("guest");
    const activityId = await evening(host.id, host.owner);

    await proposeMeetup(activityId, guest.id, host.owner);
    await expect(proposeMeetup(activityId, guest.id, host.owner)).rejects.toThrow();
  });
});

describe("answering", () => {
  it("is the guest bunch's, and lets their members take a seat", async () => {
    const host = await bunch("host", "PRIVATE");
    const guest = await bunch("guest");
    const activityId = await evening(host.id, host.owner);
    const meetup = await proposeMeetup(activityId, guest.id, host.owner);

    // A private bunch's evening is members-only until the invitation is
    // accepted, which is exactly what an accepted meetup means.
    await expect(joinActivity(activityId, guest.member)).rejects.toThrow();

    await expect(respondToMeetup(meetup.id, guest.member, true)).rejects.toThrow();
    await respondToMeetup(meetup.id, guest.owner, true);

    await expect(joinActivity(activityId, guest.member)).resolves.toEqual({
      status: "JOINED",
    });

    // Both rooms are told, in their own words.
    const messages = await db.bunchMessage.findMany({
      where: { kind: "SYSTEM", bunchId: { in: [host.id, guest.id] } },
      select: { body: true },
    });
    expect(messages).toHaveLength(2);

    // And now their members are told, because now there is a seat to take.
    expect(
      await db.notification.count({
        where: { profileId: guest.member, linkPath: `/activities/${activityId}` },
      }),
    ).toBeGreaterThan(0);
  });

  it("declining tells the host's room and nobody's inbox", async () => {
    const host = await bunch("host");
    const guest = await bunch("guest");
    const activityId = await evening(host.id, host.owner);
    const meetup = await proposeMeetup(activityId, guest.id, host.owner);

    const before = await db.notification.count({ where: { profileId: host.owner } });
    await respondToMeetup(meetup.id, guest.owner, false);

    expect(await db.notification.count({ where: { profileId: host.owner } })).toBe(
      before,
    );
    const said = await db.bunchMessage.findMany({
      where: { bunchId: host.id, kind: "SYSTEM" },
      select: { body: true },
    });
    expect(said).toHaveLength(1);
    expect(said[0]!.body).toContain("can't make");
  });

  it("cannot be answered after it has been called off", async () => {
    const host = await bunch("host");
    const guest = await bunch("guest");
    const activityId = await evening(host.id, host.owner);
    const meetup = await proposeMeetup(activityId, guest.id, host.owner);

    await withdrawMeetup(meetup.id, host.owner);
    await expect(respondToMeetup(meetup.id, guest.owner, true)).rejects.toThrow();
  });
});

describe("what the activity page shows", () => {
  it("offers the answer only to the bunch being asked", async () => {
    const host = await bunch("host");
    const guest = await bunch("guest");
    const activityId = await evening(host.id, host.owner);
    await proposeMeetup(activityId, guest.id, host.owner);

    const asGuest = await meetupsForActivity(activityId, guest.owner);
    expect(asGuest[0]!.viewerCanRespond).toBe(true);
    expect(asGuest[0]!.viewerCanWithdraw).toBe(false);

    const asHost = await meetupsForActivity(activityId, host.owner);
    expect(asHost[0]!.viewerCanRespond).toBe(false);
    expect(asHost[0]!.viewerCanWithdraw).toBe(true);

    const asMember = await meetupsForActivity(activityId, guest.member);
    expect(asMember[0]!.viewerCanRespond).toBe(false);
  });
});
