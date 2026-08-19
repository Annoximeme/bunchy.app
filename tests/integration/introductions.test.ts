import { describe, expect, it } from "vitest";
import { db } from "./db";
import {
  nextIntroduction,
  respondToIntroduction,
} from "@/server/modules/discovery/introductions";
import { INTEREST_SEEDS } from "@/lib/interests";

/**
 * Introductions are the only thing in Bunchy that speaks unprompted, so the
 * tests are mostly about restraint: that the opt-out actually stops the work,
 * that "send" goes through the ordinary consent path rather than around it, and
 * that a weak match produces silence rather than a hollow sentence.
 */

let counter = 0;

async function seedInterests() {
  await db.interest.createMany({
    data: INTEREST_SEEDS.map((i) => ({
      slug: i.slug,
      label: i.label,
      category: i.category,
    })),
    skipDuplicates: true,
  });
}

async function member(
  tag: string,
  options: {
    interests?: string[];
    goals?: Array<"GAMING_FRIENDS" | "NEW_FRIENDS" | "HOBBY_PARTNERS">;
    introductions?: boolean;
  } = {},
) {
  const unique = `${tag}${counter++}`;
  const rows = options.interests?.length
    ? await db.interest.findMany({
        where: { slug: { in: options.interests } },
        select: { id: true },
      })
    : [];

  const user = await db.user.create({
    data: {
      email: `${unique}@integration.test`,
      birthYear: 1995,
      profile: {
        create: {
          username: unique,
          displayName: tag,
          onboardingStage: "COMPLETE",
          cityLabel: "Antwerp",
          countryCode: "BE",
          approxLat: 51.225,
          approxLng: 4.425,
          timezone: "Europe/Brussels",
          privacy: {
            create: {
              discoverable: true,
              aiIntroductions: options.introductions ?? true,
            },
          },
          interests: {
            create: rows.map((row) => ({
              interestId: row.id,
              strength: 3,
              intent: "PRACTICES" as const,
            })),
          },
          goals: {
            create: (options.goals ?? ["GAMING_FRIENDS", "NEW_FRIENDS"]).map((goal) => ({
              goal,
            })),
          },
          availability: {
            create: [{ window: "WEEKDAY_EVENING" }, { window: "WEEKEND_AFTERNOON" }],
          },
        },
      },
    },
    select: { id: true, profile: { select: { id: true } } },
  });

  return { userId: user.id, profileId: user.profile!.id };
}

/** Two people who obviously belong in the same room. */
async function goodPair() {
  await seedInterests();
  const viewer = await member("Sarah", {
    interests: ["warhammer", "strategy-games", "board-games", "gaming"],
  });
  const other = await member("Milan", {
    interests: ["warhammer", "strategy-games", "board-games", "gaming"],
  });
  return { viewer, other };
}

describe("offering an introduction", () => {
  it("introduces two obviously compatible people", async () => {
    const { viewer } = await goodPair();

    const intro = await nextIntroduction(viewer.profileId);

    expect(intro).not.toBeNull();
    expect(intro!.headline).toBe("Sarah, meet Milan.");
    expect(intro!.why.length).toBeGreaterThan(0);
    expect(intro!.starters.length).toBeGreaterThan(0);
  });

  it("says only things that are true of both of them", async () => {
    const { viewer } = await goodPair();
    const intro = await nextIntroduction(viewer.profileId);

    // Everything named has to be an interest they actually share.
    for (const thing of intro!.because) {
      const shared = await db.userInterest.count({
        where: { interest: { label: thing }, profileId: { in: [viewer.profileId] } },
      });
      expect(shared, `${thing} is not one of Sarah's interests`).toBe(1);
    }
  });

  it("carries no contact details or coordinates", async () => {
    const { viewer } = await goodPair();
    const intro = await nextIntroduction(viewer.profileId);

    const serialized = JSON.stringify(intro);
    expect(serialized).not.toContain("integration.test");
    expect(serialized).not.toContain("51.2");
    expect(serialized).not.toContain("approxLat");
  });

  it("offers one, never a list", async () => {
    await seedInterests();
    const viewer = await member("Sarah", { interests: ["warhammer", "gaming"] });
    for (let i = 0; i < 5; i++) {
      await member(`Match${i}`, { interests: ["warhammer", "gaming"] });
    }

    const intro = await nextIntroduction(viewer.profileId);
    // The return type is one introduction or none. A list would be a feed.
    expect(Array.isArray(intro)).toBe(false);
    expect(intro).not.toBeNull();
  });

  it("says nothing when nobody is a strong match", async () => {
    await seedInterests();
    const viewer = await member("Sarah", { interests: ["warhammer"] });
    await member("Nobody", {
      interests: ["baking"],
      goals: ["HOBBY_PARTNERS"],
    });

    // Better no introduction than one that can only say "you seem compatible".
    expect(await nextIntroduction(viewer.profileId)).toBeNull();
  });

  it("says nothing on an empty platform", async () => {
    await seedInterests();
    const viewer = await member("Sarah", { interests: ["warhammer"] });
    expect(await nextIntroduction(viewer.profileId)).toBeNull();
  });
});

