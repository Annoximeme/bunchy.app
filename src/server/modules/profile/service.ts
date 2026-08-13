import { db } from "@/server/db/client";
import { conflict, notFound } from "@/server/errors";
import { INTEREST_BY_SLUG, slugifyInterest } from "@/lib/interests";
import { findPlace } from "@/server/modules/geo/gazetteer";
import { snapToGrid } from "@/server/modules/geo/precision";
import { isValidTimezone, timezoneForCountry } from "@/server/modules/geo/timezone";
import { isBlockedBetween } from "@/server/modules/moderation/service";
import {
  PUBLIC_PROFILE_SELECT,
  toPublicProfile,
  type ConnectionState,
  type PublicProfile,
  type SerializeInput,
} from "@/server/modules/profile/serialize";
import type {
  AvailabilityInput,
  BasicsInput,
  GoalsInput,
  InterestSelectionInput,
  PersonalityInput,
  PrivacyInput,
} from "@/server/modules/profile/schemas";
import type { OnboardingStage } from "@/generated/prisma/enums";
import { track } from "@/server/modules/analytics/track";
import { ANALYTICS_EVENTS } from "@/server/modules/analytics/events";
import { awardFoundingMember } from "@/server/modules/profile/founding";

/**
 * Profile and onboarding.
 *
 * Onboarding is modelled as a stage machine on the profile row rather than as
 * client-side wizard state, so someone can close the tab on step three and pick
 * up exactly where they left off from any device.
 */

const STAGE_ORDER: OnboardingStage[] = [
  "BASICS",
  "INTERESTS",
  "PERSONALITY",
  "GOALS",
  "AVAILABILITY",
  "COMPLETE",
];

/** Only ever moves forward: revisiting an earlier step must not un-onboard anyone. */
function advance(
  current: OnboardingStage,
  completed: OnboardingStage,
): OnboardingStage {
  const next = STAGE_ORDER[STAGE_ORDER.indexOf(completed) + 1] ?? "COMPLETE";
  return STAGE_ORDER.indexOf(next) > STAGE_ORDER.indexOf(current) ? next : current;
}

async function currentStage(profileId: string): Promise<OnboardingStage> {
  const row = await db.profile.findUnique({
    where: { id: profileId },
    select: { onboardingStage: true },
  });
  if (!row) throw notFound("Profile not found.");
  return row.onboardingStage;
}

// --- Onboarding steps -------------------------------------------------------

export async function saveBasics(
  profileId: string,
  input: BasicsInput,
): Promise<void> {
  const taken = await db.profile.findFirst({
    where: { username: input.username, id: { not: profileId } },
    select: { id: true },
  });
  if (taken) throw conflict("That username is already taken.");

  const place = findPlace(input.cityLabel, input.countryCode);
  // Detected, then derived, then unknown.
  //
  // Still not asked for — a timezone question is one most people answer wrongly.
  // But the browser already knows, and taking its answer fixes the countries
  // where a country code cannot imply a zone: the US, Australia and Russia
  // derived to null and fell back to UTC, which quietly made "weekday evening"
  // mean 18:00 UTC for someone in California.
  //
  // The client value is checked against the runtime's own zone list before it is
  // trusted, and a rejected one falls through to the country as though it had
  // never been sent.
  const timezone =
    (input.timezone && isValidTimezone(input.timezone) ? input.timezone : null) ??
    timezoneForCountry(place?.countryCode ?? input.countryCode);
  // Coordinates are snapped before they are ever written — the database has no
  // opportunity to hold a precise location.
  const approx = place ? snapToGrid(place.lat, place.lng) : null;

  const profile = await db.profile.findUnique({
    where: { id: profileId },
    select: { userId: true, onboardingStage: true },
  });
  if (!profile) throw notFound("Profile not found.");

  await db.$transaction([
    db.profile.update({
      where: { id: profileId },
      data: {
        username: input.username,
        displayName: input.displayName,
        bio: input.bio || null,
        // Only when the step actually carried a value. The basics form does not
        // submit this field at all now that pictures are uploaded separately,
        // and an unconditional write here would delete someone's picture every
        // time they edited their display name.
        ...(input.avatarUrl === undefined
          ? {}
          : { avatarUrl: input.avatarUrl || null }),
        cityLabel: place?.cityLabel ?? input.cityLabel,
        regionLabel: place?.regionLabel ?? null,
        ...(timezone ? { timezone } : {}),
        countryCode: place?.countryCode ?? input.countryCode,
        approxLat: approx?.approxLat ?? null,
        approxLng: approx?.approxLng ?? null,
        onboardingStage: advance(profile.onboardingStage, "BASICS"),
      },
    }),
    db.user.update({
      where: { id: profile.userId },
      data: { birthYear: input.birthYear },
    }),
  ]);

  track({ name: ANALYTICS_EVENTS.ONBOARDING_BASICS, profileId });
}

