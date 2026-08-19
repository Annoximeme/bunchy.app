import { describe, expect, it } from "vitest";
import { db } from "./db";
import { getConversation, sendDirectMessage } from "@/server/modules/messaging/direct";
import { listMessages, postMessage } from "@/server/modules/messaging/bunch-chat";
import { getBunch } from "@/server/modules/bunches/service";
import { exportAccount } from "@/server/modules/account/export";

/**
 * Can a signed-in member reach something that is not theirs?
 *
 * Written after probing every route by hand and finding one real hole (an admin
 * route that validated the body before checking authorization, answering 422
 * where every other one answers 404). These lock the answers in, at the service
 * layer where the guards actually live.
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

/** Two people who are connected, and a third who is not. */
async function cast() {
  const alice = await member("alice");
  const bob = await member("bob");
  const eve = await member("eve");

  const connection = await db.connection.create({
    data: {
      requesterId: alice.profileId,
      addresseeId: bob.profileId,
      status: "ACCEPTED",
      respondedAt: new Date(),
    },
    select: { id: true },
  });
  const conversation = await db.conversation.create({
    data: {
      connectionId: connection.id,
      participants: {
        create: [{ profileId: alice.profileId }, { profileId: bob.profileId }],
      },
    },
    select: { id: true },
  });
  await sendDirectMessage(conversation.id, alice.profileId, "something private");

  return { alice, bob, eve, conversationId: conversation.id };
}

describe("direct messages", () => {
  it("are readable by the two people in them", async () => {
    const { alice, bob, conversationId } = await cast();

    for (const who of [alice, bob]) {
      const convo = await getConversation(conversationId, who.profileId);
      expect(convo.messages.map((m) => m.body)).toContain("something private");
    }
  });

  it("are not readable by anyone else", async () => {
    const { eve, conversationId } = await cast();

    await expect(getConversation(conversationId, eve.profileId)).rejects.toThrow();
  });

  it("cannot be written to by anyone else", async () => {
    const { eve, conversationId } = await cast();

    await expect(
      sendDirectMessage(conversationId, eve.profileId, "hello"),
    ).rejects.toThrow();
  });
});

describe("bunch chat", () => {
  async function bunchWithMember() {
    const insider = await member("insider");
    const outsider = await member("outsider");
    const bunch = await db.bunch.create({
      data: {
        slug: "private-bunch",
        name: "Private bunch",
        description: "d",
        visibility: "PUBLIC",
        memberships: {
          create: [{ profileId: insider.profileId, role: "OWNER", status: "ACTIVE" }],
        },
      },
      select: { id: true, slug: true },
    });
    await postMessage(bunch.id, insider.profileId, { body: "members only", mentionProfileIds: [] });
    return { insider, outsider, bunch };
  }

  it("is readable by members", async () => {
    const { insider, bunch } = await bunchWithMember();
    const messages = await listMessages(bunch.id, insider.profileId);
    expect(messages.map((m) => m.body)).toContain("members only");
  });

  it("is not readable by a non-member", async () => {
    const { outsider, bunch } = await bunchWithMember();
    await expect(listMessages(bunch.id, outsider.profileId)).rejects.toThrow();
  });

  it("cannot be posted to by a non-member", async () => {
    const { outsider, bunch } = await bunchWithMember();
    await expect(
      postMessage(bunch.id, outsider.profileId, { body: "let me in", mentionProfileIds: [] }),
    ).rejects.toThrow();
  });

  it("refuses someone whose membership row exists but is not active", async () => {
    const { insider, bunch } = await bunchWithMember();

    for (const status of ["REMOVED", "LEFT", "REQUESTED", "INVITED"] as const) {
      await db.bunchMembership.update({
        where: { bunchId_profileId: { bunchId: bunch.id, profileId: insider.profileId } },
        data: { status },
      });

      // The row still exists, so a guard that merely looked one up would pass.
      // This is also what closes the live chat stream: it re-runs this check on
      // every poll, and a removed member's connection ends on the next tick.
      await expect(
        listMessages(bunch.id, insider.profileId),
        `status ${status} must not grant access`,
      ).rejects.toThrow();
    }
  });

  it("shows a non-member the public description and no member list", async () => {
    const { outsider, bunch } = await bunchWithMember();

    // A discoverable bunch is meant to be findable, but who is in it, and what
    // they said, are not part of that.
    const view = await getBunch(bunch.slug, outsider.profileId);
    expect(view.name).toBe("Private bunch");
    expect(view.isMember).toBe(false);
    expect(view.members).toHaveLength(0);
    expect(view.joinRequests).toHaveLength(0);
  });
});

describe("the export is only ever your own", () => {
  it("contains the requester's messages and not the other party's account", async () => {
    const { alice, bob } = await cast();

    const mine = await exportAccount(alice.userId);
    const serialized = JSON.stringify(mine);

    expect(mine.account.email).toBe("alice@integration.test");
    // Bob appears as a username because Alice can already see it in the app,
    // his email address never does.
    expect(serialized).not.toContain("bob@integration.test");
    expect(await db.profile.count({ where: { id: bob.profileId } })).toBe(1);
  });
});
