import { describe, expect, it } from "vitest";
import { db } from "./db";
import {
  finishOnboardingEarly,
  nextAfterGoals,
  outstandingOnboarding,
  saveAvailability,
  saveGoals,
} from "@/server/modules/profile/service";
import { ANALYTICS_EVENTS } from "@/server/modules/analytics/events";

/**
 * Leaving the last two onboarding questions for later.
 *
 * The promise made to a member who takes that offer is narrow and worth
 * pinning: they get in, nothing is invented on their behalf, the questions
 * come back until they answer them, and answering one later does not make them
 * a member who finished onboarding twice.
 */

let counter = 0;

async function member(stage: "PERSONALITY" | "GOALS" | "AVAILABILITY") {
  const unique = `skipper${counter++}`;
  const user = await db.user.create({
    data: {
      email: `${unique}@integration.test`,
      profile: {
        create: {
          username: unique,
          displayName: "Skipper",
          onboardingStage: stage,
        },
      },
    },
    include: { profile: true },
  });

  return user.profile!.id;
}

async function completions(profileId: string) {
  return db.analyticsEvent.count({
    where: { profileId, name: ANALYTICS_EVENTS.ONBOARDING_COMPLETED },
  });
}

describe("finishing onboarding early", () => {
  it("lets somebody in from the last two steps and answers nothing for them", async () => {
    const profileId = await member("GOALS");

    await finishOnboardingEarly(profileId);

    const profile = await db.profile.findUniqueOrThrow({
      where: { id: profileId },
    });
    expect(profile.onboardingStage).toBe("COMPLETE");
    expect(profile.onboardedAt).not.toBeNull();
    expect(profile.foundingMember).toBe(true);

    expect(await db.profileSocialGoal.count({ where: { profileId } })).toBe(0);
    expect(await db.profileAvailability.count({ where: { profileId } })).toBe(0);
  });

  it("refuses from a step the product cannot work without", async () => {
    const profileId = await member("PERSONALITY");

    await expect(finishOnboardingEarly(profileId)).rejects.toThrow();
    const profile = await db.profile.findUniqueOrThrow({
      where: { id: profileId },
    });
    expect(profile.onboardingStage).toBe("PERSONALITY");
  });

  it("keeps asking until the answers exist, then stops", async () => {
    const profileId = await member("GOALS");
    await finishOnboardingEarly(profileId);

    expect(await outstandingOnboarding(profileId)).toEqual([
      "goals",
      "availability",
    ]);

    await saveGoals(profileId, { goals: ["NEW_FRIENDS"] });
    expect(await outstandingOnboarding(profileId)).toEqual(["availability"]);

    await saveAvailability(profileId, { availability: ["WEEKDAY_EVENING"] });
    expect(await outstandingOnboarding(profileId)).toEqual([]);
  });

  it("does not count a late answer as a second completion", async () => {
    const profileId = await member("AVAILABILITY");
    await finishOnboardingEarly(profileId);
    const finishedAt = (
      await db.profile.findUniqueOrThrow({ where: { id: profileId } })
    ).onboardedAt;

    await saveAvailability(profileId, { availability: ["WEEKDAY_EVENING"] });

    const profile = await db.profile.findUniqueOrThrow({
      where: { id: profileId },
    });
    expect(profile.onboardedAt).toEqual(finishedAt);
    expect(await completions(profileId)).toBe(1);
  });

  it("sends a late answer back to Discover, and a new member onwards", async () => {
    const midway = await member("GOALS");
    expect(await nextAfterGoals(midway)).toBe("/onboarding/availability");

    const late = await member("GOALS");
    await finishOnboardingEarly(late);
    await saveAvailability(late, { availability: ["WEEKDAY_EVENING"] });
    expect(await nextAfterGoals(late)).toBe("/discover");

    const stillMissing = await member("GOALS");
    await finishOnboardingEarly(stillMissing);
    expect(await nextAfterGoals(stillMissing)).toBe("/onboarding/availability");
  });
});