export async function saveInterests(
  profileId: string,
  input: InterestSelectionInput,
): Promise<void> {
  // Resolve catalog entries and member-created ones into interest rows first,
  // so the write below is a simple replace.
  const resolved: Array<{ interestId: string; strength: number; intent: "PRACTICES" | "CURIOUS" }> = [];

  for (const item of input.interests) {
    const seed = INTEREST_BY_SLUG.get(item.slug);
    const interest = await db.interest.findUnique({
      where: { slug: item.slug },
      select: { id: true },
    });

    if (interest) {
      resolved.push({ interestId: interest.id, strength: item.strength, intent: item.intent });
    } else if (seed) {
      const created = await db.interest.create({
        data: { slug: seed.slug, label: seed.label, category: seed.category },
        select: { id: true },
      });
      resolved.push({ interestId: created.id, strength: item.strength, intent: item.intent });
    }
    // Unknown, non-catalog slugs are ignored rather than trusted as labels.
  }

  for (const custom of input.customInterests) {
    const slug = slugifyInterest(custom.label);
    if (slug.length < 2) continue;

    // A member typing "Board Games" should join the existing tag, not fork it.
    const interest = await db.interest.upsert({
      where: { slug },
      create: {
        slug,
        label: custom.label.trim(),
        category: "Member added",
        isCustom: true,
      },
      update: {},
      select: { id: true },
    });
    resolved.push({
      interestId: interest.id,
      strength: custom.strength,
      intent: custom.intent,
    });
  }

  // De-duplicate: the same interest could arrive from both lists.
  const unique = new Map(resolved.map((r) => [r.interestId, r] as const));
  const stage = await currentStage(profileId);

  await db.$transaction(async (tx) => {
    const previous = await tx.userInterest.findMany({
      where: { profileId },
      select: { interestId: true },
    });

    await tx.userInterest.deleteMany({ where: { profileId } });
    if (unique.size > 0) {
      await tx.userInterest.createMany({
        data: [...unique.values()].map((r) => ({ profileId, ...r })),
      });
    }

    // Keep the popularity counters honest — they drive interest rarity in
    // matching, so drift here quietly degrades recommendation quality.
    const removed = previous
      .map((p) => p.interestId)
      .filter((id) => !unique.has(id));
    const added = [...unique.keys()].filter(
      (id) => !previous.some((p) => p.interestId === id),
    );

    if (removed.length > 0) {
      await tx.interest.updateMany({
        where: { id: { in: removed } },
        data: { usageCount: { decrement: 1 } },
      });
    }
    if (added.length > 0) {
      await tx.interest.updateMany({
        where: { id: { in: added } },
        data: { usageCount: { increment: 1 } },
      });
    }

    await tx.profile.update({
      where: { id: profileId },
      data: { onboardingStage: advance(stage, "INTERESTS") },
    });
  });

  track({
    name: ANALYTICS_EVENTS.ONBOARDING_INTERESTS,
    profileId,
    properties: { count: unique.size },
  });
}

export async function savePersonality(
  profileId: string,
  input: PersonalityInput,
): Promise<void> {
  const stage = await currentStage(profileId);

  await db.$transaction([
    db.personalityProfile.upsert({
      where: { profileId },
      create: { profileId, ...input },
      update: input,
    }),
    db.profile.update({
      where: { id: profileId },
      data: { onboardingStage: advance(stage, "PERSONALITY") },
    }),
  ]);

  track({ name: ANALYTICS_EVENTS.ONBOARDING_PERSONALITY, profileId });
}

export async function saveGoals(
  profileId: string,
  input: GoalsInput,
): Promise<void> {
  const stage = await currentStage(profileId);

  await db.$transaction([
    db.profileSocialGoal.deleteMany({ where: { profileId } }),
    db.profileSocialGoal.createMany({
      data: input.goals.map((goal) => ({ profileId, goal })),
    }),
    db.profile.update({
      where: { id: profileId },
      data: { onboardingStage: advance(stage, "GOALS") },
    }),
  ]);

  track({
    name: ANALYTICS_EVENTS.ONBOARDING_GOALS,
    profileId,
    properties: { goals: input.goals },
  });
}

