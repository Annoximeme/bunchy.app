import { describe, expect, it } from "vitest";
import { db } from "./db";
import {
  introduce,
  pendingIntroductions,
  respondToIntroduction,
} from "@/server/modules/connections/introduce";

/**
 * Member-made introductions.
 *
 * The properties worth defending are all about consent: you can only introduce
 * two people you actually know, both of them have to say yes, and neither the
 * other person nor the introducer is ever told which of them said no.
 */

let counter = 0;

async function member(tag: string, whoCanSendRequests?: "EVERYONE" | "NOBODY") {
  const unique = `${tag}${counter++}`;
  const user = await db.user.create({
    data: {
      email: `${unique}@integration.test`,
      profile: {
        create: {
          username: unique,
          displayName: tag,
          onboardingStage: "COMPLETE",
          privacy: { create: { ...(whoCanSendRequests ? { whoCanSendRequests } : {}) } },
        },
      },
    },
    select: { profile: { select: { id: true } } },
  });
  return user.profile!.id;
}

async function connect(a: string, b: string) {
  await db.connection.create({
    data: {
      requesterId: a,
      addresseeId: b,
      status: "ACCEPTED",
      respondedAt: new Date(),
    },
  });
}

/** A member who knows two people who do not know each other. */
async function triangle() {
  const introducer = await member("introducer");
  const one = await member("one");
  const other = await member("other");
  await connect(introducer, one);
  await connect(introducer, other);
  return { introducer, one, other };
}

describe("making an introduction", () => {
  it("needs you to know both of them", async () => {
    const introducer = await member("introducer");
    const one = await member("one");
    const stranger = await member("stranger");
    await connect(introducer, one);

    await expect(introduce(introducer, one, stranger)).rejects.toThrow();
  });

  it("asks both of them, with the reason attached", async () => {
    const { introducer, one, other } = await triangle();

    await introduce(introducer, one, other, "You both restore bikes.");

    for (const profileId of [one, other]) {
      const waiting = await pendingIntroductions(profileId);
      expect(waiting).toHaveLength(1);
      expect(waiting[0]!.note).toBe("You both restore bikes.");
      // Each of them is shown the other, never themselves.
      expect(waiting[0]!.person.id).toBe(profileId === one ? other : one);
    }
  });

  it("respects a closed door", async () => {
    const introducer = await member("introducer");
    const one = await member("one");
    const shut = await member("shut", "NOBODY");
    await connect(introducer, one);
    await connect(introducer, shut);

    await expect(introduce(introducer, one, shut)).rejects.toThrow();
  });

  it("refuses two people who already know each other", async () => {
    const { introducer, one, other } = await triangle();
    await connect(one, other);

    await expect(introduce(introducer, one, other)).rejects.toThrow();
  });

  it("allows only one live introduction per pair", async () => {
    const { introducer, one, other } = await triangle();
    await introduce(introducer, one, other);

    const second = await member("second");
    await connect(second, one);
    await connect(second, other);

    await expect(introduce(second, one, other)).rejects.toThrow();
  });

  it("refuses to introduce somebody to themselves, or to you", async () => {
    const { introducer, one, other } = await triangle();

    await expect(introduce(introducer, one, one)).rejects.toThrow();
    await expect(introduce(introducer, introducer, other)).rejects.toThrow();
  });
});

describe("answering one", () => {
  it("connects them once both say yes, with a conversation ready", async () => {
    const { introducer, one, other } = await triangle();
    const introduction = await introduce(introducer, one, other, "Bikes.");

    expect((await respondToIntroduction(introduction.id, one, true)).status).toBe(
      "PENDING",
    );
    expect((await respondToIntroduction(introduction.id, other, true)).status).toBe(
      "ACCEPTED",
    );

    const connection = await db.connection.findFirstOrThrow({
      where: {
        OR: [
          { requesterId: one, addresseeId: other },
          { requesterId: other, addresseeId: one },
        ],
      },
      select: { status: true, id: true },
    });
    expect(connection.status).toBe("ACCEPTED");

    const conversation = await db.conversation.findFirst({
      where: { connectionId: connection.id },
      select: { participants: { select: { profileId: true } } },
    });
    expect(conversation!.participants.map((p) => p.profileId).sort()).toEqual(
      [one, other].sort(),
    );

    // And the person who put them together is told it worked.
    const told = await db.notification.count({
      where: { profileId: introducer, type: "CONNECTION_ACCEPTED" },
    });
    expect(told).toBe(1);
  });

  it("never says which of them declined", async () => {
    const { introducer, one, other } = await triangle();
    const introduction = await introduce(introducer, one, other);

    await respondToIntroduction(introduction.id, one, true);
    await respondToIntroduction(introduction.id, other, false);

    // Both the willing half and the introducer hear the same sentence, and it
    // names nobody.
    for (const profileId of [introducer, one]) {
      const notices = await db.notification.findMany({
        where: { profileId, title: "That introduction didn't go ahead" },
        select: { body: true },
      });
      expect(notices).toHaveLength(1);
      expect(notices[0]!.body).not.toContain("one");
    }

    // And no connection was made.
    expect(
      await db.connection.count({
        where: {
          OR: [
            { requesterId: one, addresseeId: other },
            { requesterId: other, addresseeId: one },
          ],
        },
      }),
    ).toBe(0);
  });

  it("is not answerable by anybody else, or twice", async () => {
    const { introducer, one, other } = await triangle();
    const stranger = await member("stranger");
    const introduction = await introduce(introducer, one, other);

    await expect(
      respondToIntroduction(introduction.id, stranger, true),
    ).rejects.toThrow();
    await expect(
      respondToIntroduction(introduction.id, introducer, true),
    ).rejects.toThrow();

    await respondToIntroduction(introduction.id, one, true);
    await expect(respondToIntroduction(introduction.id, one, true)).rejects.toThrow();
  });
});
