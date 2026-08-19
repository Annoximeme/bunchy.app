import { describe, expect, it } from "vitest";
import { db } from "./db";
import { findPeople } from "@/server/modules/discovery/find-people";
import { createInstantBunch, previewInstantBunch, suggestName } from "@/server/modules/bunches/instant";
import { setAvailability } from "@/server/modules/availability/service";
import { INTEREST_ALIASES, INTEREST_SEEDS } from "@/lib/interests";
import { clearIntentCatalogue } from "@/server/modules/intent/resolve";

/**
 * Find Someone and Instant Bunch, end to end against a real database.
 *
 * The unit tests prove the parser reads a sentence correctly. These prove the
 * things a parser cannot: that the search obeys blocks and privacy switches,
 * that an empty result says which requirement emptied it, and that creating a
 * bunch invites the people who were named and nobody else.
 */

let counter = 0;

async function seedInterests() {
  clearIntentCatalogue();
  await db.interest.createMany({
    data: INTEREST_SEEDS.map((i) => ({
      slug: i.slug,
      label: i.label,
      category: i.category,
      aliases: [...(INTEREST_ALIASES[i.slug] ?? [])],
    })),
    skipDuplicates: true,
  });
}

interface MemberOptions {
  interests?: string[];
  windows?: Array<
    | "WEEKDAY_MORNING" | "WEEKDAY_AFTERNOON" | "WEEKDAY_EVENING"
    | "WEEKEND_MORNING" | "WEEKEND_AFTERNOON" | "WEEKEND_EVENING" | "LATE_NIGHT"
  >;
  city?: string;
  lat?: number;
  lng?: number;
  discoverable?: boolean;
  invitable?: boolean;
}

async function member(tag: string, options: MemberOptions = {}) {
  const unique = `${tag}${counter++}`;
  const interestRows = options.interests?.length
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
          cityLabel: options.city ?? "Antwerp",
          regionLabel: "Antwerp region",
          countryCode: "BE",
          approxLat: options.lat ?? 51.225,
          approxLng: options.lng ?? 4.425,
          timezone: "Europe/Brussels",
          privacy: {
            create: {
              discoverable: options.discoverable ?? true,
              invitableToBunches: options.invitable ?? true,
            },
          },
          interests: {
            create: interestRows.map((row) => ({
              interestId: row.id,
              strength: 3,
              intent: "PRACTICES" as const,
            })),
          },
          availability: {
            create: (options.windows ?? ["WEEKDAY_EVENING", "WEEKEND_AFTERNOON"]).map(
              (window) => ({ window }),
            ),
          },
        },
      },
    },
    select: { id: true, profile: { select: { id: true } } },
  });

  return { userId: user.id, profileId: user.profile!.id, username: unique };
}

/** A Wednesday afternoon, so "tonight" is a weekday evening. */
const NOW = new Date("2026-08-12T15:00:00Z");

