import { describe, expect, it } from "vitest";
import { db } from "./db";
import { proposeBunchesForPool } from "@/server/modules/bunches/formation-pool";
import { createProposedBunch } from "@/server/modules/bunches/create-proposed";
import { acceptInvite } from "@/server/modules/bunches/service";
import type { StaffViewer } from "@/server/modules/admin/guard";

/**
 * Formation exercised against the real scorer and the real database, because
 * the unit tests feed it a synthetic score table, this is the only place that
 * proves the two halves fit together.
 */

async function interests() {
  const rows = await db.interest.findMany({ take: 3, select: { id: true, slug: true } });
  if (rows.length === 3) return rows;

  const created = await Promise.all(
    ["board-games", "hiking", "cooking"].map((slug, i) =>
      db.interest.create({
        data: {
          slug,
          label: slug.replace("-", " "),
          category: "General",
          status: "APPROVED",
          usageCount: 6 - i,
        },
        select: { id: true, slug: true },
      }),
    ),
  );
  return created;
}

/** Near-identical people, so the real scorer must rank them together. */
async function pool(size: number) {
  const shared = await interests();
  const ids: string[] = [];
  for (let i = 0; i < size; i++) {
    const user = await db.user.create({
      data: {
        email: `pool${i}@integration.test`,
        birthYear: 1994,
        profile: {
          create: {
            username: `pool${i}`,
            displayName: `Pool ${i}`,
            onboardingStage: "COMPLETE",
            onboardedAt: new Date(),
            cityLabel: "Antwerp",
            countryCode: "BE",
            approxLat: 51.2,
            approxLng: 4.4,
            privacy: { create: { discoverable: true } },
            interests: { create: shared.map((s) => ({ interestId: s.id, strength: 3 })) },
            goals: { create: [{ goal: "NEW_FRIENDS" }, { goal: "HOBBY_PARTNERS" }] },
            availability: {
              create: [{ window: "WEEKEND_AFTERNOON" }, { window: "WEEKDAY_EVENING" }],
            },
            personality: { create: {} },
          },
        },
      },
      select: { profile: { select: { id: true } } },
    });
    ids.push(user.profile!.id);
  }
  return { profileIds: ids, interestSlugs: shared.map((s) => s.slug) };
}

async function staff(): Promise<StaffViewer> {
  const user = await db.user.create({
    data: {
      email: "staff@integration.test",
      role: "ADMIN",
      profile: { create: { username: "staff", displayName: "Staff" } },
    },
    select: { id: true, email: true },
  });
  return { userId: user.id, email: user.email, displayName: "Staff" } as StaffViewer;
}

describe("bunch formation", () => {
  it("proposes nothing when there is nobody to form a bunch from", async () => {
    const report = await proposeBunchesForPool();
    expect(report.poolSize).toBe(0);
    expect(report.proposals).toEqual([]);
  });

  it("ignores members who are already in a bunch", async () => {
    const { profileIds } = await pool(6);
    const bunch = await db.bunch.create({
      data: { slug: "existing", name: "Existing", description: "d" },
      select: { id: true },
    });
    await db.bunchMembership.createMany({
      data: profileIds.map((profileId) => ({
        bunchId: bunch.id,
        profileId,
        status: "ACTIVE" as const,
      })),
    });

    const report = await proposeBunchesForPool();
    expect(report.poolSize).toBe(0);
  });

  it("builds a group the real scorer agrees on", async () => {
    await pool(7);

    const report = await proposeBunchesForPool();

    expect(report.poolSize).toBe(7);
    expect(report.proposals).toHaveLength(1);
    const [proposal] = report.proposals;
    expect(proposal!.members.length).toBeGreaterThanOrEqual(5);
    // The weakest pair is the number that matters, a good mean can hide one
    // person nobody in the group actually matches.
    expect(proposal!.weakestPair).toBeGreaterThanOrEqual(45);
    expect(proposal!.rationale.join(" ")).toMatch(/not in any bunch yet/);
  });

  it("invites rather than enrols, and the first to accept takes ownership", async () => {
    const { profileIds, interestSlugs } = await pool(6);
    const actor = await staff();

    const created = await createProposedBunch(actor, {
      name: "Proposed Bunch",
      description: "Created by the integration suite.",
      profileIds,
      interestSlugs,
    });

    // Nobody is a member until they say yes.
    expect(
      await db.bunchMembership.count({ where: { bunchId: created.id, status: "ACTIVE" } }),
    ).toBe(0);
    expect(
      await db.bunchMembership.count({ where: { bunchId: created.id, status: "INVITED" } }),
    ).toBe(profileIds.length);
    expect(
      await db.notification.count({ where: { type: "BUNCH_INVITE" } }),
    ).toBe(profileIds.length);
    // One click that notifies a dozen people is never invisible afterwards.
    expect(
      await db.moderationEvent.count({
        where: { action: "BUNCH_PROPOSED", targetId: created.id },
      }),
    ).toBe(1);

    await acceptInvite(created.id, profileIds[0]!);
    const first = await db.bunchMembership.findUnique({
      where: { bunchId_profileId: { bunchId: created.id, profileId: profileIds[0]! } },
      select: { status: true, role: true },
    });
    expect(first).toEqual({ status: "ACTIVE", role: "OWNER" });

    await acceptInvite(created.id, profileIds[1]!);
    const second = await db.bunchMembership.findUnique({
      where: { bunchId_profileId: { bunchId: created.id, profileId: profileIds[1]! } },
      select: { role: true },
    });
    expect(second!.role).toBe("MEMBER");
  });
});
