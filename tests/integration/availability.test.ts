import { describe, expect, it } from "vitest";
import { db } from "./db";
import {
  availabilityClusters,
  clearAvailability,
  myAvailability,
  MIN_CLUSTER,
  purgeExpiredAvailability,
  setAvailability,
  visibleStatusCondition,
} from "@/server/modules/availability/service";

/**
 * Who's Up is the feature in this release with the most obvious way to go
 * wrong: it is a member saying where they are and that they are free. These
 * tests pin the four promises that make it defensible — it expires, it does not
 * accumulate, a count never identifies anybody, and the audience is the one the
 * member chose.
 */

let counter = 0;

async function member(
  tag: string,
  options: {
    city?: string;
    scope?: "EVERYONE" | "CONNECTIONS" | "BUNCH_MEMBERS" | "NOBODY";
    discoverable?: boolean;
  } = {},
) {
  const unique = `${tag}${counter++}`;
  const user = await db.user.create({
    data: {
      email: `${unique}@integration.test`,
      profile: {
        create: {
          username: unique,
          displayName: tag,
          onboardingStage: "COMPLETE",
          cityLabel: options.city ?? "Antwerp",
          countryCode: "BE",
          privacy: {
            create: {
              discoverable: options.discoverable ?? true,
              whoCanSeeAvailability: options.scope ?? "EVERYONE",
            },
          },
        },
      },
    },
    select: { id: true, profile: { select: { id: true } } },
  });
  return { userId: user.id, profileId: user.profile!.id };
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

/** How many statuses this viewer may see by name. */
async function visibleCount(viewerProfileId: string) {
  return db.availabilityStatus.count({
    where: {
      expiresAt: { gt: new Date() },
      profileId: { not: viewerProfileId },
      ...visibleStatusCondition(viewerProfileId),
    },
  });
}

describe("a status expires", () => {
  it("stops being the member's own status once it runs out", async () => {
    const alice = await member("alice");
    await setAvailability(alice.profileId, { kind: "FREE_NOW" });

    expect(await myAvailability(alice.profileId)).not.toBeNull();

    // FREE_NOW lives three hours. Four hours on, it is gone.
    const later = new Date(Date.now() + 4 * 3_600_000);
    expect(await myAvailability(alice.profileId, later)).toBeNull();
  });

  it("gives each kind a lifetime, and the client cannot choose it", async () => {
    const alice = await member("alice");

    const now = new Date("2026-08-12T12:00:00Z");
    const quick = await setAvailability(alice.profileId, { kind: "FREE_NOW" }, now);
    const long = await setAvailability(
      alice.profileId,
      { kind: "FREE_THIS_WEEKEND" },
      now,
    );

    expect(quick.expiresAt.getTime()).toBe(now.getTime() + 3 * 3_600_000);
    expect(long.expiresAt.getTime()).toBe(now.getTime() + 48 * 3_600_000);
  });

  it("drops out of the visible set when it expires", async () => {
    const alice = await member("alice");
    const bob = await member("bob");
    await setAvailability(bob.profileId, { kind: "FREE_NOW" });

    expect(await visibleCount(alice.profileId)).toBe(1);

    await db.availabilityStatus.update({
      where: { profileId: bob.profileId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    expect(await visibleCount(alice.profileId)).toBe(0);
  });

  it("is deleted by the purge, not merely ignored", async () => {
    const alice = await member("alice");
    const bob = await member("bob");
    await setAvailability(alice.profileId, { kind: "FREE_NOW" });
    await setAvailability(bob.profileId, { kind: "FREE_NOW" });
    await db.availabilityStatus.update({
      where: { profileId: bob.profileId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    expect(await purgeExpiredAvailability()).toBe(1);
    // A member who set a status on Friday should not find the row in a
    // database dump on Monday.
    expect(await db.availabilityStatus.count()).toBe(1);
  });
});

describe("nothing accumulates", () => {
  it("replaces the status rather than adding one", async () => {
    const alice = await member("alice");

    await setAvailability(alice.profileId, { kind: "FREE_NOW" });
    await setAvailability(alice.profileId, { kind: "FREE_TONIGHT" });
    await setAvailability(alice.profileId, { kind: "UP_FOR_GAMING" });

    // One row, not three. There is no history of when this person was free,
    // because the table cannot hold one.
    expect(await db.availabilityStatus.count()).toBe(1);
    expect((await myAvailability(alice.profileId))?.kind).toBe("UP_FOR_GAMING");
  });

  it("leaves nothing behind when cleared", async () => {
    const alice = await member("alice");
    await setAvailability(alice.profileId, { kind: "FREE_NOW" });

    await clearAvailability(alice.profileId);

    expect(await db.availabilityStatus.count()).toBe(0);
    expect(await myAvailability(alice.profileId)).toBeNull();
  });

  it("goes with the account", async () => {
    const alice = await member("alice");
    await setAvailability(alice.profileId, { kind: "FREE_NOW" });

    await db.user.delete({ where: { id: alice.userId } });

    expect(await db.availabilityStatus.count()).toBe(0);
  });
});

describe("a count never identifies anybody", () => {
  async function crowd(size: number, city: string) {
    for (let i = 0; i < size; i++) {
      const person = await member("someone", { city });
      await setAvailability(person.profileId, { kind: "FREE_TONIGHT" });
    }
  }

  it("publishes a cluster once it is genuinely a crowd", async () => {
    const viewer = await member("viewer");
    await crowd(MIN_CLUSTER, "Antwerp");

    const clusters = await availabilityClusters(viewer.profileId);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.count).toBe(MIN_CLUSTER);
    expect(clusters[0]!.where).toBe("Antwerp region");
  });

  it("suppresses a cluster that is one or two people", async () => {
    const viewer = await member("viewer");
    await crowd(MIN_CLUSTER - 1, "Ghent");

    // "1 person in Ghent is free tonight" plus a Discover search is a name.
    expect(await availabilityClusters(viewer.profileId)).toEqual([]);
  });

  it("never carries a name or a coordinate", async () => {
    const viewer = await member("viewer");
    await crowd(MIN_CLUSTER, "Antwerp");

    const serialized = JSON.stringify(await availabilityClusters(viewer.profileId));
    expect(serialized).not.toContain("someone");
    expect(serialized).not.toContain("integration.test");
    expect(serialized).not.toMatch(/\d+\.\d{3,}/);
  });

  it("leaves out members who switched the feature off", async () => {
    const viewer = await member("viewer");
    await crowd(MIN_CLUSTER, "Antwerp");
    for (let i = 0; i < 3; i++) {
      const hidden = await member("hidden", { city: "Antwerp", scope: "NOBODY" });
      await setAvailability(hidden.profileId, { kind: "FREE_TONIGHT" });
    }

    // They asked not to be part of this, which means not counted either.
    const clusters = await availabilityClusters(viewer.profileId);
    expect(clusters[0]!.count).toBe(MIN_CLUSTER);
  });

  it("leaves out people either side of a block", async () => {
    const viewer = await member("viewer");
    await crowd(MIN_CLUSTER, "Antwerp");

    const blocked = await member("blocked", { city: "Antwerp" });
    await setAvailability(blocked.profileId, { kind: "FREE_TONIGHT" });
    await db.block.create({
      data: { blockerId: viewer.profileId, blockedId: blocked.profileId },
    });

    expect((await availabilityClusters(viewer.profileId))[0]!.count).toBe(MIN_CLUSTER);
  });

  it("never counts the viewer's own status", async () => {
    const viewer = await member("viewer");
    await setAvailability(viewer.profileId, { kind: "FREE_TONIGHT" });
    await crowd(MIN_CLUSTER - 1, "Antwerp");

    // Two others plus the viewer is not a crowd of three.
    expect(await availabilityClusters(viewer.profileId)).toEqual([]);
  });
});

describe("the audience is the one the member chose", () => {
  it("shows an EVERYONE status to a stranger", async () => {
    const stranger = await member("stranger");
    const open = await member("open", { scope: "EVERYONE" });
    await setAvailability(open.profileId, { kind: "FREE_NOW" });

    expect(await visibleCount(stranger.profileId)).toBe(1);
  });

  it("hides a CONNECTIONS status from a stranger and shows it to a connection", async () => {
    const stranger = await member("stranger");
    const friend = await member("friend");
    const careful = await member("careful", { scope: "CONNECTIONS" });
    await setAvailability(careful.profileId, { kind: "FREE_NOW" });

    expect(await visibleCount(stranger.profileId)).toBe(0);

    await connect(careful.profileId, friend.profileId);
    expect(await visibleCount(friend.profileId)).toBe(1);
  });

  it("shows a CONNECTIONS status to a friend of a friend", async () => {
    // CONNECTIONS means friend-of-a-friend across this codebase — see
    // `satisfiesAudience`. If that ever silently became "direct connections
    // only", this is the test that notices.
    const careful = await member("careful", { scope: "CONNECTIONS" });
    const mutual = await member("mutual");
    const twoHops = await member("twohops");
    const unrelated = await member("unrelated");

    await setAvailability(careful.profileId, { kind: "FREE_NOW" });
    await connect(careful.profileId, mutual.profileId);
    await connect(mutual.profileId, twoHops.profileId);

    expect(await visibleCount(twoHops.profileId)).toBe(1);
    expect(await visibleCount(unrelated.profileId)).toBe(0);
  });

  it("shows a BUNCH_MEMBERS status only inside the bunch", async () => {
    const outsider = await member("outsider");
    const insider = await member("insider");
    const careful = await member("careful", { scope: "BUNCH_MEMBERS" });
    await setAvailability(careful.profileId, { kind: "FREE_NOW" });

    await db.bunch.create({
      data: {
        slug: "the-bunch",
        name: "The bunch",
        description: "d",
        memberships: {
          create: [
            { profileId: careful.profileId, status: "ACTIVE", role: "OWNER" },
            { profileId: insider.profileId, status: "ACTIVE", role: "MEMBER" },
          ],
        },
      },
    });

    expect(await visibleCount(insider.profileId)).toBe(1);
    expect(await visibleCount(outsider.profileId)).toBe(0);
  });

  it("hides a NOBODY status from everyone", async () => {
    const stranger = await member("stranger");
    const friend = await member("friend");
    const hidden = await member("hidden", { scope: "NOBODY" });
    await setAvailability(hidden.profileId, { kind: "FREE_NOW" });
    await connect(hidden.profileId, friend.profileId);

    expect(await visibleCount(stranger.profileId)).toBe(0);
    // Not even to a connection: NOBODY means the feature is off.
    expect(await visibleCount(friend.profileId)).toBe(0);
  });
});

describe("what goes into a status", () => {
  it("keeps only interests that exist", async () => {
    const alice = await member("alice");
    const real = await db.interest.create({
      data: { slug: "chess", label: "Chess", category: "Gaming & Play" },
    });

    const status = await setAvailability(alice.profileId, {
      kind: "UP_FOR_GAMING",
      interestIds: [real.id, "definitely-not-an-id"],
    });

    expect(status.interests).toEqual([{ id: real.id, label: "Chess" }]);
  });

  it("refuses a note longer than the limit", async () => {
    const alice = await member("alice");
    await expect(
      setAvailability(alice.profileId, { kind: "FREE_NOW", note: "x".repeat(141) }),
    ).rejects.toThrow();
  });

  it("keeps the member's own words when they fit", async () => {
    const alice = await member("alice");
    const status = await setAvailability(alice.profileId, {
      kind: "FREE_TONIGHT",
      note: "  up for a board game night  ",
    });
    expect(status.note).toBe("up for a board game night");
  });
});