describe("finding someone", () => {
  it("finds people who match what was asked for", async () => {
    await seedInterests();
    const seeker = await member("seeker", { interests: ["warhammer"] });
    await member("painter", { interests: ["warhammer"] });
    await member("hiker", { interests: ["hiking"] });

    const result = await findPeople(seeker.profileId, "play Warhammer tonight", {
      now: NOW,
    });

    expect(result.applied.interests).toEqual(["Warhammer"]);
    expect(result.people.map((p) => p.displayName)).toEqual(["painter"]);
  });

  it("explains why each person came up", async () => {
    await seedInterests();
    const seeker = await member("seeker", { interests: ["board-games"] });
    await member("player", { interests: ["board-games"] });

    const [found] = (
      await findPeople(seeker.profileId, "board games", { now: NOW })
    ).people;

    expect(found!.highlights.length).toBeGreaterThan(0);
    expect(found!.sharedInterests).toContain("Board games");
    // The radar breakdown (§9) comes from these.
    expect(found!.signals.some((s) => s.signal === "shared_interests")).toBe(true);
  });

  it("includes people you already know, and says so", async () => {
    await seedInterests();
    const seeker = await member("seeker", { interests: ["warhammer"] });
    const friend = await member("friend", { interests: ["warhammer"] });
    await db.connection.create({
      data: {
        requesterId: seeker.profileId,
        addresseeId: friend.profileId,
        status: "ACCEPTED",
        respondedAt: NOW,
      },
    });

    // Discover leaves connections out, and should, it exists to introduce
    // people. "Who would I play Warhammer with tonight" has the opposite
    // answer, and excluding friends emptied a screen that had exactly the
    // right person on it.
    const result = await findPeople(seeker.profileId, "play Warhammer tonight", {
      now: NOW,
    });

    expect(result.people.map((p) => p.displayName)).toEqual(["friend"]);
    expect(result.people[0]!.connected).toBe(true);
  });

  it("marks people you have not met as not connected", async () => {
    await seedInterests();
    const seeker = await member("seeker", { interests: ["hiking"] });
    await member("stranger", { interests: ["hiking"] });

    const result = await findPeople(seeker.profileId, "go hiking", {
      now: NOW,
    });
    expect(result.people[0]!.connected).toBe(false);
  });

  it("still refuses someone who said not interested", async () => {
    await seedInterests();
    const seeker = await member("seeker", { interests: ["hiking"] });
    const refused = await member("refused", { interests: ["hiking"] });
    await db.matchFeedback.create({
      data: {
        profileId: seeker.profileId,
        targetId: refused.profileId,
        signal: "NOT_INTERESTED",
      },
    });

    // "Not interested" is permanent, and including connections must not have
    // opened a back door around it.
    const result = await findPeople(seeker.profileId, "go hiking", {
      now: NOW,
    });
    expect(result.people).toEqual([]);
  });

  it("never returns someone who is not discoverable", async () => {
    await seedInterests();
    const seeker = await member("seeker", { interests: ["hiking"] });
    await member("hidden", { interests: ["hiking"], discoverable: false });

    const result = await findPeople(seeker.profileId, "go hiking", {
      now: NOW,
    });
    expect(result.people).toEqual([]);
  });

  it("never returns someone either side of a block", async () => {
    await seedInterests();
    const seeker = await member("seeker", { interests: ["hiking"] });
    const other = await member("other", { interests: ["hiking"] });

    await db.block.create({
      data: { blockerId: other.profileId, blockedId: seeker.profileId },
    });

    const result = await findPeople(seeker.profileId, "go hiking", {
      now: NOW,
    });
    expect(result.people).toEqual([]);
  });

  it("never exposes a coordinate", async () => {
    await seedInterests();
    const seeker = await member("seeker", { interests: ["hiking"] });
    await member("walker", { interests: ["hiking"] });

    const result = await findPeople(seeker.profileId, "go hiking near Antwerp", {
      now: NOW,
    });

    const people = JSON.stringify(result.people);
    expect(people).not.toContain("approxLat");
    expect(people).not.toContain("51.2");
    expect(result.people[0]!.locationLabel).toBe("Antwerp");
  });

  it("shows a Who's Up badge only to someone allowed to see it", async () => {
    await seedInterests();
    const seeker = await member("seeker", { interests: ["gaming"] });
    const open = await member("open", { interests: ["gaming"] });
    await setAvailability(open.profileId, { kind: "UP_FOR_GAMING" }, NOW);

    const visible = await findPeople(seeker.profileId, "gaming", {
      now: NOW,
    });
    expect(visible.people[0]!.availability?.label).toBe("Up for gaming");

    await db.privacySettings.update({
      where: { profileId: open.profileId },
      data: { whoCanSeeAvailability: "NOBODY" },
    });

    const hidden = await findPeople(seeker.profileId, "gaming", {
      now: NOW,
    });
    expect(hidden.people[0]!.availability).toBeNull();
  });

  it("can require a live status", async () => {
    await seedInterests();
    const seeker = await member("seeker", { interests: ["gaming"] });
    const idle = await member("idle", { interests: ["gaming"] });
    const keen = await member("keen", { interests: ["gaming"] });
    await setAvailability(keen.profileId, { kind: "FREE_NOW" }, NOW);

    const result = await findPeople(seeker.profileId, "gaming", {
      now: NOW,
      availableNow: true,
    });

    const names = result.people.map((p) => p.displayName);
    expect(names).toContain("keen");
    expect(names).not.toContain("idle");
    expect(idle.profileId).toBeTruthy();
  });
});