export async function saveAvailability(
  profileId: string,
  input: AvailabilityInput,
): Promise<void> {
  await db.$transaction([
    db.profileAvailability.deleteMany({ where: { profileId } }),
    db.profileAvailability.createMany({
      data: input.availability.map((window) => ({ profileId, window })),
    }),
    db.profile.update({
      where: { id: profileId },
      data: { onboardingStage: "COMPLETE", onboardedAt: new Date() },
    }),
  ]);

  // Earned by finishing, not by signing up — see `awardFoundingMember`.
  await awardFoundingMember(profileId);

  track({ name: ANALYTICS_EVENTS.ONBOARDING_COMPLETED, profileId });
}

export async function savePrivacy(
  profileId: string,
  input: PrivacyInput,
): Promise<void> {
  await db.privacySettings.upsert({
    where: { profileId },
    create: { profileId, ...input },
    update: input,
  });

  // Switching Who's Up off deletes the live status rather than merely hiding
  // it. Every read already excludes NOBODY, so this changes nothing anyone can
  // see — which is the point: "off" should mean the row is gone, not that four
  // queries agree to ignore it.
  if (input.whoCanSeeAvailability === "NOBODY") {
    await db.availabilityStatus.deleteMany({ where: { profileId } });
  }
}

// --- Reads ------------------------------------------------------------------

/** Where an unfinished member should be sent. */
export function onboardingPath(stage: OnboardingStage): string {
  switch (stage) {
    case "BASICS":
      return "/onboarding/basics";
    case "INTERESTS":
      return "/onboarding/interests";
    case "PERSONALITY":
      return "/onboarding/personality";
    case "GOALS":
      return "/onboarding/goals";
    case "AVAILABILITY":
      return "/onboarding/availability";
    default:
      return "/discover";
  }
}

export async function connectionStateBetween(
  viewerProfileId: string,
  targetProfileId: string,
): Promise<ConnectionState> {
  if (viewerProfileId === targetProfileId) return "self";

  const connection = await db.connection.findFirst({
    where: {
      OR: [
        { requesterId: viewerProfileId, addresseeId: targetProfileId },
        { requesterId: targetProfileId, addresseeId: viewerProfileId },
      ],
      status: { in: ["PENDING", "ACCEPTED"] },
    },
    select: { requesterId: true, status: true },
  });

  if (!connection) return "none";
  if (connection.status === "ACCEPTED") return "connected";
  return connection.requesterId === viewerProfileId
    ? "pending_outgoing"
    : "pending_incoming";
}

export async function getProfileByUsername(
  username: string,
  viewerProfileId: string,
): Promise<PublicProfile> {
  const row = await db.profile.findUnique({
    where: { username: username.toLowerCase() },
    select: PUBLIC_PROFILE_SELECT,
  });
  if (!row) throw notFound("We couldn't find that profile.");

  // A blocked profile is indistinguishable from one that does not exist.
  if (row.id !== viewerProfileId) {
    if (await isBlockedBetween(viewerProfileId, row.id)) {
      throw notFound("We couldn't find that profile.");
    }
  }

  return toPublicProfile(row as unknown as SerializeInput, {
    connectionState: await connectionStateBetween(viewerProfileId, row.id),
  });
}

export async function getOwnProfile(profileId: string) {
  const row = await db.profile.findUnique({
    where: { id: profileId },
    select: {
      ...PUBLIC_PROFILE_SELECT,
      onboardingStage: true,
      privacy: {
        select: {
          whoCanMessage: true,
          whoCanSendRequests: true,
          discoverable: true,
          showApproxLocation: true,
          invitableToBunches: true,
          showExactAge: true,
          aiIntroductions: true,
          whoCanSeeAvailability: true,
        },
      },
    },
  });
  if (!row) throw notFound("Profile not found.");

  const publicView = toPublicProfile(
    { ...row, privacy: row.privacy } as unknown as SerializeInput,
    { connectionState: "self" },
  );

  return {
    ...publicView,
    onboardingStage: row.onboardingStage,
    privacy: row.privacy,
    // The raw values, so the edit form can round-trip what is stored.
    rawInterests: (row as unknown as SerializeInput).interests.map((i) => ({
      slug: i.interest.slug,
      strength: i.strength,
      intent: i.intent,
    })),
  };
}