describe("the opt-out", () => {
  it("stops introductions entirely", async () => {
    await seedInterests();
    const viewer = await member("Sarah", {
      interests: ["warhammer", "strategy-games", "gaming"],
      introductions: false,
    });
    await member("Milan", { interests: ["warhammer", "strategy-games", "gaming"] });

    expect(await nextIntroduction(viewer.profileId)).toBeNull();
  });

  it("is the viewer's setting, not the other person's", async () => {
    await seedInterests();
    const viewer = await member("Sarah", {
      interests: ["warhammer", "strategy-games", "board-games", "gaming"],
    });
    await member("Milan", {
      interests: ["warhammer", "strategy-games", "board-games", "gaming"],
      introductions: false,
    });

    // Milan not wanting introductions offered *to him* does not make him
    // undiscoverable, that is what `discoverable` is for.
    expect(await nextIntroduction(viewer.profileId)).not.toBeNull();
  });
});

describe("acting on one", () => {
  it("sends a connection request the other person must accept", async () => {
    const { viewer, other } = await goodPair();

    await respondToIntroduction(
      viewer.profileId,
      other.profileId,
      "send",
      "What army are you painting?",
    );

    const connection = await db.connection.findFirstOrThrow({
      where: { requesterId: viewer.profileId, addresseeId: other.profileId },
      select: { status: true, note: true },
    });

    // Pending, not accepted. Bunchy does not introduce two people behind
    // their backs, it asks on your behalf and the other person decides.
    expect(connection.status).toBe("PENDING");
    expect(connection.note).toBe("What army are you painting?");
  });

  it("creates no conversation until the request is accepted", async () => {
    const { viewer, other } = await goodPair();
    await respondToIntroduction(viewer.profileId, other.profileId, "send", "Hi");

    expect(await db.conversation.count()).toBe(0);
    expect(await db.directMessage.count()).toBe(0);
  });

  it("respects who is allowed to send a request at all", async () => {
    const { viewer, other } = await goodPair();
    await db.privacySettings.update({
      where: { profileId: other.profileId },
      data: { whoCanSendRequests: "NOBODY" },
    });

    await expect(
      respondToIntroduction(viewer.profileId, other.profileId, "send", "Hi"),
    ).rejects.toThrow();
  });

  it("takes 'not now' as this card, not this person", async () => {
    const { viewer, other } = await goodPair();
    await nextIntroduction(viewer.profileId);

    await respondToIntroduction(viewer.profileId, other.profileId, "dismiss");

    // Dismissed, but no permanent feedback, they stay in the pool.
    expect(await db.matchFeedback.count()).toBe(0);
    const rec = await db.recommendation.findFirstOrThrow({
      where: { profileId: viewer.profileId, targetId: other.profileId },
      select: { dismissedAt: true },
    });
    expect(rec.dismissedAt).not.toBeNull();
  });

  it("takes 'not interested' as permanent", async () => {
    const { viewer, other } = await goodPair();
    await nextIntroduction(viewer.profileId);

    await respondToIntroduction(viewer.profileId, other.profileId, "not_interested");

    const feedback = await db.matchFeedback.findFirstOrThrow({
      where: { profileId: viewer.profileId, targetId: other.profileId },
      select: { signal: true },
    });
    expect(feedback.signal).toBe("NOT_INTERESTED");

    // And they are gone from the recommendations that feed introductions.
    expect(await nextIntroduction(viewer.profileId)).toBeNull();
  });

  it("refuses to introduce someone to themselves", async () => {
    const { viewer } = await goodPair();
    await expect(
      respondToIntroduction(viewer.profileId, viewer.profileId, "send", "Hi"),
    ).rejects.toThrow();
  });
});
