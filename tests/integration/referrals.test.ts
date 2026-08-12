import { describe, expect, it } from "vitest";
import { db } from "./db";
import { signUp } from "@/server/auth/service";
import { referralCode, referralCount } from "@/server/modules/profile/referrals";
import { awardFoundingMember } from "@/server/modules/profile/founding";

const PASSWORD = "integration-password-1234";

async function join(tag: string, referral?: string) {
  return signUp({
    email: `${tag}@integration.test`,
    password: PASSWORD,
    ...(referral ? { referralCode: referral } : {}),
  });
}

describe("referral links", () => {
  it("mints one stable code per member", async () => {
    const me = await join("coded");
    const first = await referralCode(me.profileId!);
    const again = await referralCode(me.profileId!);

    expect(first).toHaveLength(8);
    expect(again).toBe(first);
    // Confusable characters are excluded, because these get read aloud.
    expect(first).not.toMatch(/[ILOU01]/);
  });

  it("attributes a signup even when the code is retyped in lower case", async () => {
    const inviter = await join("inviter");
    const code = await referralCode(inviter.profileId!);

    const invited = await join("invited", code.toLowerCase());

    const row = await db.profile.findUnique({
      where: { id: invited.profileId! },
      select: { referredById: true },
    });
    expect(row!.referredById).toBe(inviter.profileId);
  });

  it("lets a signup through when the code is nonsense", async () => {
    // Losing attribution is a rounding error; refusing the account is not.
    const stranger = await join("stranger", "NOPENOPE");

    expect(stranger.profileId).toBeTruthy();
    const row = await db.profile.findUnique({
      where: { id: stranger.profileId! },
      select: { referredById: true },
    });
    expect(row!.referredById).toBeNull();
  });

  it("stops working once the inviter is banned", async () => {
    const inviter = await join("banned");
    const code = await referralCode(inviter.profileId!);
    await db.user.update({ where: { id: inviter.userId }, data: { status: "BANNED" } });

    const invited = await join("evader", code);

    // Otherwise a ban is routed around by inviting fresh accounts.
    const row = await db.profile.findUnique({
      where: { id: invited.profileId! },
      select: { referredById: true },
    });
    expect(row!.referredById).toBeNull();
  });

  it("counts a referral only once the invitee finishes onboarding", async () => {
    const inviter = await join("counter");
    const code = await referralCode(inviter.profileId!);
    const invited = await join("counted", code);

    expect(await referralCount(inviter.profileId!)).toBe(0);

    await db.profile.update({
      where: { id: invited.profileId! },
      data: { onboardingStage: "COMPLETE" },
    });
    expect(await referralCount(inviter.profileId!)).toBe(1);
  });

  it("does not delete the people someone invited when they leave", async () => {
    const inviter = await join("departing");
    const code = await referralCode(inviter.profileId!);
    const invited = await join("remaining", code);

    await db.user.delete({ where: { id: inviter.userId } });

    const survivor = await db.profile.findUnique({
      where: { id: invited.profileId! },
      select: { referredById: true },
    });
    expect(survivor).not.toBeNull();
    expect(survivor!.referredById).toBeNull();
  });
});

describe("founding members", () => {
  it("is awarded once, and only after onboarding completes", async () => {
    const me = await join("founder");

    expect(await awardFoundingMember(me.profileId!)).toBe(false);

    await db.profile.update({
      where: { id: me.profileId! },
      data: { onboardingStage: "COMPLETE" },
    });

    expect(await awardFoundingMember(me.profileId!)).toBe(true);
    // Idempotent: re-running onboarding cannot re-award it.
    expect(await awardFoundingMember(me.profileId!)).toBe(false);

    const row = await db.profile.findUnique({
      where: { id: me.profileId! },
      select: { foundingMember: true },
    });
    expect(row!.foundingMember).toBe(true);
  });

  it("stops awarding once the cohort is full", async () => {
    const { FOUNDING_MEMBER_LIMIT } = await import(
      "@/server/modules/profile/founding"
    );

    // Fill the cohort with bulk inserts rather than a thousand real signups —
    // the boundary is the contract, and it is worth testing for real.
    const users = Array.from({ length: FOUNDING_MEMBER_LIMIT }, (_, i) => ({
      id: `full-user-${i}`,
      email: `full${i}@integration.test`,
    }));
    await db.user.createMany({ data: users });
    await db.profile.createMany({
      data: users.map((u, i) => ({
        id: `full-profile-${i}`,
        userId: u.id,
        username: `full${i}`,
        displayName: `Full ${i}`,
        onboardingStage: "COMPLETE" as const,
        foundingMember: true,
      })),
    });

    const latecomer = await join("latecomer");
    await db.profile.update({
      where: { id: latecomer.profileId! },
      data: { onboardingStage: "COMPLETE" },
    });

    expect(await awardFoundingMember(latecomer.profileId!)).toBe(false);
    const row = await db.profile.findUnique({
      where: { id: latecomer.profileId! },
      select: { foundingMember: true },
    });
    expect(row!.foundingMember).toBe(false);
  });
});