describe("when nobody matches", () => {
  it("says which requirement emptied the search", async () => {
    await seedInterests();
    const seeker = await member("seeker", { interests: ["hiking"] });
    // Into hiking, but only ever free on weekday mornings.
    await member("earlybird", {
      interests: ["hiking"],
      windows: ["WEEKDAY_MORNING"],
    });

    const result = await findPeople(seeker.profileId, "go hiking tonight", {
      now: NOW,
    });

    expect(result.people).toEqual([]);
    const time = result.relaxations.find((r) => r.constraint === "time");
    expect(time, "the time requirement should be named as the blocker").toBeDefined();
    expect(time!.message).toBe("Nobody is free tonight");
    expect(time!.found).toBe(1);
  });

  it("names the interest when that is the problem", async () => {
    await seedInterests();
    const seeker = await member("seeker", { interests: ["warhammer"] });
    await member("other", { interests: ["baking"] });

    const result = await findPeople(seeker.profileId, "play Warhammer", {
      now: NOW,
    });

    expect(result.people).toEqual([]);
    const interests = result.relaxations.find((r) => r.constraint === "interests");
    expect(interests?.message).toBe("Nobody nearby is into Warhammer");
    expect(interests?.found).toBe(1);
  });

  it("suggests nothing rather than something useless", async () => {
    await seedInterests();
    const seeker = await member("seeker", { interests: ["warhammer"] });

    // An empty platform. Dropping any requirement still finds nobody, so there
    // is no honest suggestion to make, and a "broaden your search" button
    // that leads to another empty screen is worse than no button.
    const result = await findPeople(seeker.profileId, "play Warhammer tonight", {
      now: NOW,
    });

    expect(result.people).toEqual([]);
    expect(result.relaxations).toEqual([]);
  });

  it("never invents a person", async () => {
    await seedInterests();
    const seeker = await member("seeker", { interests: ["warhammer"] });

    const result = await findPeople(seeker.profileId, "find someone for anything at all", {
      now: NOW,
    });
    expect(result.people).toEqual([]);
  });
});

