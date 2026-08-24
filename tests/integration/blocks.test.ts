import { describe, expect, it } from "vitest";
import { db } from "./db";
import { blockProfile } from "@/server/modules/moderation/service";
import { createBunch, inviteToBunch } from "@/server/modules/bunches/service";
import { sendRequest } from "@/server/modules/connections/service";

/**
 * What a block is actually worth.
 *
 * The moderation module says, in its own opening comment, that a block means
 * "neither can message or invite the other". Connection requests and direct
 * messages enforced that. Bunch invites did not: the path went straight from a
 * membership check to writing an INVITED row and raising a notification naming
 * the inviter, so the one approach a blocked person could still make was the
 * one that arrived as an invitation the recipient had to decline by hand.
 *
 * These run against the real database because the thing being checked is that
 * no row survives the refusal. A mock would happily agree that nothing was
 * written while the membership table filled up.
 */

async function member(tag: string) {
  const user = await db.user.create({
    data: {
      email: `${tag}@integration.test`,
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

/** Alice has blocked Bob. Bob owns a bunch and would like Alice in it. */
async function blockedPair() {
  const alice = await member("alice");
  const bob = await member("bob");

  const bunch = await createBunch(bob.profileId, {
    name: "Sunday Football",
    description: "A kickabout in the park, every week. Bring boots.",
    interestSlugs: ["board-games"],
    visibility: "PUBLIC",
    type: "ACTIVITY",
    maxMembers: 10,
  });

  await blockProfile(alice.profileId, bob.profileId);

  return { alice, bob, bunchId: bunch.id };
}

describe("a block stops a bunch invite", () => {
  it("refuses when the blocker is the one being invited", async () => {
    const { alice, bob, bunchId } = await blockedPair();

    await expect(
      inviteToBunch(bunchId, bob.profileId, alice.profileId),
    ).rejects.toThrow();
  });

  it("refuses in the other direction too", async () => {
    const { alice, bob } = await blockedPair();

    // Alice blocked Bob, and now Alice is the one doing the inviting. A block
    // is not a one-way mute: the person who drew the line does not get to keep
    // reaching across it.
    const hers = await createBunch(alice.profileId, {
      name: "Book Club",
      description: "One book a month, no homework, no set reading pace.",
      interestSlugs: ["puzzles"],
      visibility: "PUBLIC",
      type: "INTEREST",
      maxMembers: 10,
    });

    await expect(
      inviteToBunch(hers.id, alice.profileId, bob.profileId),
    ).rejects.toThrow();
  });

  it("writes no membership row when it refuses", async () => {
    const { alice, bob, bunchId } = await blockedPair();

    await expect(
      inviteToBunch(bunchId, bob.profileId, alice.profileId),
    ).rejects.toThrow();

    // The refusal has to happen before the write. An invite that throws after
    // upserting the row leaves the recipient looking at an invitation from
    // somebody they blocked, which is the whole failure being fixed.
    const membership = await db.bunchMembership.findUnique({
      where: { bunchId_profileId: { bunchId, profileId: alice.profileId } },
    });
    expect(membership).toBeNull();
  });

  it("raises no notification when it refuses", async () => {
    const { alice, bob, bunchId } = await blockedPair();

    await expect(
      inviteToBunch(bunchId, bob.profileId, alice.profileId),
    ).rejects.toThrow();

    const notifications = await db.notification.findMany({
      where: { profileId: alice.profileId },
    });
    expect(notifications).toHaveLength(0);
  });

  it("does not say that a block is the reason", async () => {
    const { alice, bob, bunchId } = await blockedPair();

    // Telling the inviter "they blocked you" hands them the one fact they are
    // not owed, and turns a block into a signal worth testing for. The error is
    // the same vague one an absent profile produces.
    const error = await inviteToBunch(bunchId, bob.profileId, alice.profileId)
      .then(() => null)
      .catch((e: unknown) => e as Error);

    expect(error).not.toBeNull();
    expect(error!.message.toLowerCase()).not.toContain("block");
  });

  it("still lets an ordinary invite through", async () => {
    const bob = await member("bob");
    const carol = await member("carol");

    const bunch = await createBunch(bob.profileId, {
      name: "Sunday Football",
      description: "A kickabout in the park, every week. Bring boots.",
      interestSlugs: ["board-games"],
      visibility: "PUBLIC",
      type: "ACTIVITY",
      maxMembers: 10,
    });

    await inviteToBunch(bunch.id, bob.profileId, carol.profileId);

    const membership = await db.bunchMembership.findUnique({
      where: { bunchId_profileId: { bunchId: bunch.id, profileId: carol.profileId } },
    });
    expect(membership?.status).toBe("INVITED");
  });
});

describe("a block stops a connection request", () => {
  it("refuses, as it always did", async () => {
    const { alice, bob } = await blockedPair();

    // Not a new guard. This is here so that if the shared `assertNotBlocked`
    // call is ever refactored out of one path, the suite says which paths lost
    // it rather than just that something changed.
    await expect(
      sendRequest(bob.profileId, alice.profileId),
    ).rejects.toThrow();
  });
});
