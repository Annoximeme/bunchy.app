import { describe, expect, it } from "vitest";
import { db } from "./db";
import { scanRadar } from "@/server/modules/discovery/radar";
import {
  readChemistry,
  recomputeAllChemistry,
  recomputeChemistry,
} from "@/server/modules/bunches/health";
import { setAvailability, MIN_CLUSTER } from "@/server/modules/availability/service";

/**
 * Radar and chemistry.
 *
 * The radar's job is to be useful without ever saying where anybody is, so most
 * of these check what it refuses to emit. The chemistry tests check the two
 * things a stored score can get wrong: being served stale from the wrong place,
 * and being confidently precise about a group with no history.
 */

let counter = 0;
const NOW = new Date("2026-08-12T15:00:00Z");

async function member(tag: string, city = "Antwerp", lat = 51.225, lng = 4.425) {
  const unique = `${tag}${counter++}`;
  const user = await db.user.create({
    data: {
      email: `${unique}@integration.test`,
      profile: {
        create: {
          username: unique,
          displayName: tag,
          onboardingStage: "COMPLETE",
          cityLabel: city,
          regionLabel: `${city} region`,
          countryCode: "BE",
          approxLat: lat,
          approxLng: lng,
          timezone: "Europe/Brussels",
          privacy: { create: { discoverable: true } },
        },
      },
    },
    select: { id: true, profile: { select: { id: true } } },
  });
  return { userId: user.id, profileId: user.profile!.id };
}

async function bunch(
  name: string,
  options: {
    visibility?: "PUBLIC" | "PRIVATE";
    lat?: number;
    lng?: number;
    city?: string;
    members?: string[];
  } = {},
) {
  return db.bunch.create({
    data: {
      slug: `${name.toLowerCase().replace(/\W+/g, "-")}-${counter++}`,
      name,
      description: "d",
      visibility: options.visibility ?? "PUBLIC",
      cityLabel: options.city ?? "Antwerp",
      regionLabel: "Antwerp region",
      countryCode: "BE",
      approxLat: options.lat ?? 51.225,
      approxLng: options.lng ?? 4.425,
      memberships: {
        create: (options.members ?? []).map((profileId, index) => ({
          profileId,
          status: "ACTIVE" as const,
          role: index === 0 ? ("OWNER" as const) : ("MEMBER" as const),
        })),
      },
    },
    select: { id: true, slug: true },
  });
}

describe("the radar shows what is around", () => {
  it("finds a public bunch and says roughly where it is", async () => {
    const viewer = await member("viewer");
    await bunch("Board Game Nights");

    const result = await scanRadar(viewer.profileId, { now: NOW });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.title).toBe("Board Game Nights");
    expect(result.items[0]!.where).toContain("Antwerp");
  });

  it("never emits a coordinate", async () => {
    const viewer = await member("viewer");
    await bunch("Board Game Nights");
    await db.activity.create({
      data: {
        title: "Climbing",
        description: "d",
        startsAt: new Date(NOW.getTime() + 86_400_000),
        mode: "OFFLINE",
        cityLabel: "Antwerp",
        countryCode: "BE",
        maxParticipants: 8,
        organizerId: viewer.profileId,
      },
    });

    const serialized = JSON.stringify(await scanRadar(viewer.profileId, { now: NOW }));
    expect(serialized).not.toContain("approxLat");
    expect(serialized).not.toContain("51.2");
    expect(serialized).not.toContain("4.42");
  });

  it("reports distance as a band rather than a measurement", async () => {
    const viewer = await member("viewer");
    // Ghent, ~50 km west of Antwerp.
    await bunch("Ghent Runners", { lat: 51.055, lng: 3.725, city: "Ghent" });

    const result = await scanRadar(viewer.profileId, { now: NOW, withinKm: null });
    const item = result.items[0]!;

    // A precise "51.3 km" from a grid-snapped point implies precision the data
    // does not have, and repeated readings would start to triangulate.
    expect([2, 5, 10, 25, 50, 100]).toContain(item.distanceKm);
    expect(item.where).toMatch(/within \d+ km|nearby/);
  });

  it("leaves out invite-only bunches", async () => {
    const viewer = await member("viewer");
    await bunch("Secret Society", { visibility: "PRIVATE" });

    // Being findable is the whole difference between public and private.
    expect((await scanRadar(viewer.profileId, { now: NOW })).items).toEqual([]);
  });

  it("leaves out bunches you are already in", async () => {
    const viewer = await member("viewer");
    await bunch("Already In", { members: [viewer.profileId] });

    expect((await scanRadar(viewer.profileId, { now: NOW })).items).toEqual([]);
  });

  it("filters by distance without dropping online things", async () => {
    const viewer = await member("viewer");
    await bunch("Far Away", { lat: 48.85, lng: 2.35, city: "Paris" });
    await db.activity.create({
      data: {
        title: "Online games night",
        description: "d",
        startsAt: new Date(NOW.getTime() + 86_400_000),
        mode: "ONLINE",
        maxParticipants: 8,
        organizerId: viewer.profileId,
      },
    });

    const result = await scanRadar(viewer.profileId, { now: NOW, withinKm: 25 });
    const titles = result.items.map((i) => i.title);

    // Paris is 300 km away; an online night has no distance to be too far.
    expect(titles).not.toContain("Far Away");
    expect(titles).toContain("Online games night");
  });

  it("says so rather than guessing when the member has no area", async () => {
    const viewer = await member("viewer");
    await db.profile.update({
      where: { id: viewer.profileId },
      data: { approxLat: null, approxLng: null },
    });
    await bunch("Somewhere");

    const result = await scanRadar(viewer.profileId, { now: NOW });
    expect(result.locationUnknown).toBe(true);
    expect(result.applied.withinKm).toBeNull();
    // Still useful — it just cannot be sorted by distance.
    expect(result.items).toHaveLength(1);
  });

  it("carries availability as counts, never names", async () => {
    const viewer = await member("viewer");
    for (let i = 0; i < MIN_CLUSTER; i++) {
      const other = await member("Person");
      await setAvailability(other.profileId, { kind: "FREE_TONIGHT" }, NOW);
    }

    const result = await scanRadar(viewer.profileId, { now: NOW });
    expect(result.clusters[0]!.count).toBe(MIN_CLUSTER);
    expect(JSON.stringify(result.clusters)).not.toContain("Person");
  });
});

