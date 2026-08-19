import { describe, expect, it } from "vitest";
import { db } from "./db";
import { ask } from "@/server/modules/concierge/service";
import { setAvailability } from "@/server/modules/availability/service";
import { INTEREST_SEEDS } from "@/lib/interests";
import { clearIntentCatalogue } from "@/server/modules/intent/resolve";

/**
 * Bunchy AI.
 *
 * The claim these tests exist to defend is the strong one: the concierge cannot
 * change anything. §6 and §23 say it must never send an invitation, publish an
 * activity or make a commitment without authorisation, and the implementation's
 * answer is that it has no write path, so the tests count rows before and
 * after, on every kind of question, rather than checking a guard.
 *
 * The rest is about not inventing: every count it states has to be a count of
 * something that exists.
 */

let counter = 0;

async function seedInterests() {
  clearIntentCatalogue();
  await db.interest.createMany({
    data: INTEREST_SEEDS.map((i) => ({
      slug: i.slug,
      label: i.label,
      category: i.category,
    })),
    skipDuplicates: true,
  });
}

async function member(tag: string, interests: string[] = []) {
  const unique = `${tag}${counter++}`;
  const rows = interests.length
    ? await db.interest.findMany({
        where: { slug: { in: interests } },
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
          privacy: { create: { discoverable: true } },
          interests: {
            create: rows.map((row) => ({
              interestId: row.id,
              strength: 3,
              intent: "PRACTICES" as const,
            })),
          },
          goals: { create: [{ goal: "NEW_FRIENDS" }] },
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

const NOW = new Date("2026-08-12T15:00:00Z");

/** Everything the concierge could conceivably create. */
async function counts() {
  const [bunches, activities, connections, messages, notifications, memberships, statuses] =
    await Promise.all([
      db.bunch.count(),
      db.activity.count(),
      db.connection.count(),
      db.directMessage.count(),
      db.notification.count(),
      db.bunchMembership.count(),
      db.availabilityStatus.count(),
    ]);
  return { bunches, activities, connections, messages, notifications, memberships, statuses };
}

const EVERY_KIND = [
  "I want to play Warhammer tonight",
  "what's happening this weekend",
  "find a bunch for board games",
  "who's around right now",
  "why am I seeing these people",
  "what can you do",
  "asdfghjkl",
];

describe("it cannot change anything", () => {
  it("writes nothing, whatever it is asked", async () => {
    await seedInterests();
    const viewer = await member("Sarah", ["warhammer", "gaming"]);
    await member("Milan", ["warhammer", "gaming"]);
    await setAvailability(viewer.profileId, { kind: "FREE_TONIGHT" }, NOW);

    const before = await counts();
    for (const question of EVERY_KIND) {
      await ask(viewer.profileId, question, NOW);
    }
    const after = await counts();

    // Not "the guard held", there is nothing here that could have written.
    expect(after).toEqual(before);
  });

  it("offers next steps only as links", async () => {
    await seedInterests();
    const viewer = await member("Sarah", ["warhammer"]);
    await member("Milan", ["warhammer"]);

    for (const question of EVERY_KIND) {
      const reply = await ask(viewer.profileId, question, NOW);
      for (const action of reply.actions) {
        // Every action is somewhere to go, and the flow it lands in asks
        // before it does anything.
        expect(action.href, `${question}: ${action.label}`).toMatch(/^\//);
      }
    }
  });

  it("never claims to have done something", async () => {
    await seedInterests();
    const viewer = await member("Sarah", ["warhammer"]);
    await member("Milan", ["warhammer"]);

    for (const question of EVERY_KIND) {
      const said = (await ask(viewer.profileId, question, NOW)).say.join(" ");
      expect(said, question).not.toMatch(
        /\bI(?:'ve| have)? (created|sent|invited|joined|added|booked|planned)\b/i,
      );
    }
  });
});

describe("it answers with real data", () => {
  it("counts people who actually exist", async () => {
    await seedInterests();
    const viewer = await member("Sarah", ["warhammer", "gaming"]);
    await member("Milan", ["warhammer", "gaming"]);
    await member("Kenji", ["warhammer", "gaming"]);

    const reply = await ask(viewer.profileId, "I want to play Warhammer tonight", NOW);

    expect(reply.understood).toBe("find_people");
    expect(reply.people.length).toBe(2);
    expect(reply.say.join(" ")).toContain("2 people");
  });

  it("says which requirement emptied a search instead of shrugging", async () => {
    await seedInterests();
    const viewer = await member("Sarah", ["warhammer"]);
    // Into Warhammer, but never free in the evening.
    const other = await member("Milan", ["warhammer"]);
    await db.profileAvailability.deleteMany({ where: { profileId: other.profileId } });
    await db.profileAvailability.create({
      data: { profileId: other.profileId, window: "WEEKDAY_MORNING" },
    });

    const reply = await ask(viewer.profileId, "I want to play Warhammer tonight", NOW);

    expect(reply.people).toEqual([]);
    expect(reply.say.join(" ")).toContain("Nobody is free tonight");
    expect(reply.say.join(" ")).toContain("1 person matches everything else");
  });

  it("explains recommendations using the member's own numbers", async () => {
    await seedInterests();
    const viewer = await member("Sarah", ["warhammer", "gaming"]);

    const reply = await ask(viewer.profileId, "why am I seeing these people", NOW);

    expect(reply.understood).toBe("explain");
    const said = reply.say.join(" ");
    expect(said).toContain("2 interests");
    expect(said).toContain("nothing is bought, boosted or sponsored");
    // They have not done the personality step, so it says so.
    expect(said).toContain("style questions");
  });

  it("reports who is around without naming anybody", async () => {
    await seedInterests();
    const viewer = await member("Sarah");
    for (let i = 0; i < 3; i++) {
      const other = await member(`Person${i}`);
      await setAvailability(other.profileId, { kind: "FREE_TONIGHT" }, NOW);
    }

    const reply = await ask(viewer.profileId, "who's around right now", NOW);

    expect(reply.understood).toBe("whos_up");
    expect(reply.say.join(" ")).toContain("3 people are up for something");
    expect(JSON.stringify(reply.clusters)).not.toContain("Person");
  });

  it("is honest when there is nothing to report", async () => {
    await seedInterests();
    const viewer = await member("Sarah", ["warhammer"]);

    const reply = await ask(viewer.profileId, "what's happening this weekend", NOW);

    expect(reply.activities).toEqual([]);
    expect(reply.say.join(" ")).toContain("Nothing is planned");
    // And it does not pretend the emptiness is the member's fault.
    expect(reply.actions.length).toBeGreaterThan(0);
  });

  it("says what it can do when asked", async () => {
    await seedInterests();
    const viewer = await member("Sarah");

    const reply = await ask(viewer.profileId, "what can you do", NOW);

    expect(reply.understood).toBe("help");
    expect(reply.say.join(" ")).toContain("can't send anything");
  });
});

describe("privacy still applies", () => {
  it("does not surface someone who is not discoverable", async () => {
    await seedInterests();
    const viewer = await member("Sarah", ["warhammer"]);
    const hidden = await member("Milan", ["warhammer"]);
    await db.privacySettings.update({
      where: { profileId: hidden.profileId },
      data: { discoverable: false },
    });

    const reply = await ask(viewer.profileId, "find someone to play Warhammer with", NOW);
    expect(reply.people).toEqual([]);
  });

  it("does not surface someone on either side of a block", async () => {
    await seedInterests();
    const viewer = await member("Sarah", ["warhammer"]);
    const other = await member("Milan", ["warhammer"]);
    await db.block.create({
      data: { blockerId: other.profileId, blockedId: viewer.profileId },
    });

    const reply = await ask(viewer.profileId, "find someone to play Warhammer with", NOW);
    expect(reply.people).toEqual([]);
  });

  it("leaks no email or coordinate in any answer", async () => {
    await seedInterests();
    const viewer = await member("Sarah", ["warhammer", "gaming"]);
    await member("Milan", ["warhammer", "gaming"]);

    for (const question of EVERY_KIND) {
      const serialized = JSON.stringify(await ask(viewer.profileId, question, NOW));
      expect(serialized, question).not.toContain("integration.test");
      expect(serialized, question).not.toContain("51.2");
    }
  });
});