describe("starting a bunch from a sentence", () => {
  it("names it from the member's own words", async () => {
    await seedInterests();
    const host = await member("host", { interests: ["warhammer"] });
    await member("guest", { interests: ["warhammer"] });

    const preview = await previewInstantBunch(host.profileId, "play Warhammer tonight", {
      now: NOW,
    });

    expect(preview.suggestedName).toBe("Warhammer tonight");
    expect(preview.search.people).toHaveLength(1);
  });

  it("writes nothing while previewing", async () => {
    await seedInterests();
    const host = await member("host", { interests: ["warhammer"] });
    await member("guest", { interests: ["warhammer"] });

    await previewInstantBunch(host.profileId, "play Warhammer tonight", { now: NOW });

    // Nobody has been invited to anything. Preview is a read.
    expect(await db.bunch.count()).toBe(0);
    expect(await db.notification.count()).toBe(0);
  });

  it("invites the people who were named, as invitations rather than members", async () => {
    await seedInterests();
    const host = await member("host", { interests: ["warhammer"] });
    const guest = await member("guest", { interests: ["warhammer"] });

    const created = await createInstantBunch(host.profileId, {
      name: "Warhammer tonight",
      description: "Bring an army.",
      profileIds: [guest.profileId],
      interestSlugs: ["warhammer"],
    });

    expect(created.invited).toBe(1);

    const memberships = await db.bunchMembership.findMany({
      where: { bunchId: created.id },
      select: { profileId: true, status: true, role: true },
    });

    // The creator is in the room; the guest has been asked.
    expect(memberships).toHaveLength(2);
    expect(memberships.find((m) => m.profileId === host.profileId)).toMatchObject({
      status: "ACTIVE",
      role: "OWNER",
    });
    expect(memberships.find((m) => m.profileId === guest.profileId)).toMatchObject({
      status: "INVITED",
      role: "MEMBER",
    });
  });

  it("will not invite someone who has bunch invites switched off", async () => {
    await seedInterests();
    const host = await member("host");
    const unwilling = await member("unwilling", { invitable: false });

    const created = await createInstantBunch(host.profileId, {
      name: "Board games Friday",
      description: "d",
      profileIds: [unwilling.profileId],
      interestSlugs: [],
    });

    expect(created.invited).toBe(0);
    expect(await db.notification.count()).toBe(0);
  });

  it("re-checks the invite list rather than trusting it", async () => {
    await seedInterests();
    const host = await member("host");
    const blocker = await member("blocker");
    await db.block.create({
      data: { blockerId: blocker.profileId, blockedId: host.profileId },
    });

    // The id was valid when the search ran. It is not valid now.
    const created = await createInstantBunch(host.profileId, {
      name: "Something tonight",
      description: "d",
      profileIds: [blocker.profileId],
      interestSlugs: [],
    });

    expect(created.invited).toBe(0);
  });

  it("turns a named time into a real activity", async () => {
    await seedInterests();
    const host = await member("host");
    const startsAt = new Date(NOW.getTime() + 4 * 3_600_000);

    const created = await createInstantBunch(
      host.profileId,
      {
        name: "Warhammer tonight",
        description: "d",
        profileIds: [],
        interestSlugs: ["warhammer"],
        startsAt,
        mode: "OFFLINE",
      },
      // The same fixed clock the rest of the file uses. Without it the service
      // compared a pinned start time against the real one, so this passed or
      // failed depending on the hour it was run.
      NOW,
    );

    expect(created.activityId).not.toBeNull();
    const activity = await db.activity.findUniqueOrThrow({
      where: { id: created.activityId! },
      select: { startsAt: true, bunchId: true, participants: true },
    });
    expect(activity.startsAt.getTime()).toBe(startsAt.getTime());
    expect(activity.bunchId).toBe(created.id);
    // Organising something means you are going to it.
    expect(activity.participants).toHaveLength(1);
  });

  it("refuses a start time that has already passed", async () => {
    await seedInterests();
    const host = await member("host");

    await expect(
      createInstantBunch(host.profileId, {
        name: "Yesterday's plan",
        description: "d",
        profileIds: [],
        interestSlugs: [],
        startsAt: new Date(Date.now() - 48 * 3_600_000),
      }),
    ).rejects.toThrow(/already passed/);
  });

  it("is happy to create a bunch of one", async () => {
    await seedInterests();
    const host = await member("host");

    // Nobody matched, but the member still wants the group to exist so they can
    // invite people later. An empty search is not a reason to refuse.
    const created = await createInstantBunch(host.profileId, {
      name: "Sunday cycling",
      description: "d",
      profileIds: [],
      interestSlugs: ["cycling"],
    });

    expect(created.invited).toBe(0);
    expect(await db.bunch.count()).toBe(1);
  });

  it("gives each bunch its own slug", async () => {
    await seedInterests();
    const host = await member("host");

    const first = await createInstantBunch(host.profileId, {
      name: "Warhammer tonight",
      description: "d",
      profileIds: [],
      interestSlugs: [],
    });
    const second = await createInstantBunch(host.profileId, {
      name: "Warhammer tonight",
      description: "d",
      profileIds: [],
      interestSlugs: [],
    });

    expect(first.slug).not.toBe(second.slug);
  });
});

describe("naming", () => {
  it("falls back to something plain rather than something clever", () => {
    const bare = suggestName({
      topic: null,
      interests: [],
      when: null,
    } as never);
    expect(bare).toBe("New bunch");
  });
});