describe("chemistry is precomputed", () => {
  it("returns nothing until the job has run", async () => {
    const owner = await member("owner");
    const created = await bunch("New Bunch", { members: [owner.profileId] });

    // The read path does no scoring at all, so a bunch nobody has scored yet
    // reads as absent rather than as zero.
    expect(await readChemistry(created.id)).toBeNull();
  });

  it("stores a reading the page can serve without scoring", async () => {
    const people = [];
    for (let i = 0; i < 5; i++) people.push((await member(`m${i}`)).profileId);
    const created = await bunch("Scored", { members: people });

    await recomputeChemistry(created.id, NOW);
    const stored = await readChemistry(created.id);

    expect(stored).not.toBeNull();
    expect(stored!.signals.length).toBeGreaterThan(0);
    expect(stored!.computedAt).toBeInstanceOf(Date);
  });

  it("admits when a bunch is too new to score", async () => {
    const owner = await member("owner");
    const created = await bunch("Yesterday", { members: [owner.profileId] });

    await recomputeChemistry(created.id, NOW);
    const stored = await readChemistry(created.id);

    // Behavioural signals need a week of history. A confident number derived
    // from four days of nothing is worse than an honest gap.
    expect(stored!.confidence).toBe("none");
    expect(stored!.score).toBeNull();
    expect(stored!.observations.join(" ")).toContain("Too new to tell");
  });

  it("keeps one row per bunch rather than a history", async () => {
    const people = [];
    for (let i = 0; i < 5; i++) people.push((await member(`m${i}`)).profileId);
    const created = await bunch("Rescored", { members: people });

    await recomputeChemistry(created.id, NOW);
    await recomputeChemistry(created.id, NOW);
    await recomputeChemistry(created.id, NOW);

    // A table of every reading ever taken would be a record of each group's
    // decline, which is not something this product should be able to hand out.
    expect(await db.bunchChemistry.count()).toBe(1);
  });

  it("names no member anywhere in what it stores", async () => {
    const people = [];
    for (let i = 0; i < 6; i++) people.push((await member(`Member${i}`)).profileId);
    const created = await bunch("Group", { members: people });

    // Old enough for behavioural signals, with one loud member.
    await db.bunchMembership.updateMany({
      where: { bunchId: created.id },
      data: { joinedAt: new Date(NOW.getTime() - 40 * 86_400_000) },
    });
    for (let i = 0; i < 10; i++) {
      await db.bunchMessage.create({
        data: {
          bunchId: created.id,
          authorId: people[0]!,
          kind: "TEXT",
          body: "hello",
          createdAt: new Date(NOW.getTime() - 86_400_000),
        },
      });
    }

    await recomputeChemistry(created.id, NOW);
    const stored = await readChemistry(created.id);
    const serialized = JSON.stringify(stored);

    // §7: never rank individual members, never shame the quiet ones.
    expect(serialized).not.toContain("Member0");
    expect(serialized).not.toContain(people[0]!);
  });

  it("skips bunches nobody has joined", async () => {
    // An invite-only bunch nobody has accepted yet: nothing to say, and on a
    // young platform these would be most of the work.
    await bunch("Nobody Accepted", { visibility: "PRIVATE" });

    const result = await recomputeAllChemistry(NOW);
    expect(result.scored).toBe(0);
    expect(await db.bunchChemistry.count()).toBe(0);
  });

  it("scores every bunch that has members", async () => {
    const a = await member("a");
    const b = await member("b");
    await bunch("One", { members: [a.profileId] });
    await bunch("Two", { members: [b.profileId] });

    expect((await recomputeAllChemistry(NOW)).scored).toBe(2);
    expect(await db.bunchChemistry.count()).toBe(2);
  });

  it("goes with the bunch", async () => {
    const owner = await member("owner");
    const created = await bunch("Doomed", { members: [owner.profileId] });
    await recomputeChemistry(created.id, NOW);

    await db.bunch.delete({ where: { id: created.id } });
    expect(await db.bunchChemistry.count()).toBe(0);
  });
});
