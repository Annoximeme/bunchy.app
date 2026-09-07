import { describe, expect, it } from "vitest";
import { db } from "./db";
import { waitingOnYou } from "@/server/modules/waiting/service";

/**
 * What other people are waiting on.
 *
 * The rule this suite defends is the one that decides whether an item belongs
 * here at all: it has to disappear when it is answered. Anything that would
 * still be listed after the member dealt with it is a nag rather than a
 * pending item.
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

describe("what counts as waiting", () => {
  it("lists a connection request, and stops the moment it is answered", async () => {
    const viewer = await member("viewer");
    const asker = await member("asker");
    const connection = await db.connection.create({
      data: { requesterId: asker, addresseeId: viewer, status: "PENDING" },
      select: { id: true },
    });

    let items = await waitingOnYou(viewer);
    expect(items).toHaveLength(1);
    expect(items[0]!.kind).toBe("CONNECTION_REQUEST");
    expect(items[0]!.subject).toBe("asker");

    await db.connection.update({
      where: { id: connection.id },
      data: { status: "ACCEPTED", respondedAt: new Date() },
    });
    items = await waitingOnYou(viewer);
    expect(items).toHaveLength(0);
  });

  it("lists a plan nobody has voted on, and drops it once they answer once", async () => {
    const viewer = await member("viewer");
    const other = await member("other");
    const bunch = await db.bunch.create({
      data: {
        slug: `waiting-${counter++}`,
        name: "The Tuesday Lot",
        description: "A group that meets on Tuesdays to play board games.",
        visibility: "PUBLIC",
        memberships: {
          create: [
            { profileId: other, role: "OWNER", status: "ACTIVE" },
            { profileId: viewer, role: "MEMBER", status: "ACTIVE" },
          ],
        },
      },
      select: { id: true },
    });
    const plan = await db.socialPlan.create({
      data: {
        bunchId: bunch.id,
        createdById: other,
        title: "Board games",
        options: {
          create: [
            { startsAt: new Date(Date.now() + 3 * 86_400_000) },
            { startsAt: new Date(Date.now() + 4 * 86_400_000) },
          ],
        },
      },
      select: { id: true, options: { select: { id: true } } },
    });

    expect((await waitingOnYou(viewer)).map((i) => i.kind)).toContain("PLAN_VOTE");

    // One answer is an answer. The plan is now waiting on everybody else.
    await db.socialPlanVote.create({
      data: { optionId: plan.options[0]!.id, profileId: viewer, response: "NO" },
    });
    expect((await waitingOnYou(viewer)).map((i) => i.kind)).not.toContain(
      "PLAN_VOTE",
    );
  });

  it("lists a seat only once the confirmation round has actually asked", async () => {
    const viewer = await member("viewer");
    const host = await member("host");
    const startsAt = new Date(Date.now() + 20 * 3_600_000);
    const activity = await db.activity.create({
      data: {
        title: "Board games",
        description: "An evening of board games in a quiet bar around the corner.",
        startsAt,
        mode: "OFFLINE",
        maxParticipants: 8,
        organizerId: host,
        participants: {
          create: [
            { profileId: host, status: "JOINED" },
            { profileId: viewer, status: "JOINED" },
          ],
        },
      },
      select: { id: true },
    });

    expect((await waitingOnYou(viewer)).map((i) => i.kind)).not.toContain(
      "SEAT_CONFIRMATION",
    );

    await db.activity.update({
      where: { id: activity.id },
      data: { confirmationsAskedAt: new Date() },
    });
    expect((await waitingOnYou(viewer)).map((i) => i.kind)).toContain(
      "SEAT_CONFIRMATION",
    );

    await db.activityParticipant.update({
      where: { activityId_profileId: { activityId: activity.id, profileId: viewer } },
      data: { confirmedAt: new Date() },
    });
    expect((await waitingOnYou(viewer)).map((i) => i.kind)).not.toContain(
      "SEAT_CONFIRMATION",
    );
  });

  it("shows a join request to the moderator and to nobody else", async () => {
    const owner = await member("owner");
    const plain = await member("plain");
    const asker = await member("asker");
    await db.bunch.create({
      data: {
        slug: `waiting-${counter++}`,
        name: "The Tuesday Lot",
        description: "A group that meets on Tuesdays to play board games.",
        visibility: "PUBLIC",
        memberships: {
          create: [
            { profileId: owner, role: "OWNER", status: "ACTIVE" },
            { profileId: plain, role: "MEMBER", status: "ACTIVE" },
            { profileId: asker, role: "MEMBER", status: "REQUESTED" },
          ],
        },
      },
    });

    expect((await waitingOnYou(owner)).map((i) => i.kind)).toContain("JOIN_REQUEST");
    expect((await waitingOnYou(plain)).map((i) => i.kind)).not.toContain(
      "JOIN_REQUEST",
    );
  });

  it("puts whoever has been waiting longest at the top", async () => {
    const viewer = await member("viewer");
    const older = await member("older");
    const newer = await member("newer");
    await db.connection.create({
      data: {
        requesterId: older,
        addresseeId: viewer,
        status: "PENDING",
        createdAt: new Date(Date.now() - 5 * 86_400_000),
      },
    });
    await db.connection.create({
      data: { requesterId: newer, addresseeId: viewer, status: "PENDING" },
    });

    const items = await waitingOnYou(viewer);
    expect(items.map((item) => item.subject)).toEqual(["older", "newer"]);
  });

  it("says nothing for somebody nobody is waiting on", async () => {
    expect(await waitingOnYou(await member("alone"))).toEqual([]);
  });
});
